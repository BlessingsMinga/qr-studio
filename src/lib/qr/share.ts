// Pure helpers for building/decoding shareable links (?share=...).
// Kept framework-free so they can be unit-tested without a browser.

export interface SharePayload {
  t: string; // history item type: "scan" | "generated"
  f: string; // format, e.g. "QR_CODE"
  c: string; // content
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa + URL-safe alphabet (no padding). No escape/unescape needed.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeSharePayload(payload: SharePayload): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const json = new TextDecoder().decode(decodeBase64Url(encoded));
    const parsed = JSON.parse(json) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as SharePayload).t === "string" &&
      typeof (parsed as SharePayload).f === "string" &&
      typeof (parsed as SharePayload).c === "string"
    ) {
      return parsed as SharePayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(
  payload: SharePayload,
  origin?: string
): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/?share=${encodeSharePayload(payload)}`;
}
