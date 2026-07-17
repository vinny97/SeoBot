import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getUserAppDestination } from "@/lib/auth/server";
import { isDemoMode } from "@/lib/config/env";
export const dynamic="force-dynamic";
export default async function LoginPage(){if(!isDemoMode()){const destination=await getUserAppDestination();if(destination)redirect(destination)}return <Suspense><AuthForm mode="login"/></Suspense>}
