import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {initialPlan} from '../lib/screener.ts';
const bundled=await build({entryPoints:['app/api/interpret/route.ts'],bundle:true,write:false,platform:'node',format:'esm',target:'node24'});
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const input=(prompt,extra={})=>new Request('https://local.test/api/interpret',{method:'POST',body:JSON.stringify({prompt,plan:initialPlan,style:'trend',...extra})});
const env=['LLM_API_KEY','LLM_BASE_URL','LLM_MODEL'];const saved=env.map(k=>process.env[k]);
for(const k of env)delete process.env[k];
test('API: local parsing, clarification continuation, malformed request, compliance and no model',async()=>{
 const a=await POST(input('PE上限设为20'));assert.equal(a.status,200);assert.equal((await a.json()).mode,'local');
 const b=await POST(input('机构活跃度'));const q=await b.json();assert.equal(q.kind,'clarify');
 const c=await POST(input('第一个',{history:[{role:'assistant',content:JSON.stringify(q)}]}));const q2=await c.json();assert.equal(q2.kind,'clarify');
 const d=await POST(input('2到6',{history:[{role:'assistant',content:JSON.stringify(q2)}]}));const p=await d.json();assert.equal(p.kind,'proposal');assert.deepEqual(p.plan.fundamental.filter(r=>r.field==='institutionDays').map(r=>r.value),[2,6]);
 assert.equal((await POST(input('行业龙头且竞争优势可持续'))).status,503);
 assert.equal((await POST(input('保证收益'))).status,422);
 assert.equal((await POST(new Request('https://local.test',{method:'POST',body:'{broken'}))).status,400);
 assert.equal((await POST(input('PE上限设为20',{plan:{}}))).status,400);
});
test('API: mocked model errors and output validation preserve rules',async()=>{
 process.env.LLM_API_KEY='mock-test-only';process.env.LLM_BASE_URL='https://mock.invalid/v1';process.env.LLM_MODEL='mock';const original=globalThis.fetch;
 try{
 globalThis.fetch=async()=>new Response('{}',{status:429});assert.equal((await POST(input('帮我观察经营韧性'))).status,502);
 globalThis.fetch=async()=>Response.json({choices:[{message:{content:'not-json'}}]});assert.equal((await POST(input('帮我观察经营韧性'))).status,502);
 globalThis.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify({kind:'proposal',summary:'mock invalid',plan:initialPlan,questions:[{text:'未澄清',options:[]}],unsupported:[],assumptions:[]})}}]});assert.equal((await POST(input('帮我观察经营韧性'))).status,502);
 globalThis.fetch=async()=>Response.json({choices:[{message:{content:JSON.stringify({kind:'proposal',summary:'mock valid',plan:initialPlan,questions:[],unsupported:[],assumptions:[]})}}]});const good=await POST(input('帮我观察经营韧性'));assert.equal(good.status,200);assert.equal((await good.json()).mode,'model');
 }finally{globalThis.fetch=original;env.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i]})}
});
test('evidence route bounds inputs and does not pretend missing providers succeeded',async()=>{
 const source=await build({entryPoints:['app/api/stock-evidence/route.ts'],bundle:true,write:false,platform:'node',format:'esm',target:'node24'});
 const route=await import('data:text/javascript;base64,'+Buffer.from(source.outputFiles[0].text).toString('base64'));
 const req=body=>new Request('https://local.test/api/stock-evidence',{method:'POST',body:JSON.stringify(body)});
 assert.equal((await route.POST(req(null))).status,400);
 assert.equal((await route.POST(req({code:'not-in-universe',provider:'fuyao'}))).status,400);
 const old=process.env.IFIND_API_TOKEN;delete process.env.IFIND_API_TOKEN;
 try{const r=await route.POST(req({code:'600519',provider:'ifind'}));assert.equal(r.status,502);assert.match((await r.json()).error,/IFIND_NOT_CONFIGURED/)}finally{if(old!==undefined)process.env.IFIND_API_TOKEN=old}
});
