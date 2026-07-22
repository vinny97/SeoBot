import { isIP, type LookupFunction } from "node:net";
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import ipaddr from "ipaddr.js";
import { CrawlError } from "./errors.js";

const blockedV4=["0.0.0.0/8","10.0.0.0/8","100.64.0.0/10","127.0.0.0/8","169.254.0.0/16","172.16.0.0/12","192.0.0.0/24","192.168.0.0/16","198.18.0.0/15","224.0.0.0/4","240.0.0.0/4"].map(value=>ipaddr.parseCIDR(value));
const blockedV6=["::/128","::1/128","fc00::/7","fe80::/10","ff00::/8"].map(value=>ipaddr.parseCIDR(value));
export function isBlockedAddress(address:string){try{let parsed=ipaddr.parse(address);if(parsed.kind()==="ipv6"){const ipv6=parsed as ipaddr.IPv6;if(ipv6.isIPv4MappedAddress())parsed=ipv6.toIPv4Address()}const ranges=parsed.kind()==="ipv4"?blockedV4:blockedV6;return ranges.some(range=>parsed.match(range))}catch{return true}}
export function validateHostname(hostname:string){const lower=hostname.toLowerCase().replace(/\.$/,"");if(lower==="localhost"||lower.endsWith(".localhost")||lower.endsWith(".local")||lower==="metadata.google.internal")throw new CrawlError("private_host_blocked","The website resolves to a private or reserved host and cannot be crawled.","security_blocked");if(isIP(lower)&&isBlockedAddress(lower))throw new CrawlError("private_address_blocked","The website resolves to a private or reserved address and cannot be crawled.","security_blocked")}
export async function resolvePublicAddresses(hostname:string):Promise<LookupAddress[]>{validateHostname(hostname);let records:LookupAddress[];try{records=await lookup(hostname,{all:true,verbatim:true})}catch{throw new CrawlError("dns_failure","The website hostname could not be resolved.","transient",true)}if(!records.length||records.some(record=>isBlockedAddress(record.address)))throw new CrawlError("private_address_blocked","The website resolves to a private or reserved address and cannot be crawled.","security_blocked");return records}

export function createPublicLookup(resolver:typeof resolvePublicAddresses=resolvePublicAddresses):LookupFunction {
  return (hostname,options,callback)=>{
    const complete=callback as unknown as (...args:unknown[])=>void;
    void resolver(hostname).then(records=>{
      if(typeof options==="object"&&options.all)complete(null,records);
      else complete(null,records[0].address,records[0].family);
    }).catch(error=>complete(error));
  };
}
