import test from 'node:test';
import assert from 'node:assert/strict';
import {derivePrices} from '../lib/market-data.ts';
const bars=Array.from({length:90},(_,i)=>({date_ms:Date.UTC(2026,6,1+i),open_price:100,high_price:102,low_price:98,close_price:100,volume:1000,turnover:100000}));
const asOf=new Date(bars.at(-1)!.date_ms).toISOString().slice(0,10);
test('flat real-shape history yields zero movement and unit volume ratios',()=>{const d=derivePrices(bars,asOf);assert.equal(d.metrics.maSpread,0);assert.equal(d.metrics.volatility,0);assert.equal(d.metrics.drawdown,0);assert.equal(d.metrics.volumeRatio,1);assert.equal(d.metrics.volume3Ratio,1);assert.equal(d.bars.at(-1)!.ma60,100)});
test('breakout excludes the current high; zero volume denominator is unknown',()=>{const b=bars.map(x=>({...x,volume:0}));b.at(-1)!.close_price=110;b.at(-1)!.high_price=120;const d=derivePrices(b,asOf);assert.ok(Math.abs(d.metrics.breakoutDistance!-(110/102-1)*100)<1e-10);assert.equal(d.metrics.volumeRatio,null);assert.equal(d.metrics.volume3Ratio,null)});
test('insufficient history, future or stale cutoff rejects the source switch',()=>{assert.throws(()=>derivePrices(bars.slice(-60),asOf));assert.throws(()=>derivePrices(bars, '2026-08-01'));assert.throws(()=>derivePrices(bars, '2026-12-31'))});
