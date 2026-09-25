import assert from "node:assert/strict";
import http from "node:http";
import {PublicWebSearchProvider} from "../src/research/search-provider.js";
import {ResearchEngine} from "../src/research/research-engine.js";
import {ResearchComposer} from "../src/research/research-composer.js";
import {OneChatRouter} from "../src/onechat.js";

const fakeProvider={
 async search(q){return {state:"SUCCESS",provider:"fixture",results:[
  {title:"Official A",url:"https://example.org/a",domain:"example.org",snippet:"A"},
  {title:"Official B",url:"https://example.net/b",domain:"example.net",snippet:"B"},
  {title:"Official C",url:"https://example.edu/c",domain:"example.edu",snippet:"C"}
 ]};},
 async open(url){const n=url.endsWith("/a")?"Alpha evidence establishes the current implementation behavior and provides a concrete primary fact.":url.endsWith("/b")?"Beta evidence independently confirms the implementation behavior while documenting an important limitation.":"Gamma evidence provides a third source with current implementation details and verification context.";return {state:"SUCCESS",url,title:url,domain:new URL(url).hostname,retrievedAt:"2026-09-25T00:00:00Z",contentType:"text/html",text:n,security:{risk:"LOW"},instructionAuthority:"NONE"};}
};
const engine=new ResearchEngine({provider:fakeProvider,documentStore:null,audit:null,maxSources:3});
const run=await engine.research("implementation evidence",{depth:"deep",maxSources:3,store:false});
assert.equal(run.state,"SUCCESS");assert.equal(run.sources.length,3);assert.ok(run.evidence.length>=3);assert.equal(run.sources.every(x=>x.instruction_authority==="NONE"),true);
const composer=new ResearchComposer({modelRouter:{async generate(){return {state:"SUCCESS",text:"Evidence-backed synthesis [1] [2].",route:{selected:{id:"fixture",provider:"local"}}};}}});
const syn=await composer.compose(run);assert.equal(syn.state,"SUCCESS");assert.match(syn.message,/\[1\]/);

const privateProvider=new PublicWebSearchProvider({timeoutMs:500});
const blocked=await privateProvider.open("http://127.0.0.1:9/private");assert.equal(blocked.state,"BLOCKED");

const mem=[];
const router=new OneChatRouter({
 researchEngine:engine,researchComposer:composer,webCorpus:{status(){return {sourceClasses:1,records:0};}},
 responseComposer:{compose({contributions}){const w=contributions.find(x=>x.agent==="web-research")?.result;return {message:w?.message||"none",mode:"research",modelUsed:w?.modelUsed===true,evidence:null};}},
 store:{add(x){mem.push({...x,id:"k"+mem.length});return mem.at(-1);},list(){return mem.map(x=>({id:x.id}));},get(id){return mem.find(x=>x.id===id);}},
 audit:{append(){}},sourceRegistry:[],explorative:{chat(){return {state:"SUCCESS",message:"local"};}},knowledge:{},research:{examine(){return {state:"SUCCESS",message:"research"};}}
});
const out=await router.handle({chatId:"research-chat",message:"deep research implementation evidence"});
assert.ok(["SUCCESS","PARTIAL"].includes(out.state));assert.match(out.message,/Evidence-backed synthesis/);assert.ok(out.evidenceEnvelope.claims[0].support.length>=3);assert.equal(out.evidenceEnvelope.claims[0].status,"SUPPORTED");
console.log("v0.50.0 conversational live-research tests passed");
