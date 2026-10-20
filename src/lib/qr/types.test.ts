import { describe, expect, test } from "bun:test";
import {
  buildContent,
  classifyContent,
  escapeVCard,
  escapeWifi,
  splitVCardName,
} from "./types";

describe("escapeWifi", () => {
  test("escapes reserved characters", () => {
    expect(escapeWifi(String.raw`a\b;c,d:e"f`)).toBe(
      String.raw`a\\b\;c\,d\:e\"f`
    );
  });
  test("leaves plain input untouched", () => {
    expect(escapeWifi("MyWiFi")).toBe("MyWiFi");
  });
});

describe("buildContent", () => {
  test("text", () => {
    expect(buildContent("text", { text: "hello" })).toBe("hello");
  });
  test("url", () => {
    expect(buildContent("url", { url: "https://x.dev" })).toBe("https://x.dev");
  });
  test("email without extras", () => {
    expect(buildContent("email", { email: "a@b.c" })).toBe("mailto:a@b.c");
  });
  test("email with subject and body", () => {
    const out = buildContent("email", {
      email: "a@b.c",
      subject: "Hi there",
      body: "Hello world",
    });
    expect(out).toBe("mailto:a@b.c?subject=Hi%20there&body=Hello%20world");
  });
  test("phone", () => {
    expect(buildContent("phone", { phone: "+15551234567" })).toBe(
      "tel:+15551234567"
    );
  });
  test("sms with message", () => {
    expect(
      buildContent("sms", { phone: "+15551234567", message: "Hi" })
    ).toBe("sms:+15551234567?body=Hi");
  });
  test("wifi escapes password", () => {
    expect(
      buildContent("wifi", {
        ssid: "MyNet",
        password: "p;ass",
        encryption: "WPA",
      })
    ).toBe("WIFI:T:WPA;S:MyNet;P:p\\;ass;H:false;;");
  });
});

describe("vCard builder", () => {
  test("emits a well-formed vCard with a structured N field", () => {
    const out = buildContent("vcard", {
      name: "Jane Doe",
      phone: "+1555",
      email: "j@d.com",
      org: "Acme",
    });
    expect(out).toContain("BEGIN:VCARD");
    expect(out).toContain("VERSION:3.0");
    expect(out).toContain("N:Doe;Jane;;;");
    expect(out).toContain("FN:Jane Doe");
    expect(out).toContain("TEL:+1555");
    expect(out).toContain("EMAIL:j@d.com");
    expect(out).toContain("ORG:Acme");
    expect(out).toContain("END:VCARD");
  });
  test("escapes reserved characters in name and org (RFC 6350)", () => {
    const out = buildContent("vcard", { name: "Doe, John", org: "ACME; Inc" });
    expect(out).toContain("N:Doe;John;;;");
    expect(out).toContain("FN:Doe\\, John");
    expect(out).toContain("ORG:ACME\\; Inc");
  });
});

describe("escapeVCard", () => {
  test("escapes backslash, semicolon, comma and newline", () => {
    expect(escapeVCard(String.raw`a;b,c\d` + "\n" + "e")).toBe(
      String.raw`a\;b\,c\\d\n` + "e"
    );
  });
});

describe("splitVCardName", () => {
  test("comma style", () => {
    expect(splitVCardName("Doe, John")).toEqual({
      last: "Doe",
      first: "John",
      middle: "",
    });
  });
  test("space style with middle name", () => {
    expect(splitVCardName("John Quincy Doe")).toEqual({
      last: "Doe",
      first: "John",
      middle: "Quincy",
    });
  });
  test("single word", () => {
    expect(splitVCardName("Prince")).toEqual({
      last: "",
      first: "Prince",
      middle: "",
    });
  });
  test("empty", () => {
    expect(splitVCardName("   ")).toEqual({
      last: "",
      first: "",
      middle: "",
    });
  });
});

describe("classifyContent", () => {
  test("empty", () => {
    expect(classifyContent("")).toEqual({ category: "text", label: "Text" });
  });
  test("url", () => {
    expect(classifyContent("https://example.com").category).toBe("url");
  });
  test("mailto", () => {
    expect(classifyContent("mailto:a@b.c").category).toBe("email");
  });
  test("MATMSG email", () => {
    expect(classifyContent("MATMSG:TO:a@b.c;").category).toBe("email");
  });
  test("MEBKM bookmark", () => {
    expect(classifyContent("MEBKM:URL:https://x.dev;").category).toBe(
      "bookmark"
    );
  });
  test("tel", () => {
    expect(classifyContent("tel:+1555").category).toBe("phone");
  });
  test("sms", () => {
    expect(classifyContent("sms:+1555").category).toBe("sms");
  });
  test("wifi", () => {
    expect(classifyContent("WIFI:T:WPA;S:x;;").category).toBe("wifi");
  });
  test("vcard", () => {
    expect(classifyContent("BEGIN:VCARD\nN:Doe;Jane;;;").category).toBe(
      "vcard"
    );
  });
  test("geo", () => {
    expect(classifyContent("geo:48.85,2.35").category).toBe("geo");
  });
  test("bitcoin", () => {
    expect(
      classifyContent("bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa").category
    ).toBe("crypto");
  });
  test("plain text", () => {
    expect(classifyContent("just some text").category).toBe("text");
  });
});
