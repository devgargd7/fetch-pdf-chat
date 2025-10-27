// This file goes in /app/api/upload/route.ts
// This is the main endpoint your frontend will call.

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// This function processes the PDF by forwarding it to our Python function.
// We get back the structured data (chunks) and save it to our Postgres DB.
export async function POST(request: NextRequest) {
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
    pythonResponse = await fetch(pythonApiUrl, {
      method: "POST",
      body: pythonFormData,
    });

    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.json();
      console.error("Error from Python function:", errorData);
      return NextResponse.json(
        { error: "Failed to process PDF", details: errorData.error },
        { status: 500 }
      );
    }

    const data = await pythonResponse.json();
    const { filename, chunks } = data;

    // For now, return the processed data without database storage
    // TODO: Set up PostgreSQL database for persistent storage
    console.log("PDF processed successfully:", {
      filename,
      chunksCount: chunks.length,
      sampleChunk: chunks[0], // Log first chunk as example
    });
    try {
      // First create the document
      const document = await prisma.document.create({
        data: {
          filename: filename,
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
      return NextResponse.json(
        { error: "Failed to save document to database" },
        { status: 500 }
      );
    }
  } catch (fetchError) {
    console.error("Fetch error calling Python function:", fetchError);
    return NextResponse.json(
      {
        error: "Could not connect to processing service. Is it running?",
        details: (fetchError as Error).message,
      },
      { status: 500 }
    );
  }
}
