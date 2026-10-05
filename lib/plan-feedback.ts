import {fields,analyzeRules,type Plan,type Field,type Group} from './screener.ts';
import {planRevision} from './intent-workflow.ts';
import {validatePlanShape,type IntentResult} from './intent.ts';
export type PlanEdit={key:string;label:string;before:string;after:string;field?:Field;group?:Group};
export function planEdits(before:Plan,after:Plan):PlanEdit[]{
 const edits:PlanEdit[]=[];
 const scope=(p:Plan)=>[p.industry?`行业：${p.industry}`:'',p.sectors?.length?[...p.sectors].sort().join(' / '):'',p.themes?.length?`题材：${[...p.themes].sort().join(' / ')}`:''].filter(Boolean).join(' 且 ')||'全部板块';
 if(scope(before)!==scope(after))edits.push({key:'scope',label:'板块范围',before:scope(before),after:scope(after)});
 if((before.excludeST!==false)!==(after.excludeST!==false))edits.push({key:'st',label:'ST范围',before:before.excludeST===false?'包含ST':'排除ST',after:after.excludeST===false?'包含ST':'排除ST'});
 for(const group of ['fundamental','trend'] as Group[]){
  for(const field of new Set([...before[group],...after[group]].map(r=>r.field))){
   const values=(p:Plan)=>p[group].filter(r=>r.field===field).map(r=>`${r.op} ${r.value}${fields[field].unit}`).sort().join(' 且 ')||'无此条件';
   const a=values(before),b=values(after);if(a!==b)edits.push({key:`${group}-${field}`,label:fields[field].label,before:a,after:b,field,group});
  }
 }
 return edits;
}
export function confirmedProposal(answer:IntentResult,current:Plan):Plan{
 if(answer.kind!=='proposal'||!answer.plan||!validatePlanShape(answer.plan))throw Error('还没有可执行方案，请先完成澄清。');
 if(answer.baseRevision!==planRevision(current))throw Error('条件已变化，请重新解析后确认。');
 if(!answer.plan.fundamental.length||!answer.plan.trend.length||analyzeRules([...answer.plan.fundamental,...answer.plan.trend]).some(x=>x.kind==='conflict'))throw Error('方案中存在空条件组或上下限冲突，请先修正。');
 return structuredClone(answer.plan);
}
