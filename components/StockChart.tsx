'use client';
import {useState} from 'react';
import UiSelect from './UiSelect';
import type {Stock} from '../lib/screener';
export default function StockChart({stock}:{stock:Stock}){
 const bars=(stock.bars||[]).slice(-60),[hover,setHover]=useState<number|null>(null),[period,setPeriod]=useState<'ma5'|'ma10'|'ma20'>('ma5');
 if(bars.length<2)return <p>日线数据不足，暂不能绘图。</p>;
 const w=640,h=230,pad=24,values=bars.flatMap(b=>[b.close,b[period],b.ma60]).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)),lo=Math.min(...values),hi=Math.max(...values),maxVol=Math.max(...bars.map(b=>b.volume));
 const x=(i:number)=>pad+i/(bars.length-1)*(w-pad*2),y=(v:number)=>pad+(hi-v)/(hi-lo||1)*140;
 const line=(key:'close'|'ma5'|'ma10'|'ma20'|'ma60')=>bars.map((b,i)=>typeof b[key]==='number'?`${x(i)},${y(b[key]!)}`:'').filter(Boolean).join(' ');
 const current=bars[hover??bars.length-1];
 return <div className="chart"><div className="chart-info"><UiSelect label="图表均线周期" value={period} onValueChange={value=>setPeriod(value as typeof period)} options={['ma5','ma10','ma20'].map(v=>({value:v,label:v.toUpperCase()}))}/><strong>{current.date}</strong><span>前复权收盘 {current.close.toFixed(2)}</span><span className="ma20">{period.toUpperCase()} {current[period]?.toFixed(2)||'—'}</span><span className="ma60">MA60 {current.ma60?.toFixed(2)||'—'}</span></div><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${stock.name}近60个观测日日线及${period.slice(2)}日、60日均线`} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setHover(i=>Math.max(0,Math.min(bars.length-1,(i??bars.length-1)+(e.key==='ArrowLeft'?-1:1))))}}} onPointerMove={e=>{const rect=e.currentTarget.getBoundingClientRect();setHover(Math.max(0,Math.min(bars.length-1,Math.round(((e.clientX-rect.left)/rect.width*w-pad)/(w-pad*2)*(bars.length-1)))))}}>
 {[0,.5,1].map(t=><g key={t}><line x1={pad} x2={w-pad} y1={pad+t*140} y2={pad+t*140} stroke="rgba(255,255,255,.12)"/><text x={pad} y={pad+t*140-5} fill="rgba(255,255,255,.4)" fontSize="11">{(hi-(hi-lo)*t).toFixed(2)}</text></g>)}
 {bars.map((b,i)=><rect key={b.date} x={x(i)-2} y={208-b.volume/(maxVol||1)*30} width="4" height={b.volume/(maxVol||1)*30} fill="#245C55"/>)}
 <polyline points={line('close')} fill="none" stroke="#72E7D1" strokeWidth="2"/><polyline points={line(period)} fill="none" stroke="#9BF4E2" strokeWidth="1.5"/><polyline points={line('ma60')} fill="none" stroke="#727D7A" strokeWidth="1.5"/>
 {hover!==null&&<line x1={x(hover)} x2={x(hover)} y1="18" y2="210" stroke="rgba(255,255,255,.4)" strokeDasharray="3 3"/>}<text x={pad} y={225} fontSize="11" fill="rgba(255,255,255,.4)">{bars[0].date}</text><text x={w-pad} y={225} textAnchor="end" fontSize="11" fill="rgba(255,255,255,.4)">{bars.at(-1)?.date}</text></svg><small>薄荷青线：前复权收盘价；下方：同口径成交量相对柱。复权价格用于走势比较，不是下单价格。</small></div>
}
