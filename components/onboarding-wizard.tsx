"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Compass,
  Globe2,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import { useProject } from "@/components/project-provider";
import {
  buildActivities,
  buildJobs,
  buildOpportunities,
} from "@/lib/demo/seed";
import { normaliseWebsiteUrl } from "@/lib/utils";
import type {
  ApprovalPreference,
  AudienceScope,
  ProjectState,
  WebsiteMetadata,
} from "@/lib/types";
import { productConfig } from "@/lib/config/product";
import { websiteAnalysisFallback } from "@/lib/services/website-analysis";

const steps = [
  "Website",
  "Discovery",
  "Business",
  "Visibility",
  "Goals",
  "Competitors",
  "Plan",
  "Ready",
];
const goalOptions = [
  "Get more qualified leads",
  "Increase online sales",
  "Grow local visibility",
  "Rank for service searches",
  "Build authority in the industry",
  "Grow product sign-ups",
  "Promote specific locations",
  "Publish useful educational content",
  "Improve existing website pages",
  "Recover declining traffic",
];
const responsibilities = [
  "Review the website structure",
  "Prepare initial topic opportunities",
  "Watch confirmed competitors",
  "Identify pages that need improvement",
  "Prepare data integrations",
  "Build the first content plan",
];

export function OnboardingWizard() {
  const router = useRouter();
  const { project, hydrated, update } = useProject();
  const step = project.onboardingStep || 1;
  const [direction, setDirection] = useState(1);
  useEffect(() => {
    if (hydrated && project.onboardingCompleted) router.replace("/app");
  }, [hydrated, project.onboardingCompleted, router]);
  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    update({ onboardingStep: Math.max(1, Math.min(8, next)) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (!hydrated) return <Loading />;
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[var(--background)]/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-white">
              <Compass size={17} />
            </span>
            {productConfig.name}
          </div>
          <span className="text-sm text-[var(--muted)]">
            Setup saves automatically
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:py-9">
        <div className="mb-9">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
            <span>Step {step} of 8</span>
            <span>{steps[step - 1]}</span>
          </div>
          <div className="mt-3 grid grid-cols-8 gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-colors ${i < step ? "bg-[var(--accent)]" : "bg-[#dfdfd9]"}`}
              />
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -18 }}
            transition={{ duration: 0.22 }}
          >
            {step === 1 && (
              <WebsiteStep
                project={project}
                update={update}
                next={() => go(2)}
              />
            )}{" "}
            {step === 2 && (
              <DiscoveryStep
                project={project}
                update={update}
                back={() => go(1)}
                next={() => go(3)}
              />
            )}{" "}
            {step === 3 && (
              <BusinessStep
                project={project}
                update={update}
                back={() => go(2)}
                next={() => go(4)}
              />
            )}{" "}
            {step === 4 && (
              <VisibilityStep
                project={project}
                back={() => go(3)}
                next={() => go(5)}
              />
            )}{" "}
            {step === 5 && (
              <GoalsStep
                project={project}
                update={update}
                back={() => go(4)}
                next={() => go(6)}
              />
            )}{" "}
            {step === 6 && (
              <CompetitorsStep
                project={project}
                update={update}
                back={() => go(5)}
                next={() => go(7)}
              />
            )}{" "}
            {step === 7 && (
              <PlanStep
                project={project}
                update={update}
                back={() => go(6)}
                next={() => go(8)}
              />
            )}{" "}
            {step === 8 && (
              <ReadyStep
                project={project}
                update={update}
                back={() => go(7)}
                finish={() => router.push("/app")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
function Intro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 leading-7 text-[var(--muted)]">{description}</p>
    </div>
  );
}
function Nav({
  back,
  next,
  label = "Continue",
  disabled = false,
  loading = false,
}: {
  back?: () => void;
  next: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="mt-7 flex items-center justify-between">
      {back ? (
        <Button variant="ghost" onClick={back}>
          <ArrowLeft size={17} /> Back
        </Button>
      ) : (
        <span />
      )}
      <Button size="lg" onClick={next} disabled={disabled} loading={loading}>
        {label}
        <ArrowRight size={17} />
      </Button>
    </div>
  );
}
function WebsiteStep({
  project,
  update,
  next,
}: {
  project: ProjectState;
  update: (p: Partial<ProjectState>) => void;
  next: () => void;
}) {
  const [url, setUrl] = useState(project.website.url);
  const [name, setName] = useState(project.business.name);
  const [location, setLocation] = useState(project.business.locations);
  const [audience, setAudience] = useState<AudienceScope>(
    project.business.audience,
  );
  const [error, setError] = useState("");
  function submit() {
    try {
      const n = normaliseWebsiteUrl(url);
      update({
        website: {
          url: n.url,
          domain: n.domain,
          displayName: name || n.domain,
        },
        business: {
          ...project.business,
          name:
            name ||
            n.domain.split(".")[0].replace(/\b\w/g, (c) => c.toUpperCase()),
          locations: location,
          audience,
        },
        metadata: { ...project.metadata, status: "analysing" },
      });
      next();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Please enter a valid public website.",
      );
    }
  }
  return (
    <>
      <Intro
        eyebrow="Let’s begin"
        title="What website do you want to grow?"
        description="We’ll learn about the business, read a few public homepage details and prepare an honest first organic growth plan."
      />
      <Card className="mx-auto max-w-2xl p-5 sm:p-7">
        <div className="space-y-5">
          <Input
            label="Website address"
            placeholder="yourbusiness.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            error={error}
            hint="We’ll add https:// and check that this is a public website."
          />
          <Input
            label="Business name"
            placeholder="Optional — we may detect it"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Business location"
              placeholder="e.g. Bristol, UK"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Select
              label="Who do you serve?"
              value={audience}
              onChange={(e) => setAudience(e.target.value as AudienceScope)}
            >
              <option value="local">A local audience</option>
              <option value="national">A national audience</option>
              <option value="international">An international audience</option>
            </Select>
          </div>
        </div>
        <Nav next={submit} label="Analyse website" disabled={!url.trim()} />
      </Card>
    </>
  );
}
function DiscoveryStep({
  project,
  update,
  back,
  next,
}: {
  project: ProjectState;
  update: (p: Partial<ProjectState>) => void;
  back: () => void;
  next: () => void;
}) {
  const [loading, setLoading] = useState(
    project.metadata.status === "analysing" ||
      project.metadata.status === "idle",
  );
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || project.metadata.status === "complete") return;
    ran.current = true;
    (async () => {
      try {
        const res = await fetch("/api/website/analyse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: project.website.url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const metadata = data as WebsiteMetadata;
        update({
          metadata,
          business: {
            ...project.business,
            description:
              project.business.description || metadata.description || "",
            name:
              project.business.name ||
              metadata.title ||
              project.website.displayName,
          },
        });
      } catch (e) {
        update({ metadata: websiteAnalysisFallback(project.metadata, e) });
      } finally {
        setLoading(false);
      }
    })();
  }, [project, update]);
  const m = project.metadata;
  const items = [
    {
      label: "Homepage reached",
      ok: m.status === "complete",
      detail: project.website.domain,
    },
    {
      label: "Page title read",
      ok: !!m.title,
      detail: m.title || "Needs confirmation",
    },
    {
      label: "Description read",
      ok: !!m.description,
      detail: m.description || "Needs confirmation",
    },
    {
      label: "Sitemap",
      ok: m.sitemap === "detected",
      detail:
        m.sitemap === "detected"
          ? "Detected"
          : m.sitemap === "not_detected"
            ? "Not detected"
            : "Could not check",
    },
    {
      label: "Robots.txt",
      ok: m.robots === "detected",
      detail:
        m.robots === "detected"
          ? "Detected"
          : m.robots === "not_detected"
            ? "Not detected"
            : "Could not check",
    },
  ];
  return (
    <>
      <Intro
        eyebrow="Website discovery"
        title={
          loading
            ? "Getting to know your website"
            : "Here’s what we could safely read"
        }
        description={
          loading
            ? "This lightweight check reads public homepage metadata only. It is not a full crawl or SEO audit."
            : "Website facts are marked as detected. Anything else will be confirmed by you next."
        }
      />
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[#f1f3ee] px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-10 w-10 place-items-center rounded-xl ${loading ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-white"}`}
            >
              {loading ? (
                <LoaderCircle className="animate-spin" size={20} />
              ) : (
                <Globe2 size={20} />
              )}
            </span>
            <div>
              <p className="font-semibold">{project.website.domain}</p>
              <p className="text-sm text-[var(--muted)]">
                Lightweight metadata analysis
              </p>
            </div>
            <Badge
              tone={
                m.status === "complete"
                  ? "green"
                  : m.status === "failed"
                    ? "amber"
                    : "blue"
              }
            >
              {loading
                ? "Reading"
                : m.status === "complete"
                  ? "Complete"
                  : "Manual confirmation available"}
            </Badge>
          </div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {items.map((item, i) => (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.09 }}
              key={item.label}
              className="flex items-start gap-3 px-5 py-4"
            >
              <span
                className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full ${loading && i > 1 ? "bg-[#e7e7e1]" : item.ok ? "bg-[var(--accent)] text-white" : "bg-[#eee8dc] text-[#8d682d]"}`}
              >
                {loading && i > 1 ? (
                  <Circle size={9} />
                ) : item.ok ? (
                  <Check size={13} />
                ) : (
                  <Circle size={9} />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-[var(--muted)]">
                  {loading && i > 1 ? "Checking…" : item.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        {m.status === "failed" && (
          <div className="m-5 rounded-xl border border-[#ead8b7] bg-[#fcf4e6] p-4 text-sm text-[#765020]">
            <strong>We couldn’t read this site:</strong> {m.error} You can
            continue and provide the business details manually.
          </div>
        )}
      </Card>
      <Nav
        back={back}
        next={next}
        label={
          m.status === "failed"
            ? "Continue manually"
            : "Confirm business details"
        }
        disabled={loading}
        loading={loading}
      />
    </>
  );
}
function BusinessStep({
  project,
  update,
  back,
  next,
}: {
  project: ProjectState;
  update: (p: Partial<ProjectState>) => void;
  back: () => void;
  next: () => void;
}) {
  const [b, setB] = useState(project.business);
  const field = (key: keyof typeof b, value: string) =>
    setB({ ...b, [key]: value });
  function save() {
    update({
      business: b,
      website: { ...project.website, displayName: b.name },
    });
    next();
  }
  return (
    <>
      <Intro
        eyebrow="Your business"
        title="Have we understood the essentials?"
        description="Review this carefully. You’re the expert, and this context will shape all future work."
      />
      <Card className="mx-auto max-w-3xl p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Business name"
            required
            value={b.name}
            onChange={(e) => field("name", e.target.value)}
          />
          <Input
            label="Industry"
            placeholder="e.g. Independent accounting"
            value={b.industry}
            onChange={(e) => field("industry", e.target.value)}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Short description"
              value={b.description}
              onChange={(e) => field("description", e.target.value)}
              placeholder="What does the business do, and what makes it useful?"
            />
          </div>
          <Input
            label="Main products or services"
            value={b.services}
            onChange={(e) => field("services", e.target.value)}
            placeholder="Separate with commas"
          />
          <Input
            label="Target customer"
            value={b.customer}
            onChange={(e) => field("customer", e.target.value)}
            placeholder="Who is the best fit?"
          />
          <Input
            label="Primary locations"
            value={b.locations}
            onChange={(e) => field("locations", e.target.value)}
          />
          <Select
            label="Business model"
            value={b.model}
            onChange={(e) => field("model", e.target.value)}
          >
            <option>Service business</option>
            <option>Ecommerce</option>
            <option>SaaS</option>
            <option>Marketplace</option>
            <option>Publisher</option>
            <option>Other</option>
          </Select>
          <Select
            label="Brand tone"
            value={b.tone}
            onChange={(e) => field("tone", e.target.value)}
          >
            <option>Clear and helpful</option>
            <option>Warm and conversational</option>
            <option>Expert and authoritative</option>
            <option>Concise and practical</option>
            <option>Playful and energetic</option>
          </Select>
          <Select
            label="Most important action"
            value={b.conversion}
            onChange={(e) => field("conversion", e.target.value)}
          >
            <option>Purchase</option>
            <option>Book a call</option>
            <option>Request a quote</option>
            <option>Visit a location</option>
            <option>Start a free trial</option>
            <option>Make a reservation</option>
            <option>Contact the business</option>
          </Select>
        </div>
        <Nav
          back={back}
          next={save}
          disabled={
            !b.name.trim() || !b.description.trim() || !b.services.trim()
          }
        />
      </Card>
    </>
  );
}
function VisibilityStep({
  project,
  back,
  next,
}: {
  project: ProjectState;
  back: () => void;
  next: () => void;
}) {
  const topic =
    project.business.services.split(",")[0]?.trim() ||
    project.business.industry ||
    "services like yours";
  const searches = [
    `${topic} for ${project.business.customer || "my business"}`,
    `best ${topic}${project.business.locations ? ` in ${project.business.locations}` : ""}`,
    `how to choose ${topic}`,
  ];
  return (
    <>
      <Intro
        eyebrow="Search visibility"
        title="There’s room to be more visible"
        description="These are illustrative customer searches based on your profile—not live keyword data or exact rankings."
      />
      <Card className="mx-auto max-w-4xl overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[#f1f2ed] p-5">
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-full border border-[var(--line)] bg-white px-5 py-3 shadow-sm">
            <Search size={18} className="text-[var(--muted)]" />
            <span className="truncate text-sm">{searches[0]}</span>
            <Badge tone="blue">Example search</Badge>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {searches.slice(1).map((s) => (
              <span
                key={s}
                className="rounded-full bg-white px-3 py-1.5 text-xs text-[var(--muted)]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-2xl space-y-5 p-6 sm:p-8">
          {[
            {
              name: "Helpful industry guide",
              domain: "example-resource.test",
              copy: "A useful explanation related to the customer’s question.",
            },
            {
              name: "Established provider",
              domain: "example-provider.test",
              copy: "A focused page matching this type of search.",
            },
            {
              name: project.business.name || project.website.displayName,
              domain: project.website.domain,
              copy: project.business.description || "Your business website.",
            },
          ].map((r, i) => (
            <div
              key={r.domain}
              className={`rounded-xl p-4 ${i === 2 ? "border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)]" : "border border-transparent"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--muted)]">{r.domain}</span>
                {i === 2 && <Badge tone="green">Illustrative result</Badge>}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-[#355d8a]">
                {r.name}
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                {r.copy}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <p className="mx-auto mt-6 max-w-xl text-center text-lg font-semibold">
        Let’s build a plan to improve this.
      </p>
      <Nav back={back} next={next} />
    </>
  );
}
function GoalsStep({
  project,
  update,
  back,
  next,
}: {
  project: ProjectState;
  update: (p: Partial<ProjectState>) => void;
  back: () => void;
  next: () => void;
}) {
  const [selected, setSelected] = useState(project.goals);
  const [pref, setPref] = useState(project.approvalPreference);
  function toggle(g: string) {
    setSelected((v) =>
      v.includes(g) ? v.filter((x) => x !== g) : v.length < 3 ? [...v, g] : v,
    );
  }
  function save() {
    update({ goals: selected, approvalPreference: pref });
    next();
  }
  return (
    <>
      <Intro
        eyebrow="Priorities"
        title="What should organic search achieve?"
        description="Choose up to three outcomes. This keeps your SEO employee focused on business value."
      />
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-3 sm:grid-cols-2">
          {goalOptions.map((g) => {
            const active = selected.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggle(g)}
                className={`focus-ring flex items-center justify-between rounded-2xl border p-4 text-left font-medium transition ${active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[#b8c0bb]"}`}
              >
                <span>{g}</span>
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full ${active ? "bg-[var(--accent)] text-white" : "border border-[var(--line)]"}`}
                >
                  {active && <Check size={15} />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-right text-sm text-[var(--muted)]">
          {selected.length}/3 selected
        </p>
        <Card className="mt-8 p-5 sm:p-6">
          <h2 className="font-semibold">How involved do you want to be?</h2>
          <div className="mt-4 grid gap-3">
            {[
              ["review_all", "Review everything before it is published"],
              ["review_important", "Review important changes only"],
              ["agreed_rules", "Let the SEO employee work within agreed rules"],
            ].map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${pref === value ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"}`}
              >
                <input
                  type="radio"
                  className="accent-[var(--accent)]"
                  checked={pref === value}
                  onChange={() => setPref(value as ApprovalPreference)}
                />
                <span>
                  <strong className="text-sm">{label}</strong>
                  {value === "agreed_rules" && (
                    <span className="mt-1 block text-xs text-[var(--muted)]">
                      Stored as your preference. Autonomous publishing is not
                      enabled in V1.
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-[#f3f2ed] p-3 text-xs leading-5 text-[var(--muted)]">
            Publishing connections will be offered in a later, deliberate setup
            step. Nothing will be published in this version.
          </p>
        </Card>
        <Nav back={back} next={save} disabled={!selected.length} />
      </div>
    </>
  );
}
function CompetitorsStep({
  project,
  update,
  back,
  next,
}: {
  project: ProjectState;
  update: (p: Partial<ProjectState>) => void;
  back: () => void;
  next: () => void;
}) {
  const [list, setList] = useState(project.competitors);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  function add() {
    try {
      if (list.length >= 5) return;
      const n = normaliseWebsiteUrl(url);
      if (list.some((c) => c.domain === n.domain)) {
        setError("That competitor is already on your list.");
        return;
      }
      setList([
        ...list,
        {
          id: crypto.randomUUID(),
          name: name || n.domain,
          url: n.url,
          domain: n.domain,
          source: "user",
          confirmed: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      setName("");
      setUrl("");
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Enter a valid competitor website.",
      );
    }
  }
  function save() {
    update({ competitors: list });
    next();
  }
  return (
    <>
      <Intro
        eyebrow="Your market"
        title="Who do customers compare you with?"
        description="Add up to five competitors you already know. We won’t invent traffic, authority or keyword numbers."
      />
      <Card className="mx-auto max-w-3xl p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
          <Input
            label="Competitor name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
          />
          <Input
            label="Website address"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="competitor.com"
          />
          <Button
            variant="secondary"
            onClick={add}
            disabled={!url || list.length >= 5}
          >
            <Plus size={16} /> Add
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 space-y-2">
          {list.length ? (
            list.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white p-3"
              >
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {c.domain} · Confirmed by you
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setList(list.filter((x) => x.id !== c.id))}
                  aria-label={`Remove ${c.name}`}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
              No competitors added yet. It’s completely fine to skip this step.
            </div>
          )}
        </div>
        <div className="mt-5 rounded-xl bg-[#f3f2ed] p-3 text-xs leading-5 text-[var(--muted)]">
          <strong>Suggestions are disabled in this setup.</strong> Future
          provider suggestions will always be clearly separated from competitors
          you confirm.
        </div>
        <Nav
          back={back}
          next={save}
          label={list.length ? "Confirm competitors" : "Skip for now"}
        />
      </Card>
    </>
  );
}
function PlanStep({
  project,
  update,
  back,
  next,
}: {
  project: ProjectState;
  update: (p: Partial<ProjectState>) => void;
  back: () => void;
  next: () => void;
}) {
  const opportunities = useMemo(
    () =>
      project.opportunities.length
        ? project.opportunities
        : buildOpportunities(project.business.name, project.business.services),
    [project],
  );
  useEffect(() => {
    if (!project.opportunities.length) update({ opportunities });
  }, [opportunities, project.opportunities.length, update]);
  return (
    <>
      <Intro
        eyebrow="Initial plan"
        title="A practical place to start"
        description="This plan uses your confirmed profile and transparent seeded logic. It contains hypotheses, not live search-volume or ranking claims."
      />
      <div className="mx-auto grid max-w-4xl gap-3">
        {opportunities.map((o, i) => (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            key={o.id}
          >
            <Card className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge tone="green">{o.category}</Badge>
                    <Badge>{o.source}</Badge>
                  </div>
                  <h3 className="font-semibold">{o.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {o.description}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 text-xs">
                  <span className="rounded-lg bg-[#f1f1ec] px-2.5 py-2">
                    <strong>{o.impact}</strong> impact
                  </span>
                  <span className="rounded-lg bg-[#f1f1ec] px-2.5 py-2">
                    <strong>{o.effort}</strong> effort
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      <Nav back={back} next={next} label="Prepare my workspace" />
    </>
  );
}
function ReadyStep({
  project,
  update,
  back,
  finish,
}: {
  project: ProjectState;
  update: (p: Partial<ProjectState>) => void;
  back: () => void;
  finish: () => void;
}) {
  function complete() {
    update({
      onboardingCompleted: true,
      onboardingStep: 8,
      jobs: buildJobs(),
      activities: buildActivities(project.website.domain),
    });
    document.cookie =
      "northstar-onboarding-complete=1; path=/; max-age=31536000; samesite=lax";
    finish();
  }
  const checks = [
    ["Website connected", project.website.domain],
    ["Business profile confirmed", project.business.name],
    ["Goals selected", `${project.goals.length} priorities`],
    [
      "Competitors added",
      project.competitors.length
        ? `${project.competitors.length} confirmed`
        : "Skipped for now",
    ],
    [
      "Initial plan prepared",
      `${project.opportunities.length || 4} opportunities`,
    ],
  ];
  return (
    <>
      <Intro
        eyebrow="Setup complete"
        title="Your SEO employee is ready."
        description="Your workspace has a clear starting plan. The V1 employee will organise and explain work; real autonomous execution comes later."
      />
      <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Workspace summary</h2>
          <div className="mt-4 divide-y divide-[var(--line)]">
            {checks.map(([a, b]) => (
              <div key={a} className="flex items-center gap-3 py-3">
                <CheckCircle2 size={19} className="text-[var(--accent)]" />
                <div>
                  <p className="text-sm font-semibold">{a}</p>
                  <p className="text-xs text-[var(--muted)]">{b}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">First responsibilities</h2>
          <div className="mt-4 space-y-2">
            {responsibilities.map((r, i) => (
              <div key={r} className="flex gap-3 rounded-xl bg-[#f3f2ed] p-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[var(--accent)]">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{r}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mx-auto mt-7 flex max-w-4xl items-center justify-between">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft size={17} /> Back
        </Button>
        <Button size="lg" onClick={complete}>
          Open my SEO workspace <ArrowRight size={17} />
        </Button>
      </div>
    </>
  );
}
function Loading() {
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="text-center">
        <LoaderCircle className="mx-auto animate-spin text-[var(--accent)]" />
        <p className="mt-3 text-sm text-[var(--muted)]">
          Restoring your setup…
        </p>
      </div>
    </main>
  );
}
