import express from "express";
import {describe,it,expect} from "vitest";
// Exercise Express's actual proxy-addr dependency: a forged client IP must not become Coinbase clientIp.
describe("funding client IP trust boundaries",()=>{
 it.each(["::ffff:10.0.0.0/8","::/1","10.0.0.0/8"])("does not trust an unrelated IPv4 peer through subnet %s",async subnet=>{
  const app=express();app.set("trust proxy",[subnet]);app.get("/",(req,res)=>res.json({ip:req.ip}));
  const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
  try{const response=await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/`,{headers:{"x-forwarded-for":"203.0.113.9"}});expect(await response.json()).toEqual({ip:"127.0.0.1"});}
  finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
 it("honors forwarded IP only for the explicitly trusted IPv4-mapped loopback peer",async()=>{
  const app=express();app.set("trust proxy",["::ffff:127.0.0.1/128"]);app.get("/",(req,res)=>res.json({ip:req.ip}));
  const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
  try{const response=await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/`,{headers:{"x-forwarded-for":"203.0.113.9"}});expect(await response.json()).toEqual({ip:"203.0.113.9"});}
  finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
});
