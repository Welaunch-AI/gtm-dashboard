import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import NavigationProgress from "@/components/NavigationProgress";
import AppProviders from "@/components/ui/AppProviders";

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
        <AppProviders>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
