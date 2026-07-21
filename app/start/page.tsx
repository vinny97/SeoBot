import { redirect } from "next/navigation";

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string }>;
}) {
  const { website } = await searchParams;
  redirect(website ? `/onboarding?website=${encodeURIComponent(website)}` : "/onboarding");
}
