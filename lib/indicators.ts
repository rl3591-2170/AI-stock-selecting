/** Deterministic close-of-day features. Windows use observations, not calendar days. */
export type Candle={close:number;high:number;low:number;volume:number};
const avg=(a:number[])=>a.reduce((s,v)=>s+v,0)/a.length;
export function shortTermIndicators(bars:Candle[]){
 const out:Record<string,number|null>={};
 const c=bars.map(b=>b.close),last=c.at(-1);
 if(bars.length<35||!last||bars.some(b=>!Number.isFinite(b.close)||b.close<=0||!Number.isFinite(b.volume)||b.volume<0||!Number.isFinite(b.high)||!Number.isFinite(b.low)||b.high<b.low))throw Error('INVALID_SHORT_TERM_HISTORY');
 for(const n of [5,10,20]){
  const ma=(i:number)=>avg(c.slice(i-n+1,i+1));const t=c.length-1;
  out[`ma${n}Distance`]=(last/ma(t)-1)*100;
  out[`ma${n}Slope`]=(ma(t)/ma(t-3)-1)*100;
  // A cross requires yesterday <= yesterday MA and today > today MA.
  out[`cross${n}In3`]=[t-2,t-1,t].some(i=>c[i-1]<=ma(i-1)&&c[i]>ma(i))?1:0;
 }
 const tr=bars.slice(1).map((b,i)=>Math.max(b.high-b.low,Math.abs(b.high-c[i]),Math.abs(b.low-c[i])));
 const changes=c.slice(1).map((v,i)=>v-c[i]);
 let atr=avg(tr.slice(0,14)),gain=avg(changes.slice(0,14).map(v=>Math.max(0,v))),loss=avg(changes.slice(0,14).map(v=>Math.max(0,-v)));
 for(let i=14;i<tr.length;i++){atr=(atr*13+tr[i])/14;gain=(gain*13+Math.max(0,changes[i]))/14;loss=(loss*13+Math.max(0,-changes[i]))/14}
 out.atr14Pct=atr/last*100;out.rsi14=gain===0&&loss===0?50:loss===0?100:100-100/(1+gain/loss);
 const b=bars.at(-1)!;out.closePosition=b.high>b.low?(b.close-b.low)/(b.high-b.low)*100:50;
 out.breakout5Distance=(last/Math.max(...bars.slice(-6,-1).map(b=>b.high))-1)*100;out.pullback5=(1-last/Math.max(...c.slice(-5)))*100;out.range5=(Math.max(...bars.slice(-5).map(b=>b.high))/Math.min(...bars.slice(-5).map(b=>b.low))-1)*100;return out;
}
