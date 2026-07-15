"use client";
import { useState } from "react";
import { Code2, Globe2, RefreshCw } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { useProject } from "@/components/project-provider";

export default function WebsitePage() {
  const { project, update } = useProject();
  const [name, setName] = useState(project.website.displayName);
  const [description, setDescription] = useState(project.business.description);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState(false);
  async function analyse() {
    setLoading(true);
    update({ metadata: { ...project.metadata, status: "analysing" } });
    try {
      const res = await fetch("/api/website/analyse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: project.website.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      update({ metadata: data });
    } catch (e) {
      update({
        metadata: {
          ...project.metadata,
          status: "failed",
          error: e instanceof Error ? e.message : "Analysis failed.",
        },
      });
    } finally {
      setLoading(false);
    }
  }
  const m = project.metadata;
  const sitemapText =
    m.sitemap === "detected"
      ? "A sitemap was found. It helps search engines understand the pages available."
      : m.sitemap === "not_detected"
        ? "We could not find a sitemap at the usual address."
        : "We could not confirm whether a sitemap is available.";
  const robotsText =
    m.robots === "detected"
      ? "A robots.txt file was found. It tells search engines which parts of the site they can access."
      : m.robots === "not_detected"
        ? "We could not find a robots.txt file. This file tells search engines which parts of the site they can access."
        : "We could not confirm whether a robots.txt file is available.";
  return (
    <>
      <PageHeader
        eyebrow="Website context"
        title={project.website.displayName}
        description="Public homepage information collected during the lightweight setup analysis."
        action={
          <Button onClick={analyse} loading={loading}>
            <RefreshCw size={16} /> Re-run lightweight analysis
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Globe2 size={22} />
            </span>
            <div>
              <p className="font-semibold">{project.website.domain}</p>
              <a
                href={project.website.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--accent)]"
              >
                Visit website
              </a>
            </div>
            <Badge
              tone={
                m.status === "complete"
                  ? "green"
                  : m.status === "failed"
                    ? "red"
                    : "blue"
              }
            >
              {m.status}
            </Badge>
          </div>
          <dl className="mt-6 divide-y divide-[var(--line)]">
            {[
              ["Homepage title", m.title || "Not detected"],
              ["Meta description", m.description || "Not detected"],
              ["Sitemap", sitemapText],
              ["Search access file", robotsText],
              [
                "Last lightweight analysis",
                m.analysedAt
                  ? new Date(m.analysedAt).toLocaleString()
                  : "Not completed",
              ],
              [
                "Source",
                m.source === "website"
                  ? "Public website metadata"
                  : "Manual or demo context",
              ],
            ].map(([a, b]) => (
              <div key={a} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]">
                <dt className="text-sm font-semibold">{a}</dt>
                <dd className="text-sm leading-6 text-[var(--muted)]">{b}</dd>
              </div>
            ))}
          </dl>
          {m.error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {m.error}
            </p>
          )}
        </Card>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold">Editable context</h2>
            <div className="mt-4 space-y-4">
              <Input
                label="Website display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Textarea
                label="Business description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button
                onClick={() =>
                  update({
                    website: { ...project.website, displayName: name },
                    business: { ...project.business, description },
                  })
                }
              >
                Save changes
              </Button>
            </div>
          </Card>
          <Card className="p-5">
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setRaw(!raw)}
            >
              <span className="flex items-center gap-2 font-semibold">
                <Code2 size={18} /> Raw detected metadata
              </span>
              <span className="text-sm text-[var(--muted)]">
                {raw ? "Hide" : "Show"}
              </span>
            </button>
            {raw && (
              <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-[#252b28] p-4 text-xs leading-5 text-[#dbe6df]">
                {JSON.stringify(m, null, 2)}
              </pre>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
