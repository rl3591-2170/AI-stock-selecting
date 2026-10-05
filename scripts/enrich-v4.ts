import {readFileSync,writeFileSync} from 'node:fs';
import {derivePrices} from '../lib/market-data.ts';
import {fields,type Snapshot} from '../lib/screener.ts';
const path='public/data/snapshot.json';const data=JSON.parse(readFileSync(path,'utf8')) as Snapshot;
for(const s of data.stocks){
 const e=JSON.parse(readFileSync('public'+s.evidencePath,'utf8'));
 const lines=e.records.prices?.raw.daily;if(!lines)throw Error('Missing prices: '+s.code);
 const raw=lines.filter((b:string[])=>b[0]<=data.asOf).map((b:string[])=>({date_ms:Date.parse(b[0]+'T00:00:00+08:00'),open_price:+b[1],close_price:+b[2],high_price:+b[3],low_price:+b[4],volume:+b[5]}));
 const d=derivePrices(raw,data.asOf);Object.assign(s,{bars:d.bars,prices:d.prices});Object.assign(s.metrics,d.metrics);
 const f=e.records.financial?.raw;const valid=f&&f.NOTICE_DATE?.slice(0,10)<=data.asOf;
 const p=valid?f.PARENT_NETPROFIT:null,rev=valid?f.TOTAL_OPERATE_INCOME:null,deduct=valid?f.DEDUCT_PARENT_NETPROFIT:null;
 Object.assign(s.metrics,{netMargin:typeof rev==='number'&&rev>0&&typeof p==='number'?p/rev*100:null,coreProfitShare:typeof p==='number'&&p>0&&typeof deduct==='number'?deduct/p*100:null,deductedProfit:typeof deduct==='number'?deduct:null});
 s.provenance||={};for(const [key,f] of Object.entries(fields))if(f.source==='prices'||['netMargin','coreProfitShare','deductedProfit'].includes(key))s.provenance[key]={provider:f.source==='prices'?'腾讯前复权日线 / 本地计算':'东方财富财报 / 本地计算',date:f.source==='prices'?data.asOf:data.financialPeriod,formula:f.raw};
}
data.version='snapshot-20260930-v4';data.universe='50只手工研究样本；增加20只科技与成长公司，题材映射来自披露资料，非全市场或龙头排名';
data.limitations=data.limitations.filter(x=>!x.includes('30只'));data.limitations.push('题材为人工维护的业务关联标签，可重叠；不代表完整板块成员、实时热度或市场龙头排名。');
writeFileSync(path,JSON.stringify(data,null,2));console.log({stocks:data.stocks.length,version:data.version});
