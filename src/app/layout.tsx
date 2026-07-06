import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import NavigationProgress from "@/components/NavigationProgress";

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
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
