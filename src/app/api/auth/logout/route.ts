import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { getSessionToken, deleteSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken();

    if (token) {
      // Delete session from database
      await deleteSession(token);
    }

    // Delete session cookie
    await deleteSessionCookie();

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
