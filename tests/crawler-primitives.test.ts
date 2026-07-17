import { describe,expect,it } from "vitest";
import { normaliseCrawlUrl,hasUnknownQueryParameters,isUnsafeActionUrl } from "../lib/crawler/url-normalisation.js";
import { isBlockedAddress,validateHostname } from "../lib/crawler/dns-security.js";
import { isWithinCrawlScope } from "../lib/crawler/url-scope.js";
import { parseRobots } from "../lib/crawler/robots.js";
import { parseSitemap } from "../lib/crawler/sitemaps.js";
import { extractHtml } from "../lib/crawler/html-extractor.js";
import { calculateIndexability } from "../lib/crawler/indexability.js";
import { classifyPage } from "../lib/crawler/page-classifier.js";
import { detectCrossPageIssues,detectPageIssues } from "../lib/crawler/issue-detector.js";

describe("URL normalisation and scope",()=>{
  it("removes fragments and tracking parameters",()=>expect(normaliseCrawlUrl("HTTPS://Example.COM:443/path/?utm_source=x&b=2&a=1#part")).toBe("https://example.com/path?a=1&b=2"));
  it("removes default HTTP ports",()=>expect(normaliseCrawlUrl("http://example.com:80/")).toBe("http://example.com/"));
  it("normalises international domains",()=>expect(normaliseCrawlUrl("https://münich.example/straße")).toContain("xn--mnich-kva.example"));
  it("rejects unsupported protocols",()=>expect(()=>normaliseCrawlUrl("file:///etc/passwd")).toThrow());
  it("rejects embedded credentials",()=>expect(()=>normaliseCrawlUrl("https://user:pass@example.com")).toThrow());
  it("detects unknown query parameters",()=>expect(hasUnknownQueryParameters("https://example.com/?colour=red")).toBe(true));
  it("detects unsafe action paths",()=>expect(isUnsafeActionUrl("https://example.com/account/logout")).toBe(true));
  it("allows apex and www scope",()=>expect(isWithinCrawlScope("https://www.example.com/a","https://example.com/")).toBe(true));
  it("blocks unrelated domains",()=>expect(isWithinCrawlScope("https://example.net/","https://example.com/")).toBe(false));
  it("blocks arbitrary subdomains by default",()=>expect(isWithinCrawlScope("https://api.example.com/","https://example.com/")).toBe(false));
});

describe("SSRF address classification",()=>{
  for(const address of ["127.0.0.1","0.0.0.0","10.0.0.1","172.16.0.1","192.168.1.1","169.254.169.254","100.64.0.1","::1","fc00::1","fe80::1","::ffff:127.0.0.1"]){it(`blocks ${address}`,()=>expect(isBlockedAddress(address)).toBe(true))}
  it("allows a public documentation address",()=>expect(isBlockedAddress("93.184.216.34")).toBe(false));
  it("blocks localhost hostnames",()=>expect(()=>validateHostname("service.localhost")).toThrow());
  it("blocks encoded loopback IP notation after URL parsing",()=>expect(()=>validateHostname(new URL("http://2130706433").hostname)).toThrow());
});

describe("robots and sitemap parsing",()=>{
  const robots=parseRobots("https://example.com/robots.txt","User-agent: NorthstarCrawler\nDisallow: /private\nAllow: /private/public\nSitemap: https://example.com/sitemap.xml","NorthstarCrawler");
  it("allows a public URL",()=>expect(robots.parser.isAllowed("https://example.com/about","NorthstarCrawler")).toBe(true));
  it("disallows a matched URL",()=>expect(robots.parser.isAllowed("https://example.com/private/a","NorthstarCrawler")).toBe(false));
  it("respects a more specific allow",()=>expect(robots.parser.isAllowed("https://example.com/private/public","NorthstarCrawler")).toBe(true));
  it("extracts sitemap declarations",()=>expect(robots.sitemaps).toEqual(["https://example.com/sitemap.xml"]));
  it("detects a site-wide disallow",()=>expect(parseRobots("https://example.com/robots.txt","User-agent: *\nDisallow: /","NorthstarCrawler").siteBlocked).toBe(true));
  it("parses sitemap URL sets",()=>expect(parseSitemap("<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/a</loc></url></urlset>").urls).toHaveLength(2));
  it("parses sitemap indexes",()=>expect(parseSitemap("<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap></sitemapindex>").nested).toEqual(["https://example.com/a.xml"]));
  it("labels unrelated XML unknown",()=>expect(parseSitemap("<root />").type).toBe("unknown"));
});

const html=`<!doctype html><html lang="en"><head><title>Example service</title><meta name="description" content="A useful service description"><link rel="canonical" href="/service"><meta name="robots" content="index,follow"><script type="application/ld+json">{"@type":"Service"}</script></head><body><nav>Repeated navigation words</nav><h1>Main service</h1><h2>Details</h2><p>This is useful visible page content for customers who want to understand the service clearly.</p><a href="/contact?utm_source=nav">Contact</a><a href="https://external.example/a">External</a></body></html>`;
describe("HTML extraction and deterministic signals",()=>{
  const result=extractHtml(html,"https://example.com/service","https://example.com/");
  it("extracts title and description",()=>{expect(result.title).toBe("Example service");expect(result.metaDescription).toContain("useful")});
  it("normalises canonical URLs",()=>expect(result.canonicalUrl).toBe("https://example.com/service"));
  it("extracts H1 and H2",()=>{expect(result.h1Count).toBe(1);expect(result.h2Count).toBe(1)});
  it("detects JSON-LD types without storing payload",()=>expect(result.structuredDataTypes).toEqual(["Service"]));
  it("classifies internal and external links",()=>expect(result.links.map(link=>link.type)).toEqual(["internal","external"]));
  it("removes tracking parameters from extracted links",()=>expect(result.links[0].normalisedTargetUrl).toBe("https://example.com/contact"));
  it("classifies common page routes",()=>{expect(classifyPage("https://example.com/",null,[])).toBe("homepage");expect(classifyPage("https://example.com/pricing",null,[])).toBe("pricing");expect(classifyPage("https://example.com/blog/post","Post",["Article"])).toBe("blog_article")});
});

describe("indexability and issue detection",()=>{
  const base={status:200,contentType:"text/html",robotsAllowed:true,robotsMeta:[] as string[],xRobotsTag:[] as string[],canonicalUrl:null,finalUrl:"https://example.com/"};
  it("labels a clean HTML response technically indexable",()=>expect(calculateIndexability(base).code).toBe("indexable"));
  it("respects meta noindex",()=>expect(calculateIndexability({...base,robotsMeta:["noindex"]}).code).toBe("meta_noindex"));
  it("respects header noindex",()=>expect(calculateIndexability({...base,xRobotsTag:["noindex"]}).code).toBe("header_noindex"));
  it("does not evaluate robots-blocked pages",()=>expect(calculateIndexability({...base,robotsAllowed:false}).code).toBe("robots_blocked"));
  it("recognises canonical-to-another-page",()=>expect(calculateIndexability({...base,canonicalUrl:"https://example.com/other"}).code).toBe("canonical_elsewhere"));
  it("detects missing title, description and H1",()=>{const extracted=extractHtml("<html><body><p>Small</p></body></html>","https://example.com/a","https://example.com/");const types=detectPageIssues("site","https://example.com/a",extracted,200,"indexable","service").map(issue=>issue.issueType);expect(types).toEqual(expect.arrayContaining(["missing_title","missing_meta_description","missing_h1","possible_thin_content"]))});
  it("detects duplicate titles and descriptions",()=>{const issues=detectCrossPageIssues("site",[{url:"https://example.com/a",title:"Same",description:"Same description",status:200,incoming:1,fromSitemap:false,pageType:"service"},{url:"https://example.com/b",title:"Same",description:"Same description",status:200,incoming:1,fromSitemap:false,pageType:"service"}],true);expect(issues.filter(issue=>issue.issueType==="duplicate_title")).toHaveLength(2);expect(issues.filter(issue=>issue.issueType==="duplicate_meta_description")).toHaveLength(2)});
  it("only detects possible orphans after a complete crawl",()=>{const page={url:"https://example.com/a",title:"A",description:"B",status:200,incoming:0,fromSitemap:true,pageType:"service"};expect(detectCrossPageIssues("site",[page],false)).toHaveLength(0);expect(detectCrossPageIssues("site",[page],true).some(issue=>issue.issueType==="possible_orphan")).toBe(true)});
});
