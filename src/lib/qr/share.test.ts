import { describe, expect, test } from "bun:test";
import {
  buildShareUrl,
  decodeSharePayload,
  encodeSharePayload,
} from "./share";

describe("share payload encoding", () => {
  test("round-trips ASCII payloads", () => {
    const payload = { t: "scan", f: "QR_CODE", c: "https://example.com" };
    expect(decodeSharePayload(encodeSharePayload(payload))).toEqual(payload);
  });

  test("round-trips unicode and emoji content", () => {
    const payload = {
      t: "generated",
      f: "QR_CODE",
      c: "Hello 世界 👋 café €uro",
    };
    expect(decodeSharePayload(encodeSharePayload(payload))).toEqual(payload);
  });

  test("round-trips content with special characters", () => {
    const payload = {
      t: "scan",
      f: "WIFI",
      c: String.raw`WIFI:T:WPA;S:My\Net;P:p"ass;w:ord;,;:`,
    };
    expect(decodeSharePayload(encodeSharePayload(payload))).toEqual(payload);
  });

  test("produces a URL-safe payload (no +, / or = padding)", () => {
    const encoded = encodeSharePayload({ t: "scan", f: "QR_CODE", c: "hi" });
    expect(encoded).not.toMatch(/[+/=]/);
  });

  test("returns null for invalid payloads", () => {
    expect(decodeSharePayload("not base64url!!")).toBeNull();
    expect(decodeSharePayload("")).toBeNull();
  });

  test("returns null for valid base64 that is not the expected shape", () => {
    expect(decodeSharePayload("eyJmb28iOiJiYXIifQ")).toBeNull(); // {"foo":"bar"}
  });

  test("buildShareUrl embeds a share param and respects origin", () => {
    const url = buildShareUrl(
      { t: "scan", f: "QR_CODE", c: "hi" },
      "https://qr.example.com"
    );
    expect(url.startsWith("https://qr.example.com/?share=")).toBeTrue();
    const encoded = url.split("share=")[1];
    expect(decodeSharePayload(encoded)).toEqual({
      t: "scan",
      f: "QR_CODE",
      c: "hi",
    });
  });
});
