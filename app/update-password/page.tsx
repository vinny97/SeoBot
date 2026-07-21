"use client";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { AuthUtilityShell } from "@/components/auth-utility-shell";
import { createClient } from "@/lib/supabase/client";

const schema=z.string().min(8,"Use at least 8 characters.").regex(/[A-Z]/,"Add one uppercase letter.").regex(/[0-9]/,"Add one number.");
export default function UpdatePasswordPage(){
  const [valid,setValid]=useState<boolean|null>(null); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  useEffect(()=>{let active=true;void Promise.resolve().then(async()=>{const client=createClient();if(!client){if(active)setValid(false);return}const {data}=await client.auth.getUser();if(active)setValid(Boolean(data.user))});return()=>{active=false}},[]);
  async function submit(event:React.FormEvent){event.preventDefault();const parsed=schema.safeParse(password);if(!parsed.success){setError(parsed.error.issues[0].message);return}if(password!==confirm){setError("Passwords do not match.");return}const client=createClient();if(!client){setError("Password recovery is not configured.");return}setBusy(true);const {error:updateError}=await client.auth.updateUser({password});setBusy(false);if(updateError){setError("This recovery session is invalid or expired. Request a new link.");return}setDone(true)}
  if(valid===null)return <main className="grid min-h-screen place-items-center bg-[var(--flight-bg)]"><p aria-live="polite">Checking recovery session…</p></main>;
  return <AuthUtilityShell eyebrow="SECURE ACCESS" title={done?"Password updated":"Choose a new password"} copy={done?"Your Flight Deck is ready when you are.":valid?"Use at least 8 characters, one uppercase letter and one number.":"This recovery session is missing or expired. Request a new recovery link."}>{done?<div className="rounded-2xl border border-[#c1d3ca] bg-[#eaf5ef] p-6 text-center"><CheckCircle2 className="mx-auto text-[var(--flight-green)]" size={42}/><a href="/app" className="focus-ring mt-6 inline-flex min-h-12 items-center rounded-xl bg-[var(--flight-orange)] px-5 font-semibold text-white">Open Flight Deck</a></div>:valid?<form onSubmit={submit} className="space-y-4"><Input label="New password" type="password" autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)} required/><Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={event=>setConfirm(event.target.value)} error={error} required/><Button className="min-h-12 w-full" size="lg" loading={busy}>Update password</Button></form>:<a href="/forgot-password" className="inline-flex min-h-12 items-center rounded-xl bg-[var(--flight-orange)] px-5 font-semibold text-white">Request a new link</a>}</AuthUtilityShell>;
}
