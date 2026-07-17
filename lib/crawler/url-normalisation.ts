import { domainToASCII } from "node:url";
import { CrawlError } from "./errors.js";

const tracking=new Set(["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid","msclkid"]);
const risky=/^(?:sid|session|sessionid|phpsessid|jsessionid|token)$/i;
const actionPath=/(?:^|\/)(?:logout|signout|basket|cart|checkout|wp-admin|admin)(?:\/|$)/i;

export function normaliseCrawlUrl(input:string,base?:string){
  let url:URL;try{url=new URL(input,base)}catch{throw new CrawlError("invalid_url","The website URL is not valid.","permanent")}
  if(!["http:","https:"].includes(url.protocol))throw new CrawlError("unsupported_protocol","Only public HTTP and HTTPS pages can be analysed.","security_blocked");
  if(url.username||url.password)throw new CrawlError("embedded_credentials","Website URLs containing credentials are not allowed.","security_blocked");
  const ascii=domainToASCII(url.hostname.toLowerCase());if(!ascii)throw new CrawlError("invalid_hostname","The website hostname is not valid.","security_blocked");url.hostname=ascii;
  url.hash="";if((url.protocol==="http:"&&url.port==="80")||(url.protocol==="https:"&&url.port==="443"))url.port="";
  for(const key of [...url.searchParams.keys()])if(tracking.has(key.toLowerCase())||risky.test(key))url.searchParams.delete(key);
  url.searchParams.sort();url.pathname=url.pathname.replace(/\/{2,}/g,"/");if(url.pathname!=="/"&&url.pathname.endsWith("/"))url.pathname=url.pathname.slice(0,-1);
  return url.toString();
}
export function hasUnknownQueryParameters(input:string){const url=new URL(input);return [...url.searchParams.keys()].some(key=>!tracking.has(key.toLowerCase()))}
export function isUnsafeActionUrl(input:string){const url=new URL(input);return actionPath.test(url.pathname)}
