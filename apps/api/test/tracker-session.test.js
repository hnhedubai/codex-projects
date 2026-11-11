import assert from "node:assert/strict";
import test from "node:test";
import { createTrackerSession } from "../src/tracker-session.js";
import { createTrackerHttpHandler } from "../src/tracker-http.js";

function setup(session) {
  let reads = 0, writes = 0, verifications = 0;
  const authenticate = createTrackerSession({baseUrl:"https://auth.example.test/auth",authRequest:async (_base,request,path)=>{
    verifications++;
    assert.equal(path,"get-session");
    assert.equal(new URL(request.url).searchParams.get("disableCookieCache"),"true");
    return Response.json(session);
  }});
  const handler = createTrackerHttpHandler({authenticate,tracker:{
    listProjects: async()=>{reads++;return [{name:"Oman"}];},
    createProject: async input=>{writes++;return input;},
  }});
  return { handler, counts:()=>({reads,writes,verifications}) };
}
const active={user:{id:"user-1",emailVerified:true},session:{expiresAt:new Date(Date.now()+60000).toISOString()}};
function request({cookie=true,method="GET",origin="http://localhost:9500"}={}) {
  return new Request("http://localhost:9500/v1/projects",{method,headers:{...(cookie?{cookie:"session=fixture"}:{}),origin,"content-type":"application/json"},...(method==="POST"?{body:JSON.stringify({name:"Oman",countryIso2:"OM"})}:{})});
}
test("verified signed-in users can load and write the tracker through session authentication",async()=>{
  const {handler,counts}=setup(active);
  assert.equal((await handler.fetch(request())).status,200);
  assert.equal((await handler.fetch(request({method:"POST"}))).status,201);
  assert.deepEqual(counts(),{reads:1,writes:1,verifications:2});
});
for(const [label,session] of [["revoked",null],["expired",{...active,session:{expiresAt:"2020-01-01"}}],["unverified",{...active,user:{id:"user-1",emailVerified:false}}],["invalid expiry",{...active,session:{expiresAt:"invalid"}}]]) {
  test(`${label} sessions cannot read tracker data`,async()=>{
    const {handler,counts}=setup(session);
    assert.equal((await handler.fetch(request())).status,401);
    assert.equal(counts().reads,0);
  });
}
test("signed-out requests and cross-origin writes never reach storage",async()=>{
  const {handler,counts}=setup(active);
  assert.equal((await handler.fetch(request({cookie:false}))).status,401);
  assert.equal((await handler.fetch(request({method:"POST",origin:"https://attacker.example"}))).status,401);
  assert.deepEqual(counts(),{reads:0,writes:0,verifications:0});
});
