import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/scans/[id] - get a single scan by id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await db.scanHistory.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    console.error("GET /api/scans/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PATCH /api/scans/[id] - update (e.g. toggle favorite, add note)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { note, isFavorite } = body;

    const data: Record<string, unknown> = {};
    if (typeof note === "string") data.note = note;
    if (typeof isFavorite === "boolean") data.isFavorite = isFavorite;

    const item = await db.scanHistory.update({
      where: { id },
      data,
    });
    return NextResponse.json({ item });
  } catch (error) {
    console.error("PATCH /api/scans/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/scans/[id] - delete a single scan
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.scanHistory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/scans/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
