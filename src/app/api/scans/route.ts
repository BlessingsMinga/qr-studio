import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/scans - list all scan history items
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "scan" | "generated" | undefined (all)
    const q = searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (type === "scan" || type === "generated") {
      where.type = type;
    }
    if (q && q.trim()) {
      where.OR = [
        { content: { contains: q } },
        { note: { contains: q } },
        { format: { contains: q } },
      ];
    }

    const items = await db.scanHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/scans error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

// POST /api/scans - create a new scan history entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, format, content, rawValue, note, options, imageData, isFavorite } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: "Missing required fields: type and content" },
        { status: 400 }
      );
    }

    const item = await db.scanHistory.create({
      data: {
        type,
        format: format || "UNKNOWN",
        content,
        rawValue: rawValue ?? null,
        note: note ?? null,
        options: options ?? null,
        imageData: imageData ?? null,
        isFavorite: Boolean(isFavorite),
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/scans error:", error);
    return NextResponse.json(
      { error: "Failed to save scan" },
      { status: 500 }
    );
  }
}

// DELETE /api/scans - delete all history (or by type)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (type === "scan" || type === "generated") {
      where.type = type;
    }

    await db.scanHistory.deleteMany({ where });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/scans error:", error);
    return NextResponse.json(
      { error: "Failed to clear history" },
      { status: 500 }
    );
  }
}
