import type { Metadata } from "next";
import "./globals.css";
import { productConfig } from "@/lib/config/product";
import { DemoProvider } from "@/components/demo-provider";
import { isDemoMode } from "@/lib/config/env";

export const metadata: Metadata = productConfig.metadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><DemoProvider demoMode={isDemoMode()}>{children}</DemoProvider></body></html>;
}
