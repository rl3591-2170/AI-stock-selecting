import {activeRules,analyzeRules,type Plan,type Style} from './screener.ts';
export function planRevision(p:Plan){const text=JSON.stringify(p);let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16)}
export function workflowChecks(p:Plan,style:Style,available:string[]){
 const rules=activeRules(p,style),issues=analyzeRules([...p.fundamental,...p.trend]).filter(i=>i.kind!=='unavailable');
 const missing=[...new Set(rules.filter(r=>!available.includes(r.field)).map(r=>r.field))];
 return {issues,missing,canExecute:!issues.some(i=>i.kind==='conflict'),note:'结构校验与条件冲突由代码判断；指标无数据时保留未知，不能保证自然语言理解无误。'};
}
export function compactHistory(content:string){try{const a=JSON.parse(content);return JSON.stringify({kind:a.kind,summary:a.summary,questions:a.questions,unsupported:a.unsupported,assumptions:a.assumptions}).slice(0,6000)}catch{return null}}

// A deterministic guard for explicit Chinese MA boundaries; do not infer ambiguous targets.
export function boundarySemanticsError(prompt:string,p:Plan):string|null {
 const explicit=prompt.match(/(?:股价)?(?:站上|在线上方|高于)(?:MA)?(五|十|二十|5|10|20)(?:日均线|日线)/i);
 if(!explicit||/(?:不要|不必|取消|删除).{0,8}(?:站上|高于)/.test(prompt))return null;
 const n=({'五':'5','十':'10','二十':'20'} as Record<string,string>)[explicit[1]]||explicit[1];
 const field=n==='20'?'maDistance':`ma${n}Distance`;
 const lower=[...p.fundamental,...p.trend].filter(r=>r.field===field&&(r.op==='>'||r.op==='>='));
 if(!lower.some(r=>r.value===0&&r.op==='>'))return '“站上均线”必须使用距均线 > 0，模型返回的边界不一致。';
 return null;
}
