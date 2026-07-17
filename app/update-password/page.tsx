"use client";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const schema=z.string().min(8,"Use at least 8 characters.").regex(/[A-Z]/,"Add one uppercase letter.").regex(/[0-9]/,"Add one number.");
export default function UpdatePasswordPage(){
  const [valid,setValid]=useState<boolean|null>(null);const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);
  useEffect(()=>{let active=true;void Promise.resolve().then(async()=>{const client=createClient();if(!client){if(active)setValid(false);return}const {data}=await client.auth.getUser();if(active)setValid(Boolean(data.user))});return()=>{active=false}},[]);
  async function submit(event:React.FormEvent){event.preventDefault();const parsed=schema.safeParse(password);if(!parsed.success){setError(parsed.error.issues[0].message);return}if(password!==confirm){setError("Passwords do not match.");return}const client=createClient();if(!client){setError("Password recovery is not configured.");return}setBusy(true);const {error:updateError}=await client.auth.updateUser({password});setBusy(false);if(updateError){setError("This recovery session is invalid or expired. Request a new link.");return}setDone(true)}
  if(valid===null)return <main className="grid min-h-screen place-items-center"><p aria-live="polite">Checking recovery session…</p></main>;
  return <main className="grid min-h-screen place-items-center px-5"><div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-7">{done?<div className="text-center"><CheckCircle2 className="mx-auto text-[var(--success)]" size={42}/><h1 className="mt-4 text-2xl font-semibold">Password updated</h1><p className="mt-2 text-[var(--muted)]">Your new password is ready. You can continue to the application.</p><a href="/app" className="focus-ring mt-6 inline-flex rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-white">Continue</a></div>:<><h1 className="text-2xl font-semibold">Choose a new password</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{valid?"Use at least 8 characters, one uppercase letter and one number.":"This recovery session is missing or expired. Request a new recovery link."}</p>{valid&&<form onSubmit={submit} className="mt-6 space-y-4"><Input label="New password" type="password" autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)} required/><Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={event=>setConfirm(event.target.value)} error={error} required/><Button className="w-full" size="lg" loading={busy}>Update password</Button></form>}</>}</div></main>
}
