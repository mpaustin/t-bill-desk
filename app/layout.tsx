import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T-Bill Desk",
  description: "A simple Treasury yield curve and order desk.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
