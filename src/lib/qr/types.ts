export type HistoryType = "scan" | "generated";

export interface HistoryItem {
  id: string;
  type: HistoryType;
  format: string;
  content: string;
  rawValue: string | null;
  note: string | null;
  options: string | null;
  imageData: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- QR Generator content builders ----

export type ContentType =
  | "text"
  | "url"
  | "email"
  | "phone"
  | "sms"
  | "wifi"
  | "vcard";

export interface GeneratorOptions {
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  margin: number;
  width: number;
  dark: string;
  light: string;
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  errorCorrectionLevel: "M",
  margin: 2,
  width: 320,
  dark: "#0f172a",
  light: "#ffffff",
};

export function escapeWifi(s: string): string {
  // Escape special characters for WiFi config: \ ; , : "
  return s.replace(/([\\;,":])/g, "\\$1");
}

export function buildContent(
  type: ContentType,
  data: Record<string, string>
): string {
  switch (type) {
    case "text":
      return data.text || "";
    case "url":
      return data.url || "";
    case "email": {
      const email = data.email || "";
      const subject = data.subject || "";
      const body = data.body || "";
      if (!subject && !body) return `mailto:${email}`;
      const params: string[] = [];
      if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      return `mailto:${email}?${params.join("&")}`;
    }
    case "phone":
      return `tel:${data.phone || ""}`;
    case "sms":
      return `sms:${data.phone || ""}${data.message ? `?body=${encodeURIComponent(data.message)}` : ""}`;
    case "wifi": {
      const ssid = escapeWifi(data.ssid || "");
      const password = escapeWifi(data.password || "");
      const encryption = data.encryption || "WPA";
      const hidden = data.hidden === "true" ? "true" : "false";
      return `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden};;`;
    }
    case "vcard": {
      const name = data.name || "";
      const phone = data.phone || "";
      const email = data.email || "";
      const org = data.org || "";
      const url = data.url || "";
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${name}`,
        `FN:${name}`,
        phone ? `TEL:${phone}` : "",
        email ? `EMAIL:${email}` : "",
        org ? `ORG:${org}` : "",
        url ? `URL:${url}` : "",
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    }
    default:
      return "";
  }
}

// Classify scanned raw text into a friendly category for display
export function classifyContent(text: string): {
  category: string;
  label: string;
  href?: string;
} {
  if (!text) return { category: "text", label: "Text" };
  if (/^https?:\/\//i.test(text)) return { category: "url", label: "URL", href: text };
  if (/^mailto:/i.test(text)) return { category: "email", label: "Email", href: text };
  if (/^tel:/i.test(text)) return { category: "phone", label: "Phone", href: text };
  if (/^sms:/i.test(text)) return { category: "sms", label: "SMS", href: text };
  if (/^WIFI:/i.test(text)) return { category: "wifi", label: "WiFi" };
  if (/^BEGIN:VCARD/i.test(text)) return { category: "vcard", label: "Contact" };
  if (/^geo:/i.test(text)) return { category: "geo", label: "Location", href: text };
  return { category: "text", label: "Text" };
}
