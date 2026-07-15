import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(date?: string) {
  if (!date) return "Not yet";
  const elapsed = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.floor(elapsed / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function normaliseWebsiteUrl(input: string) {
  const withProtocol = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  const url = new URL(withProtocol);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const blocked = hostname === "localhost" || hostname.endsWith(".local") || hostname === "0.0.0.0" || /^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (blocked || !hostname.includes(".")) throw new Error("Please enter a public website address.");
  url.protocol = "https:";
  url.pathname = url.pathname === "/" ? "" : url.pathname;
  url.search = "";
  url.hash = "";
  return { url: url.toString().replace(/\/$/, ""), domain: hostname };
}
