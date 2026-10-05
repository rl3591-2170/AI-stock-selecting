import {ProviderError,type Receipt} from './providers/fuyao.ts';
type Board={trade_date:string;board_type:string;stock_items:Record<string,unknown>[]};
export function institutionalMetrics(code:string,dates:string[],receipts:Receipt<Board>[],window:5|20=20){
 if(dates.length!==window||new Set(dates).size!==window||receipts.length!==window||receipts.some((r,i)=>r.data.trade_date!==dates[i]||r.data.board_type!=='org'||!Array.isArray(r.data.stock_items)))throw new ProviderError('INCOMPLETE_INSTITUTION_COVERAGE');
 const rows=receipts.map(r=>r.data.stock_items.filter(s=>s.ticker===code&&s.range_days===1));
 // Deduplicate days; conflicting single-day amounts remain unknown rather than summed.
 const last=rows.at(-1)!;const values=last.map(r=>typeof r.org_net_value==='number'&&typeof r.amount==='number'&&r.amount>0?r.org_net_value/r.amount*100:null);
 const ratio=values.length&&values.every(v=>v!==null&&Number.isFinite(v)&&v===values[0])?values[0]:null;
 return {institutionDays:rows.filter(r=>r.length>0).length,institutionNetRatio:ratio};
}
