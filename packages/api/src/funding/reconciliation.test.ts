import {describe,it,expect,vi} from "vitest";
import {CoinbaseFundingProvider} from "./provider.js";
import {validateHealthSettings} from "./reconciliation.js";
const id="11111111-1111-4111-8111-111111111111";
const config={mode:"sandbox" as const,apiKeyId:"fixture",apiKeySecret:"fixture",origins:["https://app.example"],databaseUrl:"postgresql://unused"};
describe("reconciliation provider boundary",()=>{
  it("binds JWT method/host/path and paginates without accepting arbitrary hosts",async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({transactions:[],next_page_key:"next/=?secret"})));
    const sign=vi.fn().mockResolvedValue("fixture-jwt");
    const provider=new CoinbaseFundingProvider(config,fetcher,sign);
    expect((await provider.transactions("sandbox-reference","prior/?" )).next_page_key).toBe("next/=?secret");
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({requestMethod:"GET",requestHost:"api.developer.coinbase.com",requestPath:"/onramp/v1/buy/user/sandbox-reference/transactions"}));
    const url=new URL(String(fetcher.mock.calls[0][0]));expect(url.searchParams.get("pageKey")).toBe("prior/?");expect(url.searchParams.get("pageSize")).toBe("100");
    await expect(provider.transactions("../other")).rejects.toThrow();
  });
  it("only reads subscription state and strips secrets from its response",async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({subscriptionId:id,isEnabled:true,eventTypes:[],target:{url:"https://api.example/v1/webhooks/coinbase/onramp",method:"POST"},secret:"never-return",metadata:{secret:"never-return"}})));
    const sign=vi.fn().mockResolvedValue("fixture-jwt");
    const result=await new CoinbaseFundingProvider(config,fetcher,sign).subscription(id);
    expect(JSON.stringify(result)).not.toContain("never-return");expect(sign).toHaveBeenCalledWith(expect.objectContaining({requestMethod:"GET",requestPath:`/platform/v2/data/webhooks/subscriptions/${id}`}));
    expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
  });
  it.each(["http://api.example/v1/webhooks/coinbase/onramp","https://user:password@api.example/v1/webhooks/coinbase/onramp","https://api.example/other","https://api.example/v1/webhooks/coinbase/onramp?token=x"])("rejects invalid health callback settings %s",webhookUrl=>expect(()=>validateHealthSettings({webhookUrl})).toThrow());
  it("accepts an exact HTTPS receiver and rejects non-UUID subscriptions",()=>{
    expect(()=>validateHealthSettings({subscriptionId:id,webhookUrl:"https://api.example/v1/webhooks/coinbase/onramp"})).not.toThrow();
    expect(()=>validateHealthSettings({subscriptionId:"../other"})).toThrow();
  });
});
