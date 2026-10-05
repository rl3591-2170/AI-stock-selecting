import test from 'node:test';
import assert from 'node:assert/strict';
import {shortTermIndicators} from '../lib/indicators.ts';
import {interpretIntent,scopeSemanticsError,validatePlanShape} from '../lib/intent.ts';
import {initialPlan,rule,runPlan,planChanges,type Stock} from '../lib/screener.ts';
import {themes,stockThemes} from '../lib/universe.ts';
const parse=(text:string,plan=initialPlan)=>interpretIntent(text,plan,'intersection',[])!;
const candles=(c:number[])=>c.map(close=>({close,high:close+1,low:close-1,volume:100}));
test('Wilder ATR and RSI: flat, rising, falling, gap and invalid history',()=>{
 const flat=shortTermIndicators(candles(Array(65).fill(100)));assert.equal(flat.atr14Pct,2);assert.equal(flat.rsi14,50);assert.equal(flat.cross5In3,0);
 const rising=shortTermIndicators(candles(Array.from({length:65},(_,i)=>100+i)));assert.equal(rising.rsi14,100);assert.equal(rising.cross5In3,0);assert.ok(rising.ma5Distance!>0);
 assert.equal(shortTermIndicators(candles(Array.from({length:65},(_,i)=>200-i))).rsi14,0);
 const gap=shortTermIndicators(candles([...Array(64).fill(100),110]));assert.ok(Math.abs(gap.atr14Pct!-(2*13+11)/14/110*100)<1e-10);assert.equal(gap.cross5In3,1);
 assert.throws(()=>shortTermIndicators(candles([1,2])));
});
test('cross event is not standing above, and cross may precede a fall back below',()=>{
 const data=shortTermIndicators(candles([...Array(62).fill(100),110,100,90]));assert.equal(data.cross5In3,1);assert.ok(data.ma5Distance!<0);
 const cross=parse('近日上穿5日线'),above=parse('站上5日线');assert.ok(cross.plan!.trend.some(r=>r.field==='cross5In3'));assert.ok(above.plan!.trend.some(r=>r.field==='ma5Distance'&&r.op==='>'));
});
test('theme union is distinct from industry and preserves other rules',()=>{
 const a=parse('只看半导体或PCB，PE不超过80');assert.equal(a.kind,'proposal');assert.deepEqual(a.plan!.themes,['半导体','PCB']);assert.equal(a.plan!.industry,initialPlan.industry);assert.deepEqual(a.plan!.trend,initialPlan.trend);assert.ok(a.plan!.fundamental.some(r=>r.field==='pe'&&r.value===80));assert.equal(themes.length,11);assert.ok(stockThemes('003021').includes('人形机器人'));
});
test('clarification retains the other clauses through multiple rounds',()=>{
 const first=parse('只看存储，更稳一点，机构活跃度在2和5之间');assert.equal(first.kind,'clarify');assert.equal(first.plan,undefined);assert.equal(first.questions.length,2);
 const second=parse(first.questions[0].options[0].message);assert.equal(second.kind,'clarify');
 const third=parse(second.questions[0].options[0].message);assert.equal(third.kind,'proposal');assert.deepEqual(third.plan!.themes,['存储']);assert.ok(third.plan!.trend.some(r=>r.field==='volatility'&&r.value===25));assert.deepEqual(third.plan!.trend.filter(r=>r.field==='institutionDays').map(r=>r.value),[2,5]);
});
test('negative upper bound relaxation increases bound instead of tightening',()=>{const p={...initialPlan,trend:[rule('maDistance','<=',-5)]};const a=parse('均线距离放宽一点',p);assert.equal(a.kind,'clarify');assert.match(a.questions[0].options[0].message,/-4/)});
test('theme shape rejects unknown tags and ST filtering is explicit and reversible',()=>{
 assert.equal(validatePlanShape({...initialPlan,themes:['不存在']}),false);assert.equal(validatePlanShape({...initialPlan,themes:['PCB','PCB']}),false);
 const stock={code:'600363',name:'ST联光',industry:'电子',metrics:{pe:10},errors:[],sources:{},prices:[],evidencePath:''} as Stock;
 const p={...initialPlan,fundamental:[rule('pe','>',0)]};assert.equal(runPlan([stock],p,'fundamental').length,0);assert.equal(runPlan([stock],{...p,excludeST:false},'fundamental').length,1);assert.ok(planChanges(p,{...p,excludeST:false})[0].includes('ST'));
});
test('typo CBO requires clarification rather than silently reclassifying',()=>assert.equal(parse('只看CBO').kind,'clarify'));

test('model theme OR cannot masquerade as industry AND theme',()=>{assert.ok(scopeSemanticsError('只看半导体或PCB',initialPlan,{...initialPlan,industry:'半导体',themes:['PCB']}));assert.equal(scopeSemanticsError('只看半导体或PCB',initialPlan,{...initialPlan,themes:['半导体','PCB']}),null)});
