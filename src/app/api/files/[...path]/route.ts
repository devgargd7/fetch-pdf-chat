import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params in Next.js 15
    const params = await context.params;
    const filePath = params.path.join("/");

    console.log("Requested file path:", filePath);
    console.log("User ID:", user.id);

    // Security: Ensure the path starts with uploads/{userId} to prevent directory traversal
    if (!filePath.startsWith(`uploads/${user.id}/`)) {
      console.error("Forbidden access attempt:", filePath);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Read the file from the uploads directory
    const fullPath = path.join(process.cwd(), filePath);
    console.log("Reading file from:", fullPath);

    const fileBuffer = await readFile(fullPath);

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (error) {
    console.error("File serving error:", error);
    return NextResponse.json(
      {
        error: "File not found",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 404 }
    );
  }
}
