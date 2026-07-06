import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeLaunch Client Portal",
  description: "Private online workspace for WeLaunch and its clients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
