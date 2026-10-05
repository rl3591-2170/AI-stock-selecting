export const fields = {
  revenueGrowth: {label:'营收同比增长',unit:'%',source:'financial',raw:'TOI_RATIO',definition:'2026年上半年累计营业总收入同比；沿用来源披露口径。'},
  profitGrowth: {label:'归母净利润同比增长',unit:'%',source:'financial',raw:'PARENT_NETPROFIT_RATIO',definition:'2026年上半年累计归母净利润同比；亏损或低基数可能使增长率失真，建议同时要求盈利。'},
  profit: {label:'归母净利润',unit:'元',source:'financial',raw:'PARENT_NETPROFIT',definition:'2026年上半年累计归属于母公司股东的净利润，人民币元。'},
  pe: {label:'市盈率 PE(TTM)',unit:'倍',source:'valuation',raw:'PE_TTM',definition:'基准日来源计算的总市值 / 近12个月归母净利润；≤0时不适用正盈利估值筛选。'},
  pb: {label:'市净率 PB',unit:'倍',source:'valuation',raw:'PB_MRQ',definition:'基准日来源计算的总市值 / 最近报告期归母净资产；≤0时不适用。'},
  volatility: {label:'60日年化波动率',unit:'%',source:'prices',raw:'daily（qfq）→ [2] 收盘价',definition:'最近61个前复权收盘价生成60个简单收益率，样本标准差 × √252 × 100。按观测日计，非未来风险预测。'},
  drawdown: {label:'60日区间最大回撤',unit:'%',source:'prices',raw:'daily（qfq）→ [2] 收盘价',definition:'最近61个前复权收盘价中，历史峰值至后续低点的最大跌幅，取正数。'},
  marketCap: {label:'总市值',unit:'亿元',source:'valuation',raw:'TOTAL_MARKET_CAP / 1e8',definition:'基准日总市值，人民币亿元。'},
} as const;
export type Field = keyof typeof fields;
export type Rule = {id:string;field:Field;op:'>'|'>='|'<'|'<=';value:number};
export type Stock = {code:string;name:string;industry:string;metrics:Partial<Record<Field|'price'|'revenue',number|null>>;errors:string[];sources:Record<string,string>;prices:{date:string;close:number}[];evidencePath:string;reportDate?:string;disclosedAt?:string;tradeDate?:string};
export type Snapshot = {version:string;asOf:string;financialPeriod:string;fetchedAt:string;source:string;universe:string;limitations:string[];stocks:Stock[]};
export type Check = {rule:Rule;status:'pass'|'fail'|'unknown';actual:number|null;reason:string};
export const defaultRules:Rule[] = [
  {id:'r1',field:'revenueGrowth',op:'>',value:0},
  {id:'r2',field:'profitGrowth',op:'>',value:0},
  {id:'r3',field:'profit',op:'>',value:0},
  {id:'r4',field:'pe',op:'<=',value:25},
  {id:'r5',field:'volatility',op:'<=',value:30},
];
export function format(value:number|null|undefined, field:Field|'price') {
  if (value == null || !Number.isFinite(value)) return '—';
  if (field === 'profit') return `${(value/1e8).toFixed(2)} 亿`;
  return value.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
}
export function validateRules(input:unknown):string[] {
  if (!Array.isArray(input) || !input.length || input.length>12) return ['请保留 1–12 条条件'];
  const errors:string[]=[];
  for(const r of input) {
    if(!r || !Object.hasOwn(fields,r.field) || !['>','>=','<','<='].includes(r.op) || typeof r.value !== 'number' || !Number.isFinite(r.value)) errors.push('存在不支持的指标、运算符或非有限数值');
  }
  if(errors.length) return errors;
  for(const field of Object.keys(fields)) {
    const rules=input.filter(r=>r.field===field);
    const lower=rules.filter(r=>r.op==='>'||r.op==='>=');
    const upper=rules.filter(r=>r.op==='<'||r.op==='<=');
    for(const l of lower) for(const u of upper) if(l.value>u.value || (l.value===u.value && (l.op==='>'||u.op==='<'))) errors.push(`${fields[field as Field].label}的上下限冲突`);
  }
  return [...new Set(errors)];
}
export function evaluate(stock:Stock,rules:Rule[]) {
  const checks:Check[]=rules.map(rule=>{
    const actual=stock.metrics[rule.field] ?? null;
    if(actual===null || !Number.isFinite(actual)) return {rule,status:'unknown',actual:null,reason:'数据缺失，不能判断'};
    if((rule.field==='pe'||rule.field==='pb') && actual<=0) return {rule,status:'unknown',actual,reason:'非正值，当前估值口径不适用'};
    const pass=rule.op==='>'?actual>rule.value:rule.op==='>='?actual>=rule.value:rule.op==='<'?actual<rule.value:actual<=rule.value;
    return {rule,status:pass?'pass':'fail',actual,reason:`${format(actual,rule.field)} ${fields[rule.field].unit}，${pass?'满足':'不满足'} ${rule.op} ${rule.value}`};
  });
  const status=checks.some(c=>c.status==='fail')?'excluded':checks.some(c=>c.status==='unknown')?'unknown':'included';
  return {stock,checks,status};
}
export function screen(stocks:Stock[],rules:Rule[]) {
  const errors=validateRules(rules);
  if(errors.length) throw new Error(errors.join('；'));
  return stocks.map(stock=>evaluate(stock,rules));
}
export function diffResults(before:ReturnType<typeof screen>,after:ReturnType<typeof screen>) {
  const old=new Set(before.filter(r=>r.status==='included').map(r=>r.stock.code));
  const now=new Set(after.filter(r=>r.status==='included').map(r=>r.stock.code));
  return {added:after.filter(r=>now.has(r.stock.code)&&!old.has(r.stock.code)).map(r=>r.stock),removed:before.filter(r=>old.has(r.stock.code)&&!now.has(r.stock.code)).map(r=>r.stock)};
}
