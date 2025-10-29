import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filePath = context.params.path.join("/");

    // Security: Ensure the path starts with uploads/{userId} to prevent directory traversal
    if (!filePath.startsWith(`uploads/${user.id}/`)) {
      console.error("Forbidden access attempt:", filePath);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Read the file from the uploads directory
    const fullPath = path.join(process.cwd(), filePath);

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
