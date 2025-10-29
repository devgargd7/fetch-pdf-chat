import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        fileData: true,
        filename: true,
      },
    });

    if (!document || !document.fileData) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Return PDF binary
    return new NextResponse(document.fileData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${document.filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to fetch PDF:", error);
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }
}
