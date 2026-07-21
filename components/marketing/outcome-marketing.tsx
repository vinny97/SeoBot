import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleCheck,
  FilePenLine,
  Globe2,
  Link2,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import successResult from "@/success-seo-3.webp";

const setup = [
  {
    number: "01",
    title: "Enter your website",
    copy: "Searchhand reads your public pages, maps the site and pre-fills what it understands about your business, services and customers.",
    detail: "You confirm it instead of completing a blank questionnaire.",
    icon: Globe2,
  },
  {
    number: "02",
    title: "Choose how it should work",
    copy: "Pick recommendations only, or let Searchhand prepare work and place it in your approval queue.",
    detail: "You choose the pace and level of control.",
    icon: ShieldCheck,
  },
  {
    number: "03",
    title: "Connect your site and go",
    copy: "Review the first work plan. Publishing connections are being built; until then every proposed change stays reviewable.",
    detail: "Nothing goes live without the permission you set.",
    icon: Sparkles,
  },
] as const;

const cycle = [
  ["09:00", "INSPECTION AGENT", "Your site is mapped", "34 pages checked. Two broken pages and one weak service page found."],
  ["09:06", "OPPORTUNITY AGENT", "The next job is chosen", "Update the pricing page first. It has existing visibility and the clearest route to an enquiry."],
  ["09:18", "CONTENT AGENT", "A reviewable work plan is prepared", "New title, clearer pricing explanation, three internal-link suggestions and a content brief."],
  ["09:31", "QUALITY AGENT", "Everything is checked", "No competing page, unsupported claim or broken link. Work order is ready for approval."],
] as const;

export function OutcomeMarketing() {
  return <>
    <section className="border-b border-[#2d2d2d] bg-[#111] text-white">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-mono text-[10px] font-bold tracking-[.18em] text-[#f26a2e]">WHAT DOES SEARCHHAND ACTUALLY DO?</p>
          <h2 className="text-balance mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">Stop guessing what SEO work will move the needle.</h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/55">Searchhand inspects your site, finds the best next job and prepares the work: page improvements, technical fixes, internal links and content opportunities—all in one approval queue.</p>
          <Link href="/onboarding" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#f26a2e] px-5 py-3.5 text-sm font-semibold text-white">Show me my opportunities <ArrowRight size={17}/></Link>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {[
            [ScanSearch, "Stop guessing what to fix", "The agent separates urgent problems from a hundred low-value warnings, then tells you which job should happen first."],
            [FilePenLine, "Know what to improve", "It chooses between fixing an existing page, updating it, creating something new, merging overlap or ignoring the idea."],
            [Link2, "Make every page work together", "Every work order includes relevant internal-link opportunities so useful pages are easier for people and search engines to find."],
          ].map(([Icon,title,copy]) => { const ItemIcon=Icon as typeof ScanSearch; return <div key={title as string} className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><ItemIcon size={22} className="text-[#f26a2e]"/><h3 className="mt-6 text-xl font-semibold">{title as string}</h3><p className="mt-3 text-sm leading-6 text-white/50">{copy as string}</p></div> })}
        </div>
      </div>
    </section>

    <section className="border-b border-[#dedad1] bg-[#fffefb]">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="text-center">
          <p className="font-mono text-[10px] font-bold tracking-[.18em] text-[#6d5dfb]">LIVE IN THREE STEPS</p>
          <h2 className="text-balance mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Give us the URL. Confirm what we found. Choose the workflow.</h2>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-[#68645d]">The setup begins with your real website—not a long form and not a blank dashboard.</p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {setup.map(({number,title,copy,detail,icon:Icon}) => <div key={number} className="relative overflow-hidden rounded-2xl border border-[#dedad1] bg-[#f7f5f0] p-6"><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-[#f26a2e]">{number}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#6d5dfb] shadow-sm"><Icon size={19}/></span></div><h3 className="mt-10 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#68645d]">{copy}</p><p className="mt-5 flex gap-2 border-t border-[#dedad1] pt-4 text-xs font-medium"><CircleCheck size={15} className="shrink-0 text-[#2f9d68]"/>{detail}</p></div>)}
        </div>
      </div>
    </section>

    <section className="bg-[#111] text-white">
      <div className="mx-auto max-w-6xl px-5 py-24 lg:px-8">
        <div className="text-center">
          <p className="font-mono text-[10px] font-bold tracking-[.18em] text-[#f26a2e]">ONE WORK CYCLE · MINIMAL INPUT FROM YOU</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">This is what “your SEO is handled” means.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/50">You see the decisions, evidence and proposed work. Searchhand handles the inspection and preparation.</p>
        </div>
        <div className="relative mx-auto mt-14 max-w-4xl before:absolute before:bottom-8 before:left-[19px] before:top-8 before:w-px before:bg-white/15 sm:before:left-[27px]">
          {cycle.map(([time,agent,title,copy],index) => <div key={title} className="relative flex gap-5 pb-8 last:pb-0 sm:gap-7"><span className={`relative z-10 mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border sm:h-14 sm:w-14 ${index===3?"border-[#2f9d68]/50 bg-[#2f9d68]/15":"border-[#f26a2e]/30 bg-[#f26a2e]/10"}`}><span className={`h-2.5 w-2.5 rounded-full ${index===3?"bg-[#2f9d68]":"bg-[#f26a2e]"}`}/></span><div className="flex-1 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:p-6"><p className="font-mono text-[10px] tracking-[.12em] text-white/35">{time} <span className="ml-2 font-bold text-[#f26a2e]">{agent}</span></p><h3 className="mt-2 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/50">{copy}</p>{index===3&&<p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2f9d68]/15 px-3 py-1.5 font-mono text-[9px] font-bold tracking-[.12em] text-[#6bd69a]"><Check size={12}/>READY FOR APPROVAL</p>}</div></div>)}
        </div>
      </div>
    </section>

    <section className="border-b border-[#dedad1] bg-[#f7f5f0]">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[.18em] text-[#2f9d68]">RESULTS, NOT ACTIVITY</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em]">Show the work. Then show what changed.</h2>
            <p className="mt-5 leading-7 text-[#68645d]">Every completed work order is designed to connect to a measurable result: more search visibility, more clicks, better positions or more enquiries.</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {[['5.5K','clicks'],['210K','impressions'],['2.9%','CTR'],['7.6','avg. position']].map(([value,label])=><div key={label} className="rounded-xl border border-[#dedad1] bg-[#fffefb] p-4"><p className="font-mono text-xl font-bold">{value}</p><p className="mt-1 text-xs text-[#68645d]">{label}</p></div>)}
            </div>
            <p className="mt-4 text-xs leading-5 text-[#8a857d]">Search Console snapshot supplied for the project. Results vary by website and are never guaranteed.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#dedad1] bg-white p-2 shadow-[0_22px_60px_rgba(23,23,23,.1)]"><Image src={successResult} alt="Search Console performance showing clicks, impressions, click-through rate and average position improving" className="h-auto w-full rounded-xl" priority={false}/></div>
        </div>
      </div>
    </section>
  </>;
}
