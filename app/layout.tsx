import type { Metadata } from "next";
import "./globals.css";
import { productConfig } from "@/lib/config/product";
import { ProjectProvider } from "@/components/project-provider";

export const metadata: Metadata = productConfig.metadata;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ProjectProvider>{children}</ProjectProvider></body></html>;
}
