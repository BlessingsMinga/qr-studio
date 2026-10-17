import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// POST /api/generate
// Server-side endpoint that generates a QR code data URL from given content
// and (optionally) persists it to history. Used mainly as a server-side fallback.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      content,
      save = true,
      format = "QR_CODE",
      note,
      options,
    } = body || {};

    if (!content || typeof content !== "string") {
      return Response.json(
        { error: "Missing content" },
        { status: 400 }
      );
    }

    // Dynamic import to keep it on the server
    const QRCode = (await import("qrcode")).default;

    const opts = options || {};
    const dataUrl = await QRCode.toDataURL(content, {
      errorCorrectionLevel: (opts.errorCorrectionLevel as "L" | "M" | "Q" | "H") || "M",
      margin: typeof opts.margin === "number" ? opts.margin : 2,
      width: typeof opts.width === "number" ? opts.width : 320,
      color: {
        dark: opts.dark || "#000000",
        light: opts.light || "#ffffff",
      },
    });

    let item = null;
    if (save) {
      item = await db.scanHistory.create({
        data: {
          type: "generated",
          format,
          content,
          note: note ?? null,
          options: opts ? JSON.stringify(opts) : null,
          imageData: dataUrl,
        },
      });
    }

    return Response.json({ dataUrl, item });
  } catch (error) {
    console.error("POST /api/generate error:", error);
    return Response.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
