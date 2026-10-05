export type Style='fundamental'|'trend'|'intersection';
export type Group='fundamental'|'trend';
type Definition={label:string;unit:string;source:'financial'|'valuation'|'prices'|'sector'|'institution';raw:string;definition:string;group:Group;category:string;pending?:string};
const f=(label:string,unit:string,source:Definition['source'],raw:string,definition:string,group:Group,category:string,pending?:string):Definition=>({label,unit,source,raw,definition,group,category,pending});
export const fields={
 revenueGrowth:f('营收同比增长','%','financial','TOI_RATIO','2026年上半年累计营业总收入同比，采用披露口径。','fundamental','成长'),
 profitGrowth:f('归母净利润同比增长','%','financial','PARENT_NETPROFIT_RATIO','2026年上半年累计归母净利润同比。低基数或亏损收窄不等同于盈利。','fundamental','成长'),
 profit:f('归母净利润','元','financial','PARENT_NETPROFIT','2026年上半年累计归母净利润。','fundamental','盈利'),
 pe:f('PE(TTM)','倍','valuation','PE_TTM','基准日总市值/近12个月归母净利润。非正值不适用正盈利估值比较。','fundamental','估值'),
 pb:f('PB','倍','valuation','PB_MRQ','基准日总市值/最近报告期归母净资产。非正值不适用。','fundamental','估值'),
 marketCap:f('总市值','亿元','valuation','TOTAL_MARKET_CAP / 1e8','基准日总市值，人民币亿元。','fundamental','规模'),
 roe:f('加权净资产收益率','%','financial','index_weighted_avg_roe','报告期累计加权ROE，不自动年化。','fundamental','盈利','待接入并核验财务指标'),
 debtRatio:f('资产负债率','%','financial','assets_debt_ratio','报告期负债/资产；跨行业尤其金融与非金融不可直接比较。','fundamental','财务风险','待接入并核验财务指标'),
 cashContent:f('净利润现金含量','待核验','financial','net_profit_cash_content','供应商现金质量指标；单位及分母口径必须实测确认后启用。','fundamental','现金质量','待验证供应商单位及口径'),
 maSpread:f('MA20 相对 MA60','%','prices','(MA20 / MA60 - 1) × 100','正值表示20日均线高于60日均线。采用前复权收盘价。','trend','趋势'),
 maSlope:f('MA20 近5日变化','%','prices','(MA20[t] / MA20[t-5] - 1) × 100','当前20日均线相对5个观测日前的变化，正值为上升。','trend','趋势'),
 maDistance:f('收盘价距 MA20','%','prices','(close / MA20 - 1) × 100','带符号偏离；负值在均线下方。不是买卖点建议。','trend','位置'),
 return3:f('近3日涨跌幅','%','prices','(close[t] / close[t-3] - 1) × 100','最近3个观测日的前复权收盘价变化。','trend','强弱'),
 return5:f('近5日涨跌幅','%','prices','(close[t] / close[t-5] - 1) × 100','最近5个观测日的前复权收盘价变化。','trend','强弱'),
 return10:f('近10日涨跌幅','%','prices','(close[t] / close[t-10] - 1) × 100','最近10个观测日的前复权收盘价变化。','trend','强弱'),
 return20:f('近20日涨跌幅','%','prices','(close[t] / close[t-20] - 1) × 100','约一个交易月的表现；单只股票上涨不能证明某题材是市场主线。','trend','月度观察'),
 pullback10:f('距近10日收盘高点回撤','%','prices','(1 - close / max(close[-10:])) × 100','当前收盘价距最近10个观测日收盘高点的跌幅，正数表示回撤。','trend','位置'),
 volumeRatio:f('当日量 / 此前20日均量','倍','prices','volume[t] / mean(volume[t-20:t])','完整交易日成交量比值，分母不含当日。不是盘中量比。','trend','量能'),
 volume3Ratio:f('近3日均量 / 此前20日均量','倍','prices','mean(volume[-3:]) / mean(volume[-23:-3])','衡量近期量能收缩；只有同时发生价格回撤时才可解释为缩量回撤。','trend','量能'),
 breakoutDistance:f('收盘价距此前20日最高价','%','prices','(close[t] / max(high[t-20:t]) - 1) × 100','比较窗口不含当日。正值代表收盘越过此前20日最高价；并不证明首次突破。','trend','位置'),
 range10:f('近10日高低区间宽度','%','prices','(max(high[-10:]) / min(low[-10:]) - 1) × 100','最近10个观测日高低价格区间宽度。窄区间不保证后续突破方向。','trend','波动'),
 volatility:f('60日年化波动率','%','prices','stdev(60 daily returns) × √252 × 100','最近61个前复权收盘价形成60个简单收益率，样本标准差年化。','trend','波动'),
 drawdown:f('60日区间最大回撤','%','prices','max(1 - close[j] / close[i]), i ≤ j','最近61个前复权收盘价中的峰谷最大跌幅，取正数。','trend','波动'),
 sectorRelative5:f('板块近5日相对基准涨幅','百分点','sector','sector return5 - benchmark return5','指定板块指数5日涨幅减去明确基准的5日涨幅；需要真实板块成员和指数历史。','trend','板块与主线','待接入完整板块、指数与基准数据'),
 sectorBreadth:f('板块上涨家数占比','%','sector','rising constituents / valid constituents × 100','同一交易日板块内上涨家数/有有效涨跌幅的成分数，必须显示覆盖率。','trend','板块与主线','待接入完整板块成分与行情'),
 sectorStrongDays:f('板块连续强势天数','交易日','sector','consecutive top-quintile sector relative-return ranks','截至基准日，板块5日相对涨幅排名连续处于同类板块前20%的交易日数；不是轮动天数。','trend','板块与主线','待接入至少一个月的同口径板块排名'),
 turnoverConcentration:f('板块前5股成交额占比','%','sector','top5 turnover / all valid constituent turnover × 100','板块成交额集中度，不是机构持仓或真实资金持有集中度。需完整成分及成交额。','trend','板块与主线','待接入板块完整成交额'),
 institutionDays:f('近20日机构席位上榜天数','交易日','institution','count(distinct date with org seats; range_days=1)','仅计有机构席位记录的当日榜，排除3日榜重叠。没有覆盖完整日期时不能把未记录当0。','trend','机构披露','待接入并核验20日龙虎榜机构席位记录'),
 institutionNetRatio:f('当日机构席位净买入占成交额','%','institution','org_net_value / amount × 100; range_days=1','仅当日龙虎榜披露样本。未上榜不代表机构不活跃；非全市场机构交易统计。','trend','机构披露','待接入并核验当日机构席位榜'),
} as const;
export type Field=keyof typeof fields;
export type Rule={id:string;field:Field;op:'>'|'>='|'<'|'<=';value:number};
export type Plan={fundamental:Rule[];trend:Rule[];industry:string};
export type Bar={date:string;open:number;high:number;low:number;close:number;volume:number;ma20?:number|null;ma60?:number|null};
export type Stock={code:string;name:string;industry:string;metrics:Partial<Record<Field|'price'|'revenue',number|null>>;errors:string[];sources:Record<string,string>;prices:{date:string;close:number}[];bars?:Bar[];evidencePath:string;reportDate?:string;disclosedAt?:string;tradeDate?:string;provenance?:Record<string,{provider:string;date:string;formula?:string}>};
export type Snapshot={version:string;asOf:string;financialPeriod:string;fetchedAt:string;source:string;universe:string;limitations:string[];stocks:Stock[]};
export type Check={rule:Rule;status:'pass'|'fail'|'unknown';actual:number|null;reason:string};
export type Issue={kind:'conflict'|'duplicate'|'tradeoff'|'unavailable';text:string;ids:string[];removeId?:string};
export const rule=(field:Field,op:Rule['op'],value:number):Rule=>({id:`${field}-${crypto.randomUUID()}`,field,op,value});
export const fundamentalDefaults:Rule[]=[rule('revenueGrowth','>',0),rule('profitGrowth','>',0),rule('profit','>',0),rule('pe','<=',25)];
export const trendPresets={
 pullback:{label:'趋势回调',description:'趋势向上，回到均线附近，近期量能收缩',rules:[rule('maSpread','>',0),rule('maSlope','>',0),rule('maDistance','>=',-5),rule('maDistance','<=',5),rule('pullback10','>',0),rule('pullback10','<=',10),rule('volume3Ratio','<',1)]},
 breakout:{label:'放量越过前高',description:'收盘越过此前20日高点，配合当日放量',rules:[rule('breakoutDistance','>',0),rule('breakoutDistance','<=',5),rule('volumeRatio','>=',1.5),rule('maSlope','>',0)]},
 consolidation:{label:'整理接近前高',description:'尚未突破，区间较窄，接近此前20日高点',rules:[rule('breakoutDistance','>=',-5),rule('breakoutDistance','<=',0),rule('range10','<=',12),rule('volume3Ratio','<=',1)]},
 month:{label:'近一月趋势',description:'个股一个月走势观察；不等同于题材主线识别',rules:[rule('return20','>',0),rule('maSpread','>',0),rule('maSlope','>',0),rule('maDistance','<=',10)]},
};
export const initialPlan:Plan={fundamental:fundamentalDefaults,trend:trendPresets.pullback.rules,industry:''};
// Kept for tests and backward compatibility of the first prototype.
export const defaultRules=[...fundamentalDefaults,rule('volatility','<=',30)];
export function format(value:number|null|undefined,field:Field|'price'){
 if(value==null||!Number.isFinite(value))return '—';
 if(field==='profit')return value.toLocaleString('zh-CN',{maximumFractionDigits:0});
 return value.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
}
export function ruleText(r:Rule){return `${fields[r.field].label} ${r.op} ${r.value}${fields[r.field].unit}`}
export function validateRules(input:unknown,allowEmpty=false):string[]{
 if(!Array.isArray(input)||(!input.length&&!allowEmpty)||input.length>48)return ['请保留1–48条条件（每个模型最多24条）'];
 const ids=new Set<string>();
 for(const r of input){if(!r||!Object.hasOwn(fields,r.field)||!['>','>=','<','<='].includes(r.op)||typeof r.value!=='number'||!Number.isFinite(r.value)||typeof r.id!=='string'||!r.id||ids.has(r.id))return ['条件格式无效：请检查指标、运算符、数值和编号'];ids.add(r.id)}
 return analyzeRules(input).filter(x=>x.kind==='conflict').map(x=>x.text);
}
export function analyzeRules(rules:Rule[]):Issue[]{
 const out:Issue[]=[];
 for(let i=0;i<rules.length;i++)for(let j=i+1;j<rules.length;j++){
  const a=rules[i],b=rules[j];if(a.field!==b.field)continue;
  const al=a.op.startsWith('>'),bl=b.op.startsWith('>');
  if(al!==bl){const l=al?a:b,u=al?b:a;if(l.value>u.value||(l.value===u.value&&(l.op==='>'||u.op==='<')))out.push({kind:'conflict',text:`${fields[a.field].label}上下限无法同时满足：${l.op}${l.value} 与 ${u.op}${u.value}`,ids:[a.id,b.id]})}
  else{const stronger=al?(a.value>b.value?a:a.value<b.value?b:a.op==='>'?a:b):(a.value<b.value?a:a.value>b.value?b:a.op==='<'?a:b);const weaker=stronger===a?b:a;out.push({kind:'duplicate',text:`「${ruleText(weaker)}」已被「${ruleText(stronger)}」覆盖，可移除较宽条件。`,ids:[a.id,b.id],removeId:weaker.id})}
 }
 for(const r of rules){if(fields[r.field]?.pending)out.push({kind:'unavailable',text:`${fields[r.field].label}：${fields[r.field].pending}。添加后会保留为待验证，不自动忽略。`,ids:[r.id]})}
 const has=(field:Field,fn:(r:Rule)=>boolean)=>rules.some(r=>r.field===field&&fn(r));
 if(has('volumeRatio',r=>r.op.startsWith('>')&&r.value>=1.5)&&has('volume3Ratio',r=>r.op.startsWith('<')&&r.value<=0.7))out.push({kind:'tradeoff',text:'当日放量与近3日明显缩量可以共存，但会显著收窄样本。确认你是在找“缩量后放量”，不是同时要求同一天放量和缩量。',ids:rules.filter(r=>['volumeRatio','volume3Ratio'].includes(r.field)).map(r=>r.id)});
 if(has('return5',r=>r.op.startsWith('>')&&r.value>=10)&&has('volatility',r=>r.op.startsWith('<')&&r.value<=20))out.push({kind:'tradeoff',text:'短期大幅上涨与较低历史波动是不同偏好，可能难以同时满足。它们不是逻辑冲突，系统不会自动删除任何一项。',ids:[]});
 if(has('pe',r=>r.op.startsWith('<')&&r.value<=10)&&has('profitGrowth',r=>r.op.startsWith('>')&&r.value>=30))out.push({kind:'tradeoff',text:'低估值与高利润增长同时要求可能使候选很少；增长也可能受低基数影响。请结合行业口径检查，不自动放宽。',ids:[]});
 return out;
}
export function evaluate(stock:Stock,rules:Rule[]){
 const checks:Check[]=rules.map(r=>{const actual=stock.metrics[r.field]??null;
 if(actual===null||!Number.isFinite(actual))return {rule:r,status:'unknown',actual:null,reason:fields[r.field].pending||'数据缺失，不能判断'};
 if((r.field==='pe'||r.field==='pb')&&actual<=0)return {rule:r,status:'unknown',actual,reason:'非正估值，当前口径不适用'};
 const pass=r.op==='>'?actual>r.value:r.op==='>='?actual>=r.value:r.op==='<'?actual<r.value:actual<=r.value;
 return {rule:r,status:pass?'pass':'fail',actual,reason:`实际 ${format(actual,r.field)}${fields[r.field].unit}，${pass?'满足':'不满足'} ${r.op}${r.value}`};});
 return {stock,checks,status:checks.some(c=>c.status==='fail')?'excluded':checks.some(c=>c.status==='unknown')?'unknown':'included'};
}
export function screen(stocks:Stock[],rules:Rule[]){const e=validateRules(rules);if(e.length)throw Error(e.join('；'));return stocks.map(s=>evaluate(s,rules))}
export function activeRules(plan:Plan,mode:Style){return mode==='intersection'?[...plan.fundamental,...plan.trend]:plan[mode]}
export function runPlan(stocks:Stock[],plan:Plan,mode:Style){return screen(stocks.filter(s=>!plan.industry||s.industry===plan.industry),activeRules(plan,mode))}
export function diffResults(before:ReturnType<typeof screen>,after:ReturnType<typeof screen>){const old=new Set(before.filter(r=>r.status==='included').map(r=>r.stock.code)),now=new Set(after.filter(r=>r.status==='included').map(r=>r.stock.code));return {added:after.filter(r=>now.has(r.stock.code)&&!old.has(r.stock.code)).map(r=>r.stock),removed:before.filter(r=>old.has(r.stock.code)&&!now.has(r.stock.code)).map(r=>r.stock)}}
export function planChanges(before:Plan,after:Plan){const changes:string[]=[];if(before.industry!==after.industry)changes.push(`行业：${before.industry||'不限'} → ${after.industry||'不限'}`);for(const g of ['fundamental','trend'] as Group[]){const label=g==='fundamental'?'基本面':'趋势';for(const r of before[g])if(!after[g].some(n=>n.field===r.field&&n.op===r.op&&n.value===r.value))changes.push(`${label}移除：${ruleText(r)}`);for(const r of after[g])if(!before[g].some(n=>n.field===r.field&&n.op===r.op&&n.value===r.value))changes.push(`${label}加入：${ruleText(r)}`)}return changes}
