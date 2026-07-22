"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FilePenLine, RefreshCw, TestTube2, Unplug } from "lucide-react";
import { Button, Input } from "@/components/ui";

type Credentials = { siteUrl: string; username: string; applicationPassword: string };
type Message = { tone: "success" | "error"; text: string } | null;

async function responseBody(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "The WordPress action could not be completed.");
  return body as Record<string, unknown>;
}

function CredentialFields({ value, setValue }: { value: Credentials; setValue: (value: Credentials) => void }) {
  return <div className="grid gap-4"><Input label="WordPress website URL" value={value.siteUrl} onChange={(event) => setValue({ ...value, siteUrl: event.target.value })} placeholder="https://example.com" autoComplete="url"/><Input label="WordPress username" value={value.username} onChange={(event) => setValue({ ...value, username: event.target.value })} autoComplete="username"/><Input label="Application Password" type="password" value={value.applicationPassword} onChange={(event) => setValue({ ...value, applicationPassword: event.target.value })} autoComplete="new-password" hint="Use a WordPress Application Password—not your normal password."/></div>;
}

export function WordPressConnectForm() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credentials>({ siteUrl: "", username: "", applicationPassword: "" });
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const complete = Boolean(credentials.siteUrl.trim() && credentials.username.trim() && credentials.applicationPassword.trim());
  async function run(action: "test" | "connect") {
    setLoading(action); setMessage(null);
    try {
      const body = await responseBody(await fetch(`/api/integrations/wordpress/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) }));
      setMessage({ tone: "success", text: action === "test" ? `Connection verified${typeof body.userDisplayName === "string" ? ` for ${body.userDisplayName}` : ""}. Nothing was created.` : "WordPress connected. Searchhand will create drafts only." });
      if (action === "connect") { setCredentials({ siteUrl: "", username: "", applicationPassword: "" }); router.refresh(); }
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "WordPress could not be connected." }); }
    finally { setLoading(null); }
  }
  return <div className="space-y-4"><CredentialFields value={credentials} setValue={setCredentials}/><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={!complete} loading={loading === "test"} onClick={() => run("test")}><TestTube2 size={15}/>Test connection</Button><Button disabled={!complete} loading={loading === "connect"} onClick={() => run("connect")}><CheckCircle2 size={15}/>Connect WordPress</Button></div>{message && <p role="status" className={`text-sm ${message.tone === "success" ? "text-[var(--flight-green)]" : "text-red-700"}`}>{message.text}</p>}</div>;
}

export function WordPressConnectionActions({ connectionId, connected, siteUrl, hasTestDraft }: { connectionId: string; connected: boolean; siteUrl: string | null; hasTestDraft: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [draftPanel, setDraftPanel] = useState(false);
  const [draftConfirmed, setDraftConfirmed] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [credentials, setCredentials] = useState<Credentials>({ siteUrl: siteUrl || "", username: "", applicationPassword: "" });

  async function run(name: string, path: string, body?: unknown) {
    setLoading(name); setMessage(null);
    try {
      const result = await responseBody(await fetch(path, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }));
      setMessage({ tone: "success", text: typeof result.message === "string" ? result.message : "WordPress connection updated." });
      if (name === "reconnect") { setCredentials({ siteUrl: siteUrl || "", username: "", applicationPassword: "" }); setReconnecting(false); }
      if (name === "draft") { setDraftPanel(false); setDraftConfirmed(false); }
      router.refresh();
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "The WordPress action could not be completed." }); }
    finally { setLoading(null); }
  }

  return <div className="mt-5 space-y-4 border-t border-[var(--flight-border)] pt-5"><div className="flex flex-wrap gap-2">{connected && <><Button size="sm" variant="secondary" loading={loading === "status"} onClick={() => run("status", `/api/integrations/wordpress/${connectionId}/status`)}><TestTube2 size={14}/>Test connection</Button><Button size="sm" variant="secondary" onClick={() => setDraftPanel((value) => !value)}><FilePenLine size={14}/>{hasTestDraft ? "Update test draft" : "Create test draft"}</Button></>}<Button size="sm" variant="secondary" onClick={() => setReconnecting((value) => !value)}><RefreshCw size={14}/>Reconnect</Button><Button size="sm" variant="danger" onClick={() => setConfirmDisconnect((value) => !value)}><Unplug size={14}/>Disconnect</Button></div>{draftPanel && connected && <div className="rounded-xl border border-[var(--flight-border)] bg-[#f7f6f1] p-4"><p className="text-sm">Searchhand will {hasTestDraft ? "update the existing" : "create one clearly labelled"} WordPress draft. It will not publish it.</p><label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={draftConfirmed} onChange={(event) => setDraftConfirmed(event.target.checked)} className="mt-1"/><span>I confirm this draft-only test.</span></label><Button className="mt-3" size="sm" disabled={!draftConfirmed} loading={loading === "draft"} onClick={() => run("draft", `/api/integrations/wordpress/${connectionId}/test-draft${hasTestDraft ? "/update" : ""}`, { confirm: true })}>{hasTestDraft ? "Update test draft" : "Create WordPress test draft"}</Button></div>}{reconnecting && <div className="space-y-4 rounded-xl border border-[var(--flight-border)] bg-[#f7f6f1] p-4"><p className="text-sm font-semibold">Verify replacement credentials before saving</p><CredentialFields value={credentials} setValue={setCredentials}/><Button size="sm" loading={loading === "reconnect"} disabled={!credentials.siteUrl.trim() || !credentials.username.trim() || !credentials.applicationPassword.trim()} onClick={() => run("reconnect", `/api/integrations/wordpress/${connectionId}/reconnect`, credentials)}>Reconnect WordPress</Button></div>}{confirmDisconnect && <div className="rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-sm text-red-800">Searchhand will erase its saved credentials and preserve all WordPress posts and publication history.</p><Button className="mt-3" size="sm" variant="danger" loading={loading === "disconnect"} onClick={() => run("disconnect", `/api/integrations/wordpress/${connectionId}/disconnect`, { confirm: true })}>Confirm disconnect</Button></div>}{message && <p role="status" className={`text-sm ${message.tone === "success" ? "text-[var(--flight-green)]" : "text-red-700"}`}>{message.text}</p>}</div>;
}
