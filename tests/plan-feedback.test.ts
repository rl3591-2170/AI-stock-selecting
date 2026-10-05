import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPlan,rule} from '../lib/screener.ts';
import {planRevision} from '../lib/intent-workflow.ts';
import {confirmedProposal,planEdits} from '../lib/plan-feedback.ts';
import type {IntentResult} from '../lib/intent.ts';
const proposal=(plan=structuredClone(initialPlan)):IntentResult=>({kind:'proposal',plan,baseRevision:planRevision(initialPlan),summary:'修改',changes:[],questions:[],unsupported:[],assumptions:[],mode:'local'});
test('confirm returns proposed plan, rejects stale proposal and does not mutate either draft',()=>{
 const a=proposal();a.plan!.sectors=['半导体'];const next=confirmedProposal(a,initialPlan);assert.deepEqual(next.sectors,['半导体']);next.sectors!.push('PCB');assert.deepEqual(a.plan!.sectors,['半导体']);assert.throws(()=>confirmedProposal(a,{...initialPlan,sectors:['PCB']}),/已变化/);
});
test('clarification and contradictory boundaries cannot be executed',()=>{
 assert.throws(()=>confirmedProposal({...proposal(),kind:'clarify'},initialPlan),/澄清/);
 const a=proposal();a.plan!.fundamental=[rule('pe','>=',80),rule('pe','<=',20)];assert.throws(()=>confirmedProposal(a,initialPlan),/冲突/);
 const empty=proposal();empty.plan!.trend=[];assert.throws(()=>confirmedProposal(empty,initialPlan),/空条件组/);
});
test('diff ignores rule ids, combines bounds and exposes scope plus removals',()=>{
 const a=structuredClone(initialPlan);a.fundamental=a.fundamental.map(r=>({...r,id:r.id+'new'}));assert.deepEqual(planEdits(initialPlan,a),[]);
 a.sectors=['半导体'];a.fundamental=a.fundamental.filter(r=>r.field!=='pe');const edits=planEdits(initialPlan,a);assert.equal(edits.find(e=>e.key==='scope')?.after,'半导体');assert.equal(edits.find(e=>e.field==='pe')?.after,'无此条件');
});
