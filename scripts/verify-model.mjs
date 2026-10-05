import fs from 'node:fs/promises';
const rule=(field,op,value)=>({id:field,field,op,value});const plan={fundamental:[rule('pe','<=',25)],trend:[rule('maDistance','<=',5)],industry:''};
const prompts=['我希望寻找盈利增长有持续性，而且股价最近不要太剧烈波动的公司，你会如何把这个想法拆成可检查的条件？','仅针对上半年已披露的数据，把营业收入和归母净利润同比的最低要求都设置为百分之五，其他已有条件保持原样。'];
const results=[];for(const prompt of prompts){const started=Date.now(),r=await fetch('http://127.0.0.1:5173/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,plan,style:'intersection',history:[]})});const body=await r.json();results.push({prompt,status:r.status,elapsedMs:Date.now()-started,response:body});console.log(JSON.stringify(results.at(-1)))}await fs.writeFile('work/model-validation.json',JSON.stringify(results,null,2));
