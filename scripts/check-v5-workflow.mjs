import assert from 'node:assert/strict';
import {initialPlan} from '../lib/screener.ts';
import {writeFileSync} from 'node:fs';
const cases=[['只看PCB或银行，PE不超过40','proposal'],['只看存储，更稳一点，机构活跃度在1到3之间','clarify'],['只调整波段模型：股价站上五日均线，但偏离不要超过百分之三，其余条件保留。','boundary'],['连续三个季度利润加速增长','unsupported'],['把市盈率设成二十到四十倍，别改其他要求。','proposal'],['PE至少80，PE不超过30','conflict'],['3天内保证赚钱','rejected']];
const output=[];
for(const [prompt,expect] of cases){const r=await fetch('http://127.0.0.1:5173/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,plan:initialPlan,style:'trend',history:[],availableFields:[]})});const a=await r.json();
 if(expect==='boundary'){assert.ok(r.status===422&&a.code==='BOUNDARY_SEMANTICS_MISMATCH'||r.ok&&a.plan.trend.some(x=>x.field==='ma5Distance'&&x.op==='>'&&x.value===0));}
 else if(expect==='conflict'){assert.equal(a.trace.checks.canExecute,false)}
 else if(expect==='rejected'){assert.equal(r.status,422)}else{assert.equal(a.kind,expect)}
 output.push({prompt,status:r.status,response:a});console.log({status:r.status,expected:expect,mode:a.mode,kind:a.kind,code:a.code,checks:a.trace?.checks?.canExecute});
}writeFileSync('work/v5-workflow-checked.json',JSON.stringify(output,null,2));
