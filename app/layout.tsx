import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoveMatch - 恋愛・婚活マッチングアプリ",
  description: "素敵な出会いを見つけよう",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-50">{children}</body>
    </html>
  );
}
