"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, RefreshCw, TestTube2, Unplug } from "lucide-react";
import { Button, Input } from "@/components/ui";

type ResultMessage = { tone: "success" | "error"; text: string } | null;

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "The Shopify action could not be completed.");
  return body as Record<string, unknown>;
}

function useActionState() {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<ResultMessage>(null);
  return { loading, setLoading, message, setMessage };
}

export function ConnectShopifyButton({ label = "Connect Shopify" }: { label?: string }) {
  const state = useActionState();
  async function connect() {
    state.setLoading("connect"); state.setMessage(null);
    try {
      const body = await readResponse(await fetch("/api/integrations/shopify/connect", { method: "POST" }));
      if (typeof body.redirectUrl !== "string" || new URL(body.redirectUrl).protocol !== "https:") throw new Error("The secure authorization link was invalid.");
      window.location.assign(body.redirectUrl);
    } catch (error) {
      state.setMessage({ tone: "error", text: error instanceof Error ? error.message : "Shopify could not be connected." });
      state.setLoading(null);
    }
  }
  return <div><Button onClick={connect} loading={state.loading === "connect"}>{label}<ArrowRight size={15}/></Button>{state.message && <p role="alert" className="mt-2 text-sm text-red-700">{state.message.text}</p>}</div>;
}

export function ShopifyConnectionActions({ connectionId, connected }: { connectionId: string; connected: boolean }) {
  const router = useRouter();
  const state = useActionState();
  const [blogId, setBlogId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  async function run(name: string, path: string, body?: unknown) {
    state.setLoading(name); state.setMessage(null);
    try {
      const response = await fetch(path, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await readResponse(response);
      if (typeof data.redirectUrl === "string") {
        if (new URL(data.redirectUrl).protocol !== "https:") throw new Error("The secure authorization link was invalid.");
        window.location.assign(data.redirectUrl); return;
      }
      state.setMessage({ tone: "success", text: typeof data.message === "string" ? data.message : "Shopify connection updated." });
      router.refresh();
    } catch (error) {
      state.setMessage({ tone: "error", text: error instanceof Error ? error.message : "The Shopify action could not be completed." });
    } finally { state.setLoading(null); }
  }

  return <div className="mt-5 space-y-4 border-t border-[var(--flight-border)] pt-5"><div className="flex flex-wrap gap-2">{connected && <><Button size="sm" variant="secondary" loading={state.loading === "refresh"} onClick={() => run("refresh", `/api/integrations/shopify/${connectionId}/status`)}><RefreshCw size={14}/>Refresh status</Button><Button size="sm" variant="secondary" loading={state.loading === "test"} onClick={() => run("test", `/api/integrations/shopify/${connectionId}/status`)}><TestTube2 size={14}/>Test connection</Button></>}<Button size="sm" variant="secondary" loading={state.loading === "reconnect"} onClick={() => run("reconnect", `/api/integrations/shopify/${connectionId}/reconnect`)}><RefreshCw size={14}/>Reconnect</Button><Button size="sm" variant="danger" onClick={() => setConfirmDisconnect((value) => !value)}><Unplug size={14}/>Disconnect</Button></div>{connected && <div className="rounded-xl border border-[var(--flight-border)] bg-[#f7f6f1] p-4"><h3 className="font-semibold">Create Shopify test draft</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Enter the exact destination blog ID. Searchhand will create one unpublished article and will not retry an uncertain result.</p><div className="mt-3 max-w-sm"><Input label="Shopify blog ID" value={blogId} onChange={(event) => setBlogId(event.target.value)} placeholder="119067803953" inputMode="numeric"/></div><label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1"/><span>I confirm Searchhand may create one clearly marked, unpublished test draft in this blog.</span></label><Button className="mt-3" size="sm" disabled={!confirmed || !blogId.trim()} loading={state.loading === "draft"} onClick={() => run("draft", `/api/integrations/shopify/${connectionId}/test-draft`, { confirm: true, blogId: blogId.trim() })}><CheckCircle2 size={14}/>Create unpublished test draft</Button></div>}{confirmDisconnect && <div className="rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-sm text-red-800">This revokes Searchhand’s Composio connection. Existing Shopify articles and publication history are preserved.</p><Button className="mt-3" size="sm" variant="danger" loading={state.loading === "disconnect"} onClick={() => run("disconnect", `/api/integrations/shopify/${connectionId}/disconnect`, { confirm: true })}>Confirm disconnect</Button></div>}{state.message && <p role="status" className={`flex items-center gap-2 text-sm ${state.message.tone === "success" ? "text-[var(--flight-green)]" : "text-red-700"}`}>{state.message.tone === "success" ? <CheckCircle2 size={15}/> : null}{state.message.text}</p>}{state.loading && <span className="sr-only"><LoaderCircle className="animate-spin"/>Working</span>}</div>;
}
