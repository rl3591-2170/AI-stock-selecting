import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fields,initialPlan,rule,runPlan,type Stock} from '../lib/screener.ts';
import {planRevision,workflowChecks,compactHistory,boundarySemanticsError} from '../lib/intent-workflow.ts';
import {completedDayCutoff,latestDisclosed} from '../lib/official-data.ts';
import {interpretIntent} from '../lib/intent.ts';
test('Worker cold-start import does not generate random values or perform IO',()=>{
 const probe="Object.defineProperty(globalThis,'crypto',{value:{randomUUID(){throw Error('RANDOM_AT_GLOBAL_SCOPE')}}});globalThis.fetch=()=>{throw Error('IO_AT_GLOBAL_SCOPE')};await import('./lib/screener.ts');await import('./lib/official-data.ts');";
 const p=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',probe],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);
});
test('medium horizon fields belong to value; swing defaults exclusively short horizon',()=>{
 for(const k of ['maSpread','maSlope','maDistance','return20','volatility','drawdown'] as const)assert.equal(fields[k].group,'fundamental');
 assert.ok(initialPlan.trend.every(r=>fields[r.field].group==='trend'));assert.ok(initialPlan.fundamental.every(r=>fields[r.field].group==='fundamental'));
});
test('unified industry plus theme scopes are a union without hidden industry AND',()=>{
 const stock=(code:string,industry:string)=>({code,industry,name:'测试',metrics:{pe:10},errors:[],sources:{},prices:[],evidencePath:''}) as Stock;
 const p={...initialPlan,sectors:['PCB','银行'],fundamental:[rule('pe','>',0)]};assert.deepEqual(runPlan([stock('002463','元件'),stock('600036','银行'),stock('600519','白酒')],p,'fundamental').map(r=>r.stock.code),['002463','600036']);
 const a=interpretIntent('只看PCB或银行',initialPlan,'fundamental',['银行'])!;assert.deepEqual(a.plan!.sectors,['PCB','银行']);assert.equal(a.plan!.industry,'');
});
test('Shanghai incomplete session is excluded; financial disclosures cannot look ahead',()=>{
 assert.equal(completedDayCutoff(Date.parse('2026-10-09T14:00:00+08:00')),'2026-10-08');assert.equal(completedDayCutoff(Date.parse('2026-10-09T16:00:00+08:00')),'2026-10-09');
 const r=(date:string,end:string)=>({thscode:'TEST',currency:'CNY',report_date_ms:Date.parse(date),period_end_ms:Date.parse(end)});
 assert.equal(latestDisclosed([r('2026-10-15','2026-09-30'),r('2026-08-20','2026-06-30')],'TEST','2026-09-30').length,1);
});
test('rule revisions change with values and workflow separates conflicts from missing data',()=>{
 const p={...initialPlan,trend:[rule('ma5Distance','>',5),rule('ma5Distance','<=',3)]};assert.notEqual(planRevision(p),planRevision(initialPlan));assert.equal(workflowChecks(p,'trend',[]).canExecute,false);assert.deepEqual(workflowChecks(p,'trend',[]).missing,['ma5Distance']);assert.equal(compactHistory('invalid JSON'),null);
});

test('conflicts in the other model and impossible bounded domains block adoption',()=>{
 const p={...initialPlan,fundamental:[rule('pe','>=',80),rule('pe','<=',30)]};
 assert.equal(workflowChecks(p,'trend',[]).canExecute,false);
 assert.equal(workflowChecks({...initialPlan,trend:[rule('rsi14','>',100)]},'trend',[]).canExecute,false);
 assert.equal(workflowChecks({...initialPlan,trend:[rule('institution5Days','>=',6)]},'trend',[]).canExecute,false);
});
test('explicit standing above a moving average cannot silently include equality',()=>{
 const p={...initialPlan,trend:[rule('ma5Distance','>=',0)]};
 assert.ok(boundarySemanticsError('股价站上五日均线，但偏离不要超过百分之三',p));
 assert.equal(boundarySemanticsError('股价站上五日均线',{...p,trend:[rule('ma5Distance','>',0)]}),null);
});
