import {createFuyao} from '../lib/providers/fuyao.ts';
import {createIfind} from '../lib/providers/ifind.ts';
import {writeFile} from 'node:fs/promises';
const api=createFuyao();const meta=await api.resolve('600519');const income=await api.income(meta.ticker.thscode);const ifind=await createIfind().financials('贵州茅台2026年半年报加权净资产收益率、归母净利润同比、营业收入同比，提供单位和报告期');await writeFile('work/finance-verification.json',JSON.stringify({income,ifind},null,2));console.log(JSON.stringify({income:income.data.item.filter(x=>x.fiscal_period==='Q2'),ifind:ifind.content}));
