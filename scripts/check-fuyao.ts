/** Small entitlement/contract check. Does not replace the published snapshot. */
import {createFuyao,ProviderError} from '../lib/providers/fuyao.ts';
import {mkdir,writeFile} from 'node:fs/promises';
const api=createFuyao();
try{
 const resolved=await api.resolve('600519');
 // Fixed historical window aligned with the demonstration snapshot.
 const prices=await api.historical(resolved.ticker.thscode,'2026-06-01','2026-09-30');
 const financial=await api.indicators(resolved.ticker.thscode,'2026-2');
 if(financial.data.thscode!==resolved.ticker.thscode||financial.data.report!=='2026-2'||!Array.isArray(financial.data.abilities))throw new ProviderError('INVALID_FINANCIAL_SCHEMA',financial.requestId);
 const dir=new URL('../work/provider-checks/',import.meta.url);await mkdir(dir,{recursive:true});
 await writeFile(new URL('fuyao-evidence.json',dir),JSON.stringify({resolved,prices,financial},null,2));
 console.log(JSON.stringify({provider:'fuyao',status:'sample_checked_not_integrated',ticker:resolved.ticker.thscode,priceRows:prices.data.item.length,report:financial.data.report,evidence:'work/provider-checks/fuyao-evidence.json',next:'核对单位、披露日与替代源差异，再统一切换数据版本；此检查不表示板块/机构权限已验证。'}));
}catch(e){console.error(e instanceof ProviderError?e.message:'验证失败；未更改快照。');process.exitCode=1}
