import { afterEach, describe, expect, it, vi } from "vitest";
import { MonidClient } from "../lib/monid/client.js";

afterEach(()=>vi.unstubAllGlobals());

describe("Monid API client",()=>{
  it("inspects a Semrush endpoint with bearer authentication",async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:"inspect_1",provider:"semrush",endpoint:"/trends_daily",description:"Daily trends",input:{queryParams:{type:"object"}}}),{status:200,headers:{"content-type":"application/json"}}));
    vi.stubGlobal("fetch",fetchMock);
    const result=await new MonidClient("monid_live_test").inspect("semrush","/trends_daily");
    expect(result.endpoint).toBe("/trends_daily");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [,request]=fetchMock.mock.calls[0];
    expect(request.headers.Authorization).toBe("Bearer monid_live_test");
  });

  it("runs the endpoint once with query parameters",async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({runId:"run_1",provider:"semrush",endpoint:"/trends_daily",status:"COMPLETED",output:{rows:[]},providerResponse:{httpStatus:200}}),{status:200,headers:{"content-type":"application/json"}}));
    vi.stubGlobal("fetch",fetchMock);
    const result=await new MonidClient("monid_live_test").run("semrush","/trends_daily",{queryParams:{domain:"example.com"}});
    expect(result.status).toBe("COMPLETED");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({provider:"semrush",endpoint:"/trends_daily",input:{queryParams:{domain:"example.com"}}});
  });
});
