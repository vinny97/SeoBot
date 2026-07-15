import { describe,expect,it } from "vitest";
import { normaliseWebsiteUrl } from "@/lib/utils";
import { isPrivateAddress } from "@/lib/services/website-security";

describe("website URL safety",()=>{
  it("normalises a public domain",()=>expect(normaliseWebsiteUrl("www.Example.com/path?q=1#part")).toEqual({url:"https://www.example.com/path",domain:"example.com"}));
  it.each(["localhost","127.0.0.1","10.0.0.2","192.168.1.5","172.20.1.1","[::1]"])("rejects private or local address %s",value=>expect(()=>normaliseWebsiteUrl(value)).toThrow("public website"));
  it.each(["not a domain","https://","ftp://example.com"])("rejects invalid input %s",value=>expect(()=>normaliseWebsiteUrl(value)).toThrow());
  it.each(["127.0.0.1","10.2.3.4","172.31.2.3","192.168.0.1","169.254.1.1","::1","fd00::1"])("recognises private IP %s",value=>expect(isPrivateAddress(value)).toBe(true));
  it("does not classify a public IPv4 address as private",()=>expect(isPrivateAddress("93.184.216.34")).toBe(false));
});
