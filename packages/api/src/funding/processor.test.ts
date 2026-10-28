import { describe,expect,it } from "vitest";
import { chooseStatus } from "./processor.js";
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
  it("rejects unknown states",()=>expect(()=>chooseStatus(null,"PAID",null,t)).toThrow("unsupported_status"));
});
