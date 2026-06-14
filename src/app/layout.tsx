import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Platform",
  description: "Внутрішня платформа продажів та онбордингу",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
