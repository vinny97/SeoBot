"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Info, Radar, Route, ShieldCheck, Target } from "lucide-react";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { FlightBrand, StatusBeacon } from "@/components/flight/flight-deck";
import { createClient } from "@/lib/supabase/client";
import { getAppUrl, isDemoMode } from "@/lib/config/env";
import { safeRelativePath } from "@/lib/auth/redirects";

const emailSchema = z.string().email("Enter a valid email address.");
const passwordSchema = z.string().min(8, "Use at least 8 characters.").regex(/[A-Z]/, "Add one uppercase letter.").regex(/[0-9]/, "Add one number.");

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const demo = isDemoMode();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const requestedNext = search.get("next");
  const signupNext = safeRelativePath(requestedNext, "/onboarding");
  const loginNext = safeRelativePath(requestedNext, "/app");
  const signupHref = requestedNext ? `/signup?next=${encodeURIComponent(requestedNext)}` : "/signup";
  const loginHref = requestedNext ? `/login?next=${encodeURIComponent(requestedNext)}` : "/login";

  function validate() {
    const email = emailSchema.safeParse(form.email);
    if (!email.success) return email.error.issues[0].message;
    const password = passwordSchema.safeParse(form.password);
    if (!password.success) return password.error.issues[0].message;
    if (mode === "signup" && form.password !== form.confirmPassword) return "Passwords do not match.";
    if (mode === "signup" && form.name.trim().length < 2) return "Enter your name.";
    return "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const validation = validate();
    if (validation) { setError(validation); return; }
    if (demo) {
      setMessage("Demo mode is active. Authentication is bypassed for visual testing.");
      window.setTimeout(() => router.push(mode === "signup" ? signupNext : loginNext), 500);
      return;
    }
    const supabase = createClient();
    if (!supabase) { setError("Authentication is not configured yet."); return; }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (authError) throw authError;
        router.push(loginNext); router.refresh();
      } else {
        const { data, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name.trim() }, emailRedirectTo: `${getAppUrl()}/auth/confirm?next=${encodeURIComponent(signupNext)}` } });
        if (authError) throw authError;
        if (data.session) { router.push(signupNext); router.refresh(); }
        else setMessage("Check your email to confirm your account, then return to continue setup.");
      }
    } catch (caught) {
      setError(caught instanceof Error && /invalid login credentials/i.test(caught.message) ? "Email or password is incorrect." : "Authentication could not be completed. Please try again.");
    } finally { setBusy(false); }
  }

  async function google() {
    setError("");
    if (demo) { setMessage("Google sign-in is bypassed while explicit demo mode is active."); return; }
    const supabase = createClient();
    if (!supabase) { setError("Authentication is not configured yet."); return; }
    setBusy(true);
    const next = mode === "signup" ? signupNext : loginNext;
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (authError) { setError("Google sign-in is unavailable. Confirm that the provider is enabled in Supabase."); setBusy(false); }
  }

  return <main className="grid min-h-screen bg-[var(--flight-bg)] lg:grid-cols-[.95fr_1.05fr]">
    <aside className="relative hidden overflow-hidden bg-[var(--flight-night)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div aria-hidden="true" className="flight-grid-night absolute inset-0 opacity-70" />
      <div aria-hidden="true" className="absolute -left-32 bottom-[-15%] h-[520px] w-[520px] rounded-full border-[100px] border-[#7563ff]/10" />
      <div className="relative"><Link href="/" className="focus-ring inline-flex rounded-full"><FlightBrand inverse /></Link></div>
      <div className="relative max-w-xl py-16">
        <p className="font-mono text-[10px] font-bold tracking-[.18em] text-[#a99fff]">SET UP YOUR FLIGHT DECK</p>
        <h1 className="mt-6 text-5xl font-semibold leading-[.98] tracking-[-.06em] xl:text-6xl">Set the destination.<br/><span className="text-white/35">Your first route starts here.</span></h1>
        <div className="mt-10 space-y-3">{[[Target, "Choose what growth should achieve"], [Radar, "Inspect your public website"], [Route, "Build the first prioritised route"], [ShieldCheck, "Keep control of every change"]].map(([Icon, label], index) => <div key={label as string} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/8 text-[#a99fff]"><Icon size={17} /></span><span className="text-sm font-medium text-white/70">{label as string}</span>{index < 3 ? <Check size={15} className="ml-auto text-[#65c99e]" /> : <span className="ml-auto"><StatusBeacon label="YOU DECIDE" /></span>}</div>)}</div>
      </div>
      <p className="relative font-mono text-[9px] tracking-[.14em] text-white/25">SEARCHHAND · AUTONOMOUS SEO AGENT</p>
    </aside>

    <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:py-14"><div className="w-full max-w-[470px]">
      <Link href="/" className="focus-ring mb-10 inline-flex rounded-full lg:hidden"><FlightBrand /></Link>
      <p className="font-mono text-[10px] font-bold tracking-[.17em] text-[var(--flight-blue)]">{mode === "login" ? "RETURN TO FLIGHT DECK" : "PRE-FLIGHT · ACCOUNT"}</p>
      <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em]">{mode === "login" ? "Welcome back" : "Create your Searchhand account"}</h2>
      <p className="mt-3 leading-7 text-[var(--flight-muted)]">{mode === "login" ? "Continue the routes and reviews already underway." : "Create an account, then confirm your destination and inspect your website."}</p>
      {demo && <div className="mt-5 flex gap-2 rounded-xl border border-[#e6d6b7] bg-[#fcf2df] p-3 text-sm text-[#765020]"><Info size={18} className="shrink-0" /><span><strong>Demo mode:</strong> no real account is created.</span></div>}
      {search.get("configuration") === "missing" && <div role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} />Supabase environment variables are missing.</div>}
      {message && <div role="status" className="mt-5 flex gap-2 rounded-xl border border-[#c8d8e6] bg-[#edf4fa] p-3 text-sm text-[#3e5a72]"><Info size={18} className="shrink-0" />{message}</div>}
      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "signup" && <Input label="Full name" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />}
        <Input label="Email address" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        <Input label="Password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} hint={mode === "signup" ? "At least 8 characters, one uppercase letter and one number." : undefined} required />
        {mode === "signup" && <Input label="Confirm password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />}
        {error && <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
        <Button size="lg" className="min-h-12 w-full" loading={busy}>{mode === "login" ? "Open Flight Deck" : "Create account and continue"}</Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-[var(--flight-muted)]"><span className="h-px flex-1 bg-[var(--flight-border)]" />OR<span className="h-px flex-1 bg-[var(--flight-border)]" /></div>
      <Button type="button" variant="secondary" size="lg" className="min-h-12 w-full" onClick={google} disabled={busy}><span className="font-bold text-[#4285f4]">G</span>Continue with Google</Button>
      <p className="mt-6 text-center text-sm text-[var(--flight-muted)]">{mode === "login" ? <>New here? <Link href={signupHref} className="font-semibold text-[var(--flight-orange)]">Create an account</Link></> : <>Already registered? <Link href={loginHref} className="font-semibold text-[var(--flight-orange)]">Log in</Link></>}</p>
      {mode === "login" && <p className="mt-3 text-center text-sm"><Link href="/forgot-password" className="text-[var(--flight-muted)]">Forgot your password?</Link></p>}
    </div></section>
  </main>;
}
