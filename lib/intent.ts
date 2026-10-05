import {themes,themeAliases} from './universe.ts';
import {fields,rule,trendPresets,planChanges,type Field,type Plan,type Group,type Style} from './screener.ts';
export type Turn={role:'user'|'assistant';content:string};
export type Question={text:string;options:{label:string;message:string}[]};
export type IntentResult={kind:'proposal'|'clarify'|'unsupported';summary:string;plan?:Plan;questions:Question[];unsupported:string[];assumptions:string[];changes:string[];mode:'local'|'model'};
export const aliases:Record<string,Field>={
 '归母净利率':'netMargin','扣非利润占比':'coreProfitShare','扣非利润占归母利润':'coreProfitShare','扣非归母净利润':'deductedProfit','atr14':'atr14Pct','atr':'atr14Pct','rsi14':'rsi14','rsi':'rsi14','收盘位置':'closePosition','距ma5':'ma5Distance','距5日均线':'ma5Distance','距ma10':'ma10Distance','距10日均线':'ma10Distance','ma5近3日变化':'ma5Slope','ma10近3日变化':'ma10Slope','近3日上穿ma5':'cross5In3','近3日上穿ma10':'cross10In3','近3日上穿ma20':'cross20In3',
 '营收增长率':'revenueGrowth','营收增速':'revenueGrowth','营收同比':'revenueGrowth','营收同比增长':'revenueGrowth','利润增速':'profitGrowth','净利润增长率':'profitGrowth','归母净利润同比增长':'profitGrowth','净利润同比':'profitGrowth','归母净利润':'profit','净利润':'profit',
 'pe(ttm)':'pe','pe':'pe','市盈率':'pe','pb':'pb','市净率':'pb','总市值':'marketCap','市值':'marketCap','roe':'roe','净资产收益率':'roe','资产负债率':'debtRatio','净利润现金含量':'cashContent',
 'ma20相对ma60':'maSpread','均线差':'maSpread','ma20近5日变化':'maSlope','均线方向':'maSlope','均线斜率':'maSlope','收盘价距ma20':'maDistance','距ma20':'maDistance','均线距离':'maDistance','距20日均线':'maDistance',
 '近3日涨跌幅':'return3','3日涨幅':'return3','近5日涨跌幅':'return5','5日涨幅':'return5','近10日涨跌幅':'return10','10日涨幅':'return10','近20日涨跌幅':'return20','20日涨幅':'return20',
 '距近10日收盘高点回撤':'pullback10','近期回撤':'pullback10','高点回撤':'pullback10','近3日均量/此前20日均量':'volume3Ratio','近3日量能比':'volume3Ratio','缩量比':'volume3Ratio','当日量/此前20日均量':'volumeRatio','当日成交量倍数':'volumeRatio','成交量倍数':'volumeRatio',
 '收盘价距此前20日最高价':'breakoutDistance','距前高':'breakoutDistance','近10日高低区间宽度':'range10','区间宽度':'range10','60日年化波动率':'volatility','波动率':'volatility','60日区间最大回撤':'drawdown','最大回撤':'drawdown',
 '板块近5日相对基准涨幅':'sectorRelative5','板块上涨家数占比':'sectorBreadth','板块连续强势天数':'sectorStrongDays','持续强势天数':'sectorStrongDays','板块前5股成交额占比':'turnoverConcentration','成交额集中度':'turnoverConcentration','近20日机构席位上榜天数':'institutionDays','机构席位上榜天数':'institutionDays','当日机构席位净买入占成交额':'institutionNetRatio','机构席位净买入占比':'institutionNetRatio'};
const num='(-?\\d+(?:\\.\\d+)?)';
const base=():IntentResult=>({kind:'unsupported',summary:'',questions:[],unsupported:[],assumptions:[],changes:[],mode:'local'});
export function localInterpret(message:string,current:Plan,style:Style,industries:string[]):IntentResult|null{
 const original=message.trim();const msg=original.toLowerCase().replace(/\s/g,'').replace(/[。！!]$/,'');
 const result=base();const plan:Plan=structuredClone(current);
 const suppliedRange=msg.match(/(-?\d+(?:\.\d+)?)(?:到|至|和|~|～)(-?\d+(?:\.\d+)?)/);
 const rangeSuffix=suppliedRange?`在${suppliedRange[1]}到${suppliedRange[2]}之间`:'';
 const question=(text:string,options:Question['options']):IntentResult=>({...result,kind:'clarify',summary:'先确认这一处含义，现有条件尚未改变。',questions:[{text,options}]});
 if(/稳健|稳一点|更稳|稳一些/.test(msg))return question('“稳”是指价格波动较小，还是公司的财务负担较轻？',[{label:'价格波动较小',message:'波动率上限设为25%'},{label:'财务负担较轻',message:'资产负债率上限设为50%'}]);
 if(/机构活跃度/.test(msg))return question('机构活跃度没有唯一口径。选择你要研究的披露指标；必须加载完整披露才能使用，未上榜不能据此判断机构未参与。',[{label:'近20日上榜天数',message:rangeSuffix?'机构席位上榜天数'+rangeSuffix:'机构席位上榜天数'},{label:'当日净买入占成交额',message:rangeSuffix?'机构席位净买入占比'+rangeSuffix:'机构席位净买入占比'}]);
 if(/资金集中度/.test(msg))return question('这里可以定义成交额集中度；它不等于机构持仓集中度。是否采用这个口径？',[{label:'采用板块前5股成交额占比',message:rangeSuffix?'成交额集中度'+rangeSuffix:'成交额集中度'}]);
 if(/回调/.test(msg)&&!Object.keys(trendPresets).some(k=>msg===trendPresets[k as keyof typeof trendPresets].label)&&!/[\d]/.test(msg))return question('你说的回调，更想观察价格回到哪里？',[{label:'20日均线附近',message:'均线距离在-3到3之间'},{label:'较近期高点回落',message:'高点回撤在3到8之间'},{label:'采用趋势回调示例',message:'使用趋势回调模板'}]);
 if(/放宽一点|放宽些|放宽点|收紧一点|收紧些/.test(msg)){
 const alias=Object.keys(aliases).sort((a,b)=>b.length-a.length).find(a=>msg.includes(a));
 if(alias){const field=aliases[alias],r=[...current.fundamental,...current.trend].find(r=>r.field===field&&r.op.startsWith('<'));if(r){const v=Number((r.value+(msg.includes('收紧')?-1:1)*Math.max(Math.abs(r.value)*0.2,1)).toFixed(2));return question(`当前${fields[field].label}上限为${r.value}。下面仅提出可修改的幅度，不自动执行。`,[{label:`调整至${v}${fields[field].unit}`,message:`${alias}上限设为${v}`}])}}
 return question('请明确要调整哪个维度。你可以直接输入指标和新范围。',[{label:'PE上限调整到30倍',message:'PE上限设为30'},{label:'均线距离调整到-5%～5%',message:'均线距离在-5到5之间'}]);
 }
 for(const preset of Object.values(trendPresets))if(msg===preset.label.toLowerCase()||msg===`使用${preset.label.toLowerCase()}模板`){plan.trend=preset.rules.map(r=>({...r,id:rule(r.field,r.op,r.value).id}));return {...result,kind:'proposal',summary:`提出「${preset.label}」示例条件，基本面规则保持不变。`,plan,assumptions:[preset.description,'模板阈值是明确示例，未经过收益回测验证。'],changes:planChanges(current,plan)}}
 if(/cbo/.test(msg))return question('你说的 CBO 是指 CPO（共封装光学）产业链吗？',[{label:'是，CPO / 高速光模块',message:original.replace(/cbo/ig,'CPO')}]);
 if(/^(不限题材|清除题材限制|所有题材)$/.test(msg)){plan.themes=[];return {...result,kind:'proposal',summary:'移除题材限制，行业和数值规则保留。',plan,changes:planChanges(current,plan)}}
 const themeScope=msg.match(/^(?:只看|题材(?:改为|设为|是|为)?|板块(?:改为|设为|是|为)?)(.+)$/);
 if(themeScope){const parts=themeScope[1].replace(/(?:板块|题材)$/,'').split(/或|或者|、|和|\/|及/);const tags=parts.map(x=>themeAliases[x]);if(tags.every(Boolean)){plan.themes=[...new Set(tags)];return {...result,kind:'proposal',summary:'题材之间取并集，再与行业及数值条件取交集。',plan,assumptions:['题材来自公司业务披露，非完整板块成分或热点排名。'],changes:planChanges(current,plan)}}}
 const maEvent=msg.match(/^(?:最近3日|近3日|近日)?(?:突破|上穿|站上)(?:ma)?(5|10|20)(?:日线|日均线)?$/);
 if(maEvent){const n=maEvent[1];const cross=!msg.includes('站上');const field=(cross?`cross${n}In3`:n==='20'?'maDistance':`ma${n}Distance`) as Field;const next=rule(field,cross?'>=':'>',cross?1:0);plan.trend=plan.trend.filter(r=>r.field!==field);plan.trend.push(next);return {...result,kind:'proposal',summary:cross?'检查最近3个观测日是否发生由下向上穿越。':'只检查当前收盘价是否在线上，不要求最近上穿。',plan,assumptions:cross?['“近日”定义为最近3个观测日，之后可能再次跌破。']:[],changes:planChanges(current,plan)}}
 if(/^(不限行业|清除行业限制|所有行业)$/.test(msg)){plan.industry='';return {...result,kind:'proposal',summary:'移除行业限制，其余条件保留。',plan,changes:planChanges(current,plan)}}
 const sector=msg.match(/^(?:只看|行业(?:改为|设为|是|为)|板块(?:改为|设为|是|为))(.+?)(?:行业|板块)?$/);
 if(sector){const target=industries.find(i=>i.toLowerCase()===sector[1]||i.toLowerCase().replace(/ⅱ|ⅰ|Ⅱ|Ⅰ/g,'')===sector[1]);if(!target)return {...result,summary:'该名称不在当前行业目录中，未改变范围。',unsupported:[`「${sector[1]}」可能是概念题材或不同分类。当前只有样本所属行业，不能假设行业与题材相同。`]};plan.industry=target;return {...result,kind:'proposal',summary:`行业限定为${target}，两套模型采用相同范围。`,plan,changes:planChanges(current,plan)}}
 if(['机构席位上榜天数','机构席位净买入占比','成交额集中度'].includes(msg))return question('口径已明确。请输入你的上下限，或选择下面的示例；示例阈值不是推荐参数。',[{label:msg==='机构席位上榜天数'?'示例：1–5天':'示例：0%–20%',message:msg+(msg==='机构席位上榜天数'?'在1到5之间':'在0到20之间')}]);
 const parts=msg.split(/[，,；;]|并且|而且/).filter(Boolean);let matched=0;
 for(const part of parts){
  const text=part.replace(/^(请|帮我)/,'').replace(/^把/,'');
  const match=Object.entries(aliases).sort((a,b)=>b[0].length-a[0].length).find(([a])=>text.startsWith(a)||text.startsWith('删除'+a)||text.startsWith('取消'+a)||text.startsWith('添加'+a));
  if(!match){result.unsupported.push(part);continue}
  const [alias,field]=match,group=fields[field].group;let tail=text;const add=tail.startsWith('添加');
  if(tail===`删除${alias}`||tail===`取消${alias}`){plan[group]=plan[group].filter(r=>r.field!==field);matched++;continue}
  tail=tail.replace(/^添加/,'').slice(alias.length).replace(/(?:%|％|倍|元|亿元|交易日|天|个百分点|百分点)$/,'');
  // Only exact clauses are accepted; never silently discard an unrecognized suffix.
  const range=tail.match(new RegExp(`^(?:在|介于|改为|设为|设置为|范围为)?${num}(?:到|至|和|~|～)${num}(?:之间|以内)?$`));
  let next:ReturnType<typeof rule>[]=[];let direction:''|'<'|'>'='';
  if(range){next=[rule(field,'>=',Number(range[1])),rule(field,'<=',Number(range[2]))]}
  else{
   const bound=tail.match(new RegExp(`^(上限|下限)(?:改为|设为|设置为|调整到|为|是)?${num}$`));
   const comparator=tail.match(new RegExp(`^(不超过|不高于|小于等于|大于等于|不低于|至少|大于|高于|小于|低于|>=|<=|>|<|≥|≤)${num}$`));
   const change=tail.match(new RegExp(`^(?:从${num}(?:改到|改为|调到|降到|提高到)|改为|设为|设置为|调整到)${num}$`));
   if(bound){direction=bound[1]==='上限'?'<':'>';next=[rule(field,direction==='<'?'<=':'>=',Number(bound[2]))]}
   else if(comparator){const opMap:Record<string,ReturnType<typeof rule>['op']>={'不超过':'<=','不高于':'<=','小于等于':'<=','大于等于':'>=','不低于':'>=','至少':'>=','大于':'>','高于':'>','小于':'<','低于':'<','≥':'>=','≤':'<=','>=':'>=','<=':'<=','>':'>','<':'<'};const op=opMap[comparator[1]];direction=op.startsWith('<')?'<':'>';next=[rule(field,op,Number(comparator[2]))]}
   else if(change){const existing=plan[group].filter(r=>r.field===field);if(existing.length!==1)return question(`${fields[field].label}有${existing.length}条边界，请明确修改上限还是下限。`,[{label:'修改上限',message:`${alias}上限设为${change[2]}`},{label:'修改下限',message:`${alias}下限设为${change[2]}`}]);next=[rule(field,existing[0].op,Number(change[2]))];direction=existing[0].op.startsWith('<')?'<':'>'}
   else{result.unsupported.push(part);continue}
  }
  if(['profit','deductedProfit'].includes(field)&&part.includes('亿元'))next=next.map(r=>({...r,value:r.value*1e8}));
  if(!add)plan[group]=plan[group].filter(r=>r.field!==field||(direction&&!r.op.startsWith(direction)));
  plan[group].push(...next);matched++;
 }
 if(!matched)return null;
 if(result.unsupported.length)return {...result,summary:'部分内容无法按明确规则解析，尚未修改任何条件。请拆成明确指标或使用模型解析。'};
 const targetGroup=style==='intersection'?'两套':style==='fundamental'?'基本面':'趋势';
 return {...result,kind:'proposal',summary:`已提出条件修改，未提及的规则保持不变。当前查看${targetGroup}结果。`,plan,changes:planChanges(current,plan),assumptions:['使用明确语法的本地规则解析，不是大模型推理。']};
}
export function validatePlanShape(plan:unknown):plan is Plan{
 if(!plan||typeof plan!=='object')return false;const p=plan as Plan;
 if(p.themes!==undefined&&(!Array.isArray(p.themes)||p.themes.length>themes.length||p.themes.some(t=>typeof t!=='string'||!themes.includes(t))||new Set(p.themes).size!==p.themes.length))return false;
 if(p.excludeST!==undefined&&typeof p.excludeST!=='boolean')return false;
 if(typeof p.industry!=='string'||p.industry.length>80)return false;
 const ids=new Set();for(const g of ['fundamental','trend'] as Group[]){if(!Array.isArray(p[g])||p[g].length>24)return false;for(const r of p[g]){if(!r||!Object.hasOwn(fields,r.field)||fields[r.field].group!==g||!['>','>=','<','<='].includes(r.op)||typeof r.value!=='number'||!Number.isFinite(r.value)||typeof r.id!=='string'||!r.id||ids.has(r.id))return false;ids.add(r.id)}}
 return true;
}

// Resolve only explicit follow-up choices/ranges; never guess a missing subject.
export function resolveFollowup(prompt:string,history:Turn[]):string{
 const last=history.at(-1);if(last?.role!=='assistant')return prompt;
 try{const a=JSON.parse(last.content) as IntentResult;if(a.kind!=='clarify'||a.questions.length!==1)return prompt;
  const options=a.questions[0].options;const choice=prompt.trim().match(/^(?:第)?([一二三四1-4])(?:个|项)?$/);
  if(choice){const i='一二三四'.indexOf(choice[1]);return options[i>=0?i:Number(choice[1])-1]?.message||prompt}
  const aliasesSorted=Object.keys(aliases).sort((a,b)=>b.length-a.length);
  const subjects=options.map(o=>aliasesSorted.find(a=>o.message.toLowerCase().startsWith(a)));
  if(subjects.length&&subjects[0]&&subjects.every(s=>s===subjects[0])&&/^(?:在|介于)?-?\d+(?:\.\d+)?(?:到|至|和|~|～)-?\d+(?:\.\d+)?(?:之间|以内)?[%％]?$/.test(prompt.trim()))return subjects[0]+prompt.trim();
 }catch{}return prompt;
}

/** All clauses form one transaction. Clarification choices retain the remaining request. */
export function interpretIntent(message:string,current:Plan,style:Style,industries:string[]):IntentResult|null{
 const parts=message.trim().split(/[，,；;]|并且|而且/).filter(Boolean);
 if(parts.length<2)return localInterpret(message,current,style,industries);
 let working=structuredClone(current);const assumptions:string[]=[];const questions:Question[]=[];
 for(let i=0;i<parts.length;i++){
  const result=localInterpret(parts[i],working,style,industries);
  if(!result)return null;
  if(result.kind==='unsupported')return result;
  if(result.kind==='clarify')for(const q of result.questions)questions.push({...q,options:q.options.map(o=>({...o,message:parts.map((p,j)=>j===i?o.message:p).join('，')}))});
  if(result.plan)working=result.plan;assumptions.push(...result.assumptions);
 }
 if(questions.length)return {...base(),kind:'clarify',summary:'这些条件作为一次修改处理；先确认含糊部分，已有规则尚未改变。',questions:questions.slice(0,2)};
 return {...base(),kind:'proposal',summary:'已完整解析组合条件，未提及的规则保持不变。',plan:working,assumptions:[...new Set(assumptions)],changes:planChanges(current,working)};
}

/** A deterministic guard for an especially dangerous scope mismatch: OR across themes. */
export function scopeSemanticsError(prompt:string,before:Plan,after:Plan):string|null{
 if(!/或|或者/.test(prompt))return null;
 const lower=prompt.toLowerCase();
 const requested=[...new Set(Object.entries(themeAliases).filter(([alias])=>lower.includes(alias)).map(([,theme])=>theme))];
 if(requested.length<2)return null;
 if(requested.some(t=>!after.themes?.includes(t))||after.industry!==before.industry)return '题材并集被错误映射为行业交集';
 return null;
}
