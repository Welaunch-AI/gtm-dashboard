"use client";

import { ConfirmProvider } from "./ConfirmProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
