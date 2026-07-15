import type { WebsiteMetadata } from "@/lib/types";
export function websiteAnalysisFallback(current:WebsiteMetadata,error:unknown):WebsiteMetadata{return {...current,status:"failed",source:"manual",error:error instanceof Error?error.message:"We couldn’t read the website. Continue by confirming the business details manually."}}
