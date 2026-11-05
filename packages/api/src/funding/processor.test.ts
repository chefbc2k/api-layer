import { describe,expect,it } from "vitest";
import { assertHeadlessOrderValue, assertObservationTimestamp, chooseStatus } from "./processor.js";
import type { CoinbaseOrder } from "./provider.js";
const t=new Date("2026-10-27T00:00:00Z"),later=new Date(t.getTime()+1000),earlier=new Date(t.getTime()-1000);
const s=(value:string)=>`ONRAMP_ORDER_STATUS_${value}`;
describe("funding lifecycle ordering",()=>{
  it("accepts progress and failure without accepting pending regressions",()=>{
    expect(chooseStatus(s("PROCESSING"),s("FAILED"),t,later)).toBe(s("FAILED"));
    expect(chooseStatus(s("PROCESSING"),s("PENDING_PAYMENT"),t,later)).toBeNull();
    expect(chooseStatus(s("FAILED"),s("PROCESSING"),t,later)).toBeNull();
  });
  it("rejects stale data and preserves completion",()=>{
    expect(chooseStatus(s("PROCESSING"),s("FAILED"),t,earlier)).toBeNull();
    expect(chooseStatus(s("COMPLETED"),s("FAILED"),t,later)).toBeNull();
  });
  it("accepts late completion after failure including equal timestamp tie",()=>{
    expect(chooseStatus(s("FAILED"),s("COMPLETED"),t,later)).toBe(s("COMPLETED"));
    expect(chooseStatus(s("FAILED"),s("COMPLETED"),t,t)).toBe(s("COMPLETED"));
  });
  it.each([
    [null,"PAID"],
    ["ONRAMP_ORDER_STATUS_REFUNDED",s("PROCESSING")],
    ["ONRAMP_ORDER_STATUS_COMPLETED_SUFFIX",s("COMPLETED")],
  ])("fails closed for unknown persisted or incoming states %#",(previous,next)=>
    expect(()=>chooseStatus(previous,next,null,t)).toThrow("unsupported_status"));
  it("rejects future observations before they can pin the state machine",()=>{
    expect(()=>assertObservationTimestamp(new Date(t.getTime()+300_000),t)).not.toThrow();
    expect(()=>assertObservationTimestamp(new Date(t.getTime()+300_001),t)).toThrow("invalid_timestamp");
    expect(()=>assertObservationTimestamp(new Date("invalid"),t)).toThrow("invalid_timestamp");
  });
  it.each([
    ["purchase","9.999999",{}],
    ["purchase","10.000000",{purchaseAmount:"-10"}],
    ["payment","10.750000",{paymentTotal:"10.76"}],
    ["payment","10.750000",{fees:[{type:"fee",amount:"0.74",currency:"USD"}]}],
    ["bogus","10.000000",{}],
  ])("rejects mutated headless value conservation %#",(amountKind,requestAmount,patch)=>{
    const order={orderId:"00000000-0000-4000-8000-000000000001",partnerUserRef:"customer",status:s("PROCESSING"),updatedAt:t.toISOString(),
      destinationAddress:"0x00000000000000000000000000000000000000aa",destinationNetwork:"base",purchaseCurrency:"USDC",purchaseAmount:"10.000000",
      paymentCurrency:"USD",paymentSubtotal:"10.000000",paymentTotal:"10.750000",fees:[{type:"fee",amount:"0.750000",currency:"USD"}],...patch} as CoinbaseOrder;
    expect(()=>assertHeadlessOrderValue(order,amountKind,requestAmount)).toThrow("invalid_amount");
  });
  it.each([["purchase","10.000000"],["payment","10.750000"]])("accepts conserved %s observations",(amountKind,requestAmount)=>{
    const order={orderId:"00000000-0000-4000-8000-000000000001",partnerUserRef:"customer",status:s("PROCESSING"),updatedAt:t.toISOString(),
      destinationAddress:"0x00000000000000000000000000000000000000aa",destinationNetwork:"base",purchaseCurrency:"USDC",purchaseAmount:"10.000000",
      paymentCurrency:"USD",paymentSubtotal:"10.000000",paymentTotal:"10.750000",fees:[{type:"fee",amount:"0.750000",currency:"USD"}]} as CoinbaseOrder;
    expect(()=>assertHeadlessOrderValue(order,amountKind,requestAmount)).not.toThrow();
  });
});
