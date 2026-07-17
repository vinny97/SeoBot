import type { Metadata } from "next";
import "./globals.css";
import { productConfig } from "@/lib/config/product";
import { DemoProvider } from "@/components/demo-provider";

export const metadata: Metadata = productConfig.metadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><DemoProvider>{children}</DemoProvider></body></html>;
}
