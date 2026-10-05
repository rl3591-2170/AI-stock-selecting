import {createFuyao} from '../lib/providers/fuyao.ts';
import {writeFile} from 'node:fs/promises';
const r=await createFuyao().institution('2026-09-30');await writeFile('work/institution-sample.json',JSON.stringify(r,null,2));console.log(JSON.stringify({date:r.data.trade_date,type:r.data.board_type,count:r.data.stock_items?.length,sample:r.data.stock_items?.slice(0,2)}));
