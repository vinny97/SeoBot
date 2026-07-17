import type { Metadata } from "next";
import "./globals.css";
import { productConfig } from "@/lib/config/product";

export const metadata: Metadata = productConfig.metadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
