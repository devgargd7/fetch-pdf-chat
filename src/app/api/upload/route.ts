// This file goes in /app/api/upload/route.ts
// This is the main endpoint your frontend will call.

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// This function processes the PDF by forwarding it to our Python function.
// We get back the structured data (chunks) and save it to our Postgres DB.
export async function POST(request: NextRequest) {
  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // We need to re-create the FormData to send to the Python function
  const pythonFormData = new FormData();
  pythonFormData.append("file", file, file.name);

  // Get the URL for the Python function.
  // On Vercel, we can use the internal URL.
  // Locally, it will be running on a different port.
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  // For local development, use port 8000 for Python server
  // For production, use the Vercel internal URL
  const pythonApiUrl =
    process.env.NODE_ENV === "production"
      ? `${protocol}://${host}/api/process-pdf`
      : "http://localhost:8000/api/process-pdf";

  let pythonResponse;

  try {
    // Call the Python PDF processing function
    console.log("Calling Python function at:", pythonApiUrl);

    // In production, use internal Vercel network (bypasses auth)
    const fetchUrl =
      process.env.NODE_ENV === "production"
        ? `https://${process.env.VERCEL_URL || host}/api/process-pdf`
        : pythonApiUrl;

    console.log("Fetch URL:", fetchUrl);

    pythonResponse = await fetch(fetchUrl, {
      method: "POST",
      body: pythonFormData,
      headers: {
        // Forward auth headers if present
        ...(request.headers.get("cookie")
          ? { cookie: request.headers.get("cookie") || "" }
          : {}),
        // Add Vercel protection bypass header for internal API calls
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
          ? {
              "x-vercel-protection-bypass":
                process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
            }
          : {}),
      },
    });

    console.log("Python function response status:", pythonResponse.status);
    console.log(
      "Python function response headers:",
      Object.fromEntries(pythonResponse.headers.entries())
    );

    if (!pythonResponse.ok) {
      // Try to get error as text first in case it's HTML
      const errorText = await pythonResponse.text();
      console.error(
        "Error from Python function (status:",
        pythonResponse.status,
        "):",
        errorText
      );

      let errorMessage = "Failed to process PDF";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Not JSON, use the text
        errorMessage = errorText.substring(0, 200);
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const responseText = await pythonResponse.text();
    console.log(
      "Python function response (first 500 chars):",
      responseText.substring(0, 500)
    );

    const data = JSON.parse(responseText);
    const { filename, chunks } = data;

    try {
      // Save PDF binary to database
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create the document with PDF binary stored in database
      const document = await prisma.document.create({
        data: {
          filename: filename || file.name,
          userId: user.id,
          fileData: buffer, // Store PDF as binary in database
        },
      });

      // Then create chunks with raw SQL to handle vector embedding
      for (const chunk of chunks) {
        if (chunk.embedding) {
          await prisma.$executeRaw`
            INSERT INTO "Chunk" (id, "pageNumber", "textContent", "bboxList", "documentId", "createdAt", embedding)
            VALUES (${chunk.id || crypto.randomUUID()}, ${chunk.pageNumber}, ${
            chunk.textContent
          }, ${JSON.stringify(chunk.bboxList)}::jsonb, ${
            document.id
          }, ${new Date()}, ${`[${chunk.embedding.join(",")}]`}::vector)
          `;
        } else {
          await prisma.chunk.create({
            data: {
              pageNumber: chunk.pageNumber,
              textContent: chunk.textContent,
              bboxList: chunk.bboxList,
              documentId: document.id,
            },
          });
        }
      }

      // Fetch the complete document with chunks
      const completeDocument = await prisma.document.findUnique({
        where: { id: document.id },
        include: { chunks: true },
      });

      return NextResponse.json(completeDocument, { status: 201 });
    } catch (dbError) {
      console.error("Database error:", dbError);
      console.error("Database error stack:", (dbError as Error).stack);
      return NextResponse.json(
        {
          error: "Failed to save document to database",
          details: (dbError as Error).message,
        },
        { status: 500 }
      );
    }
  } catch (fetchError) {
    console.error("Fetch error calling Python function:", fetchError);
    console.error("Error stack:", (fetchError as Error).stack);
    return NextResponse.json(
      {
        error: "Could not connect to processing service",
        details: (fetchError as Error).message,
        url: pythonApiUrl,
      },
      { status: 500 }
    );
  }
}
