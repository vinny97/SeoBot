"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { AuthUtilityShell } from "@/components/auth-utility-shell";
import { createClient } from "@/lib/supabase/client";
import { getAppUrl, isDemoMode } from "@/lib/config/env";

export default function ForgotPasswordPage(){
  const [email,setEmail]=useState(""); const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(event:React.FormEvent){event.preventDefault();setError("");if(!z.string().email().safeParse(email).success){setError("Enter a valid email address.");return}if(isDemoMode()){setSent(true);return}const supabase=createClient();if(!supabase){setError("Password recovery is not configured yet.");return}setBusy(true);await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${getAppUrl()}/auth/callback?next=/update-password`});setBusy(false);setSent(true)}
  return <AuthUtilityShell eyebrow="ACCOUNT RECOVERY" title={sent?"Check your inbox":"Reset your password"} copy={sent?"If this account can receive recovery email, a secure link is on its way.":"Enter your account email and we’ll send a secure recovery link."}>{sent?<div role="status" className="rounded-2xl border border-[#c1d3ca] bg-[#eaf5ef] p-6 text-center"><CheckCircle2 className="mx-auto text-[var(--flight-green)]" size={42}/><p className="mt-4 text-sm leading-6 text-[var(--flight-muted)]">The message is intentionally generic so account status remains private.</p><Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={16}/>Return to login</Link></div>:<><form onSubmit={submit} className="space-y-4"><Input label="Email address" type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} error={error} required/><Button size="lg" className="min-h-12 w-full" loading={busy}>Send recovery link</Button></form><Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--flight-muted)]"><ArrowLeft size={16}/>Back to login</Link></>}</AuthUtilityShell>;
}
