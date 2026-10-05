'use client';
import {useEffect,useState} from 'react';
export function ConnectionStatus(){
 const [state,setState]=useState<{model:{configured:boolean;model:string|null};fuyao:{configured:boolean};ifind:{configured:boolean}}|null>(null),[error,setError]=useState('');
 useEffect(()=>{fetch('/api/connections').then(r=>{if(!r.ok)throw Error();return r.json()}).then(x=>setState(x as NonNullable<typeof state>)).catch(()=>setError('无法读取服务端配置状态。'))},[]);
 return <div className="provider"><strong>服务端连接配置</strong>{error?<p className="warning">{error}</p>:!state?<p>正在检查配置…</p>:<p>模型：{state.model.configured?`${state.model.model} · 已配置`:'未配置'}；扶摇：{state.fuyao.configured?'已配置':'未配置'}。</p>}<p>配置状态不代表调用成功。可在个股详情主动获取授权证据，查看成功回执或明确错误。实际筛选来源以工作台顶部标注为准。</p></div>
}
export default function ProviderEvidence({code,reportDate}:{code:string;reportDate?:string}){
 const [busy,setBusy]=useState(''),[error,setError]=useState(''),[result,setResult]=useState<{evidence:unknown;note:string}|null>(null);
 useEffect(()=>{setResult(null);setError('')},[code]);
 async function verify(provider:'fuyao'|'ifind'){setBusy(provider);setError('');setResult(null);try{const r=await fetch('/api/stock-evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,provider,reportDate})});const d=await r.json() as {evidence:unknown;note:string;error?:string};if(!r.ok)throw Error(d.error||'数据源调用失败');setResult(d)}catch(e){setError(e instanceof Error?e.message:'请求失败，未产生替代数据。')}finally{setBusy('')}}
 function download(){if(!result)return;const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${code}-授权数据证据.json`;a.click();URL.revokeObjectURL(url)}
 return <section className="provider"><h3>授权数据核验</h3><p>重新获取扶摇日线与财务原始回执。取数会使用配置账户的接口额度。查询不会自动覆盖已执行结果。</p><div className="actions"><button disabled={!!busy} onClick={()=>verify('fuyao')}>{busy==='fuyao'?'正在查询…':'查询扶摇证据'}</button></div>{error&&<div className="notice error" role="alert">{error}</div>}{result&&<div className="notice"><p>{result.note}</p><button onClick={download}>下载原始回执</button><details><summary>查看原始数据与请求时间</summary><pre className="provider-json">{JSON.stringify(result.evidence,null,2)}</pre></details></div>}</section>
}
