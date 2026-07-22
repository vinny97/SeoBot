export const PAGE_INTELLIGENCE_VERSION="deterministic-v1";

export type PageType="homepage"|"service"|"product"|"pricing"|"location"|"category"|"comparison"|"alternative"|"feature"|"use_case"|"blog_article"|"guide"|"faq"|"contact"|"about"|"legal"|"login"|"application"|"other"|"unknown";
export type PageIntelligenceInput={url:string;title:string|null;metaDescription:string|null;headings:Array<{level:number;text:string}>;mainContent:string;wordCount:number;structuredDataTypes:string[];indexable:boolean|null;incomingInternalLinkCount:number;outgoingInternalLinkCount:number;productsServices:string[];locations:string[];targetCustomers:string|null};
export type PageIntelligenceResult={pageType:PageType;primaryTopic:string|null;secondaryTopics:string[];searchIntent:"informational"|"commercial"|"transactional"|"navigational"|"local"|"mixed"|"unknown";funnelStage:"awareness"|"consideration"|"decision"|"retention"|"unknown";productsServices:string[];locations:string[];audienceTypes:string[];pagePurposeSummary:string;contentQualityScore:number;contentCompletenessScore:number;recommendedTargetQuery:string|null;confidence:"low"|"medium"|"high";evidence:Record<string,unknown>};
export interface PageIntelligenceAnalyzer{analyse(input:PageIntelligenceInput):Promise<PageIntelligenceResult>}

const normal=(value:string)=>value.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g," ").trim();
const contains=(haystack:string,needle:string)=>{const value=normal(needle);return value.length>2&&normal(haystack).includes(value)};
const firstHeading=(input:PageIntelligenceInput,level:number)=>input.headings.find(heading=>heading.level===level)?.text||null;
const pathSegments=(url:string)=>new URL(url).pathname.split("/").filter(Boolean).map(value=>decodeURIComponent(value).replace(/[-_]+/g," "));
const titleTopic=(input:PageIntelligenceInput)=>firstHeading(input,1)||input.title||pathSegments(input.url).at(-1)||null;

export class DeterministicPageIntelligenceAnalyzer implements PageIntelligenceAnalyzer{
  async analyse(input:PageIntelligenceInput):Promise<PageIntelligenceResult>{return analysePageDeterministically(input)}
}

export function analysePageDeterministically(input:PageIntelligenceInput):PageIntelligenceResult{
  const path=new URL(input.url).pathname.toLowerCase();const combined=[path,input.title||"",firstHeading(input,1)||"",input.metaDescription||"",...input.structuredDataTypes].join(" ");const urlSignals:string[]=[];let pageType:PageType="other";
  const signal=(type:PageType,pattern:RegExp)=>{if(pattern.test(path)){pageType=type;urlSignals.push(type);return true}return false};
  if(path==="/"||path==="")pageType="homepage";
  else if(signal("pricing",/\/(?:pricing|prices|plans?)(?:\/|$)/)||/\bpricing|plans? and pricing\b/i.test(combined))pageType="pricing";
  else if(signal("alternative",/\/(?:alternatives?)(?:\/|$)/))pageType="alternative";
  else if(signal("comparison",/\/(?:compare|comparison|versus|vs)(?:\/|$)/)||/\b(?:versus|vs\.?|compare)\b/i.test(combined))pageType="comparison";
  else if(signal("location",/\/(?:locations?|areas?|service-areas?)(?:\/|$)/))pageType="location";
  else if(signal("contact",/\/(?:contact|get-in-touch)(?:\/|$)/))pageType="contact";
  else if(signal("about",/\/(?:about|about-us|company)(?:\/|$)/))pageType="about";
  else if(signal("legal",/\/(?:privacy|terms|legal|cookies)(?:\/|$)/))pageType="legal";
  else if(signal("login",/\/(?:login|sign-in|signin|account)(?:\/|$)/))pageType="login";
  else if(input.structuredDataTypes.some(type=>/Product/i.test(type))||signal("product",/\/products?(?:\/|$)/))pageType="product";
  else if(input.structuredDataTypes.some(type=>/(?:Article|BlogPosting|NewsArticle)/i.test(type))||/\/(?:blog|news)\/.+/.test(path))pageType="blog_article";
  else if(signal("guide",/\/(?:guides?|resources?|learn)(?:\/|$)/))pageType="guide";
  else if(signal("faq",/\/(?:faq|frequently-asked-questions)(?:\/|$)/))pageType="faq";
  else if(signal("use_case",/\/(?:use-cases?|industries)(?:\/|$)/))pageType="use_case";
  else if(signal("feature",/\/(?:features?)(?:\/|$)/))pageType="feature";
  else if(signal("service",/\/(?:services?|solutions?)(?:\/|$)/)||/\bservice|solution\b/i.test(combined))pageType="service";
  else if(signal("category",/\/(?:category|categories)(?:\/|$)/))pageType="category";
  else if(/\/(?:app|dashboard)(?:\/|$)/.test(path))pageType="application";
  const matchedOfferings=input.productsServices.filter(offering=>contains(combined+" "+input.mainContent.slice(0,4000),offering));const matchedLocations=input.locations.filter(location=>contains(combined+" "+input.mainContent.slice(0,4000),location));
  if(pageType==="other"&&matchedOfferings.length)pageType="service";if(pageType==="other"&&matchedLocations.length)pageType="location";
  const commercial=["pricing","service","product","comparison","alternative","feature","use_case","category"].includes(pageType);const transactional=["pricing","contact","product"].includes(pageType);const informational=["blog_article","guide","faq"].includes(pageType);const local=pageType==="location"||matchedLocations.length>0;
  const searchIntent=local?"local":transactional?"transactional":commercial?"commercial":informational?"informational":["login","application"].includes(pageType)?"navigational":"unknown";
  const funnelStage=transactional?"decision":commercial?"consideration":informational?"awareness":"unknown";const primaryTopic=matchedOfferings[0]||titleTopic(input);const secondaryTopics=[...new Set([...matchedOfferings.slice(1),...input.headings.filter(heading=>heading.level===2).map(heading=>heading.text)])].slice(0,8);
  const hasTitle=Boolean(input.title);const hasH1=Boolean(firstHeading(input,1));const hasMeta=Boolean(input.metaDescription);const appropriateLength=input.wordCount>=120;const linkCoverage=input.outgoingInternalLinkCount>0;const base=[hasTitle,hasH1,hasMeta,appropriateLength,linkCoverage].filter(Boolean).length;const contentQualityScore=Math.round(base/5*100);const expectedWords=informational?700:commercial?350:150;const completenessSignals=[input.wordCount>=expectedWords,hasTitle,hasH1,hasMeta,input.headings.some(heading=>heading.level===2),input.outgoingInternalLinkCount>=2];const contentCompletenessScore=Math.round(completenessSignals.filter(Boolean).length/completenessSignals.length*100);
  const confidenceSignals=urlSignals.length+(matchedOfferings.length?1:0)+(matchedLocations.length?1:0)+(input.structuredDataTypes.length?1:0)+(hasTitle&&hasH1?1:0);const confidence=confidenceSignals>=3?"high":confidenceSignals>=1?"medium":"low";
  const audienceTypes=input.targetCustomers?[input.targetCustomers]:[];const purpose=pageType==="homepage"?"Introduce the business and guide visitors to its main offerings.":pageType==="pricing"?`Explain costs and help visitors compare ${matchedOfferings[0]||"available options"}.`:informational?`Explain ${primaryTopic||"the topic"} for prospective customers.`:commercial?`Help prospective customers evaluate ${primaryTopic||"this offering"}.`:`Provide information about ${primaryTopic||"this page"}.`;
  return{pageType,primaryTopic,secondaryTopics,searchIntent,funnelStage,productsServices:matchedOfferings,locations:matchedLocations,audienceTypes,pagePurposeSummary:purpose,contentQualityScore,contentCompletenessScore,recommendedTargetQuery:primaryTopic,confidence,evidence:{title:input.title,h1:firstHeading(input,1),urlSignals,matchedOffering:matchedOfferings[0]||null,matchedLocation:matchedLocations[0]||null,schemaTypes:input.structuredDataTypes,indexable:input.indexable,wordCount:input.wordCount,incomingInternalLinks:input.incomingInternalLinkCount,outgoingInternalLinks:input.outgoingInternalLinkCount,classificationMethod:"deterministic"}};
}
