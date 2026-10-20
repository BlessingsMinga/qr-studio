import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "QR Studio - Scan, Create & Share QR/Barcodes",
  description: "Scan QR codes and barcodes with your camera, create custom branded QR codes, and share them instantly. History saved locally.",
  keywords: ["QR code", "barcode", "scanner", "generator", "ZXing", "QR Studio"],
  authors: [{ name: "QR Studio" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "QR Studio - Scan, Create & Share",
    description: "All-in-one QR & barcode toolkit",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
