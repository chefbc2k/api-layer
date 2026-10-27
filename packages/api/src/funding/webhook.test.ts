import { createHmac } from "node:crypto";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFundingWebhookRouter, verifyWebhook } from "./webhook.js";
const secret = "disposable-webhook-secret";
const body = Buffer.from('{ "data": { "status":"COMPLETED" } }');
const headers = { "content-type": "application/json", "x-event-id": "event-1", "x-event-type": "onramp.transaction.updated" };
function signature(raw = body, timestamp = Math.floor(Date.now()/1000), names = "content-type x-event-id x-event-type") {
  const values = names.split(" ").map(name => headers[name as keyof typeof headers]).join(".");
  return `t=${timestamp},h=${names},v1=${createHmac("sha256",secret).update(`${timestamp}.${names}.${values}.`).update(raw).digest("hex")}`;
}
afterEach(() => vi.restoreAllMocks());
describe("Coinbase raw webhook verification", () => {
  it("verifies signed bytes and required headers", () => {
    expect(verifyWebhook(body,signature(),secret,headers)).toBe(true);
    expect(verifyWebhook(Buffer.from(JSON.stringify(JSON.parse(body.toString()))),signature(),secret,headers)).toBe(false);
    expect(verifyWebhook(body,signature(),secret,{ ...headers,"x-event-id":"forged" })).toBe(false);
    expect(verifyWebhook(body,signature(),"wrong",headers)).toBe(false);
  });
  it("rejects stale and future timestamps and unsigned identities", () => {
    expect(verifyWebhook(body,signature(body,Math.floor(Date.now()/1000)-301),secret,headers)).toBe(false);
    expect(verifyWebhook(body,signature(body,Math.floor(Date.now()/1000)+301),secret,headers)).toBe(false);
    expect(verifyWebhook(body,signature(body,undefined,"content-type"),secret,headers)).toBe(false);
  });
  it.each([undefined,"","t=1,h=content-type,v1=x","t=1234567890,t=1234567890,v1=abc","v0=abc"])("rejects malformed signatures %s", value => {
    expect(verifyWebhook(body,value,secret,headers)).toBe(false);
  });
  it("rejects deterministic body, identity, timestamp, header-list, and MAC mutations", () => {
    const now = Date.now();
    const timestamp = Math.floor(now / 1000);
    const valid = signature(body, timestamp);
    const mutations: Array<[string, Buffer, string | undefined, Record<string, string | string[] | undefined>, number]> = [
      ["body byte", Buffer.concat([body.subarray(0, body.length - 1), Buffer.from("!")]), valid, headers, now],
      ["event id", body, valid, { ...headers, "x-event-id": "event-2" }, now],
      ["event type", body, valid, { ...headers, "x-event-type": "onramp.transaction.failed" }, now],
      ["content type", body, valid, { ...headers, "content-type": "text/plain" }, now],
      ["missing signed header", body, valid, { ...headers, "x-event-id": undefined }, now],
      ["duplicate transport header", body, valid, { ...headers, "x-event-id": ["event-1", "event-2"] }, now],
      ["stale timestamp", body, valid, headers, now + 301_000],
      ["future timestamp", body, valid, headers, now - 301_000],
      ["duplicate signed name", body, signature(body, timestamp, "content-type x-event-id x-event-id x-event-type"), headers, now],
      ["missing identity name", body, signature(body, timestamp, "content-type x-event-type"), headers, now],
      ["uppercase signed name", body, valid.replace("content-type", "Content-Type"), headers, now],
      ["duplicate timestamp field", body, `${valid},t=${timestamp}`, headers, now],
      ["duplicate MAC field", body, `${valid},v1=${"0".repeat(64)}`, headers, now],
      ["uppercase MAC", body, valid.replace(/v1=([a-f0-9]+)/, (_match, mac: string) => `v1=${mac.toUpperCase()}`), headers, now],
      ["short MAC", body, valid.replace(/v1=[a-f0-9]+/, "v1=00"), headers, now],
      ["extra separator", body, `${valid},`, headers, now],
    ];

    for (const [label, mutatedBody, mutatedSignature, mutatedHeaders, mutatedNow] of mutations) {
      expect(verifyWebhook(mutatedBody, mutatedSignature, secret, mutatedHeaders, mutatedNow), label).toBe(false);
    }
  });
  it("mounts before JSON, acknowledges only after durable enqueue, and redacts errors", async () => {
    const enqueue = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("secret database failure"));
    const app=express();
    app.use(createFundingWebhookRouter({ API_LAYER_FUNDING_WEBHOOK_ENABLED:"true", API_LAYER_FUNDING_WEBHOOK_SECRET:secret, SUPABASE_DB_URL:"postgresql://localhost/test" },{enqueue}));
    app.use(express.json());
    const server=app.listen(0,"127.0.0.1");
    await new Promise<void>(resolve=>server.once("listening",resolve));
    const address=server.address() as {port:number};
    const send = (value=signature())=>fetch(`http://127.0.0.1:${address.port}/v1/webhooks/coinbase/onramp`,{ method:"POST",headers:{...headers,"x-webhook-signature":value},body });
    try {
      expect((await send("invalid")).status).toBe(401); expect(enqueue).not.toHaveBeenCalled();
      expect(await (await send()).json()).toEqual({received:true,duplicate:false});
      expect(enqueue.mock.calls[0][3]).toEqual(body);
      expect(await (await send()).json()).toEqual({received:true,duplicate:true});
      const failed=await send(); expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("secret");
    } finally { server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())); }
  });
});
