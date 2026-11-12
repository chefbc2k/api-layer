import express from "express";
import {createRequire} from "node:module";
import {gzipSync} from "node:zlib";
import {describe,it,expect,vi} from "vitest";
import {createFundingWebhookRouter} from "./webhook.js";
const require=createRequire(import.meta.url);
// Resolve the HTTP client actually used below the installed Coinbase SDK, not an unrelated root copy.
const axios=createRequire(require.resolve("@coinbase/cdp-sdk"))("axios") as {
 post(url:string,body:unknown,config?:unknown):Promise<{data:unknown;status:number}>;
 get(url:string,config?:unknown):Promise<{data:unknown;status:number}>;
};
async function listen(app:ReturnType<typeof express>){const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));return{base:`http://127.0.0.1:${(server.address() as {port:number}).port}`,close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};}
describe("patched funding HTTP dependencies",()=>{
 it("preserves SDK HTTP JSON, method/path and headers and honors disabled redirects",async()=>{
  const app=express();app.use(express.json());app.post("/order",(req,res)=>res.json({method:req.method,path:req.path,body:req.body,authorization:req.header("authorization")}));app.get("/redirect",(_req,res)=>res.redirect("/unexpected"));let unexpected=0;app.get("/unexpected",(_req,res)=>{unexpected++;res.sendStatus(200);});
  const server=await listen(app);try{expect((await axios.post(server.base+"/order",{amount:"10.000001"},{headers:{authorization:"Bearer local-test"}})).data).toEqual({method:"POST",path:"/order",body:{amount:"10.000001"},authorization:"Bearer local-test"});await expect(axios.get(server.base+"/redirect",{maxRedirects:0})).rejects.toThrow();expect(unexpected).toBe(0);}finally{await server.close();}
 });
 it("honors the configured HTTP/2 DNS lookup control before opening a connection",async()=>{
  const lookup=vi.fn((_hostname:unknown,_options:unknown,callback:(error:Error)=>void)=>callback(new Error("blocked-by-local-lookup")));
  await expect(axios.get("http://funding-check.invalid:1/",{httpVersion:2,lookup,timeout:1000,proxy:false})).rejects.toThrow("blocked-by-local-lookup");expect(lookup).toHaveBeenCalled();
 });
 it("accepts valid gzip JSON and survives trailing compressed-body garbage",async()=>{
  const app=express();app.use(express.json());app.post("/",(req,res)=>res.json(req.body));app.get("/health",(_req,res)=>res.sendStatus(200));app.use((error:{status?:number},_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(error.status??500).json({error:"rejected"});});
  const server=await listen(app);try{
   const compressed=gzipSync(Buffer.from('{"amount":"10.000001"}'));
   const post=(body:Buffer)=>fetch(server.base+"/",{method:"POST",headers:{"content-type":"application/json","content-encoding":"gzip"},body,signal:AbortSignal.timeout(2000)});
   expect(await(await post(compressed)).json()).toEqual({amount:"10.000001"});expect((await post(Buffer.concat([compressed,Buffer.from("invalid-tail")]))).status).toBe(400);expect((await fetch(server.base+"/health")).status).toBe(200);
  }finally{await server.close();}
 });
 it("rejects compressed webhooks before enqueue so signature verification always sees original raw bytes",async()=>{
  const enqueue=vi.fn();const app=express();app.use(createFundingWebhookRouter({API_LAYER_FUNDING_WEBHOOK_ENABLED:"true",API_LAYER_FUNDING_WEBHOOK_SECRET:"local-test-secret-0001",SUPABASE_DB_URL:"postgresql://localhost/test"},{enqueue}));app.use((error:{status?:number},_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(error.status??500).end();});
  const server=await listen(app);try{const result=await fetch(server.base+"/v1/webhooks/coinbase/onramp",{method:"POST",headers:{"content-type":"application/json","content-encoding":"gzip"},body:gzipSync(Buffer.from("{}"))});expect(result.status).toBe(415);expect(enqueue).not.toHaveBeenCalled();}finally{await server.close();}
 });
});
