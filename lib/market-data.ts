import {shortTermIndicators} from './indicators.ts';
import {type Bar} from './screener.ts';
import {ProviderError,type PriceBar} from './providers/fuyao.ts';
const mean=(a:number[])=>a.reduce((s,x)=>s+x,0)/a.length;
const pct=(a:number,b:number)=>b>0?(a/b-1)*100:null;
export function derivePrices(raw:PriceBar[],asOf:string){
 const bars:Bar[]=raw.map(b=>({date:new Date(b.date_ms+8*3600000).toISOString().slice(0,10),open:b.open_price,high:b.high_price,low:b.low_price,close:b.close_price,volume:b.volume})).sort((a,b)=>a.date.localeCompare(b.date));
 if(bars.length<65||bars.at(-1)?.date!==asOf||bars.some(b=>b.date>asOf))throw new ProviderError('INSUFFICIENT_OR_STALE_HISTORY');
 const c=bars.map(b=>b.close),v=bars.map(b=>b.volume),last=c.at(-1)!;
 bars.forEach((b,i)=>{b.ma5=i>=4?mean(c.slice(i-4,i+1)):null;b.ma10=i>=9?mean(c.slice(i-9,i+1)):null;b.ma20=i>=19?mean(c.slice(i-19,i+1)):null;b.ma60=i>=59?mean(c.slice(i-59,i+1)):null});
 const tail=c.slice(-61),returns=tail.slice(1).map((x,i)=>x/tail[i]-1),avg=mean(returns);let peak=tail[0],drawdown=0;for(const x of tail){peak=Math.max(peak,x);drawdown=Math.max(drawdown,(1-x/peak)*100)}
 const ratio=(a:number,b:number)=>b>0?a/b:null;
 return {bars:bars.slice(-90),prices:bars.slice(-61).map(({date,close})=>({date,close})),metrics:{...shortTermIndicators(bars),price:last,maSpread:pct(mean(c.slice(-20)),mean(c.slice(-60))),maSlope:pct(mean(c.slice(-20)),mean(c.slice(-25,-5))),maDistance:pct(last,mean(c.slice(-20))),return3:pct(last,c.at(-4)!),return5:pct(last,c.at(-6)!),return10:pct(last,c.at(-11)!),return20:pct(last,c.at(-21)!),pullback10:(1-last/Math.max(...c.slice(-10)))*100,volumeRatio:ratio(v.at(-1)!,mean(v.slice(-21,-1))),volume3Ratio:ratio(mean(v.slice(-3)),mean(v.slice(-23,-3))),breakoutDistance:pct(last,Math.max(...bars.slice(-21,-1).map(b=>b.high))),range10:pct(Math.max(...bars.slice(-10).map(b=>b.high)),Math.min(...bars.slice(-10).map(b=>b.low))),volatility:Math.sqrt(returns.reduce((s,x)=>s+(x-avg)**2,0)/(returns.length-1))*Math.sqrt(252)*100,drawdown}};
}
