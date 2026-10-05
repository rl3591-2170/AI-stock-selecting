"""Fetch a curated research universe. No credentials, no invented observations."""
import concurrent.futures
import datetime
import json
import math
import pathlib
import statistics
import subprocess
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data'
OUT.mkdir(exist_ok=True)
(OUT / 'evidence').mkdir(exist_ok=True)
ASOF = '2026-09-30'
PERIOD = '2026-06-30'
# Explicitly curated, not an index or representative market sample.
CODES = ['600519','000858','000568','600887','603288','000333','000651','600690',
         '300750','002594','601012','600438','600309','002415','300059','600036',
         '601318','601398','600900','601088','600028','601857','601668','600406',
         '002475','000063','600276','000538','600585','600048']

def request(url):
    for attempt in range(3):
        try:
            raw = subprocess.run(['curl','-fsS','--max-time','25','-A','Mozilla/5.0',url],
                                 check=True,capture_output=True,text=True).stdout
            return json.loads(raw)
        except Exception:
            if attempt == 2: raise
            time.sleep(attempt + 1)

def report(name, filt, sort=None):
    params = dict(reportName=name, columns='ALL', pageSize=5, pageNumber=1, filter=filt)
    if sort: params.update(sortColumns=sort, sortTypes=-1)
    url = 'https://datacenter-web.eastmoney.com/api/data/v1/get?' + urllib.parse.urlencode(params)
    raw = request(url)
    rows = (raw.get('result') or {}).get('data') or []
    if not raw.get('success') or not rows: raise ValueError('No records: '+name)
    return rows[0], url

def fetch(code):
    row = {'code':code, 'name':code, 'industry':'待确认', 'metrics':{}, 'errors':[], 'sources':{}, 'prices':[]}
    evidence = {'code':code, 'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'records':{}}
    secucode = code + ('.SH' if code.startswith('6') else '.SZ')
    jobs = [
      ('financial', lambda: report('RPT_DMSK_FN_INCOME', f'(SECURITY_CODE="{code}")(REPORT_DATE=\'{PERIOD}\')')),
      ('valuation', lambda: report('RPT_VALUEANALYSIS_DET', f'(SECUCODE="{secucode}")(TRADE_DATE=\'{ASOF}\')'))]
    for kind, fn in jobs:
        try:
            data, url = fn()
            evidence['records'][kind] = {'url':url, 'raw':data}
            row['sources'][kind] = url
            row['name'] = data.get('SECURITY_NAME_ABBR') or row['name']
            if kind == 'financial':
                row['industry'] = data.get('INDUSTRY_NAME') or row['industry']
                row['disclosedAt'] = data.get('NOTICE_DATE','')[:10]
                row['reportDate'] = data['REPORT_DATE'][:10]
                if row['disclosedAt'] > ASOF:
                    row['errors'].append('财务记录披露晚于基准日，指标不参与筛选')
                    continue
                row['metrics'].update(revenueGrowth=data.get('TOI_RATIO'), profitGrowth=data.get('PARENT_NETPROFIT_RATIO'),
                    profit=data.get('PARENT_NETPROFIT'), revenue=data.get('TOTAL_OPERATE_INCOME'))
            else:
                row['tradeDate'] = data['TRADE_DATE'][:10]
                row['metrics'].update(pe=data.get('PE_TTM'), pb=data.get('PB_MRQ'), price=data.get('CLOSE_PRICE'),
                    marketCap=(data['TOTAL_MARKET_CAP']/1e8 if data.get('TOTAL_MARKET_CAP') is not None else None))
        except Exception as e: row['errors'].append(kind+': '+str(e)[:160])
    try:
        symbol = ('sh' if code.startswith('6') else 'sz')+code
        url = f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={symbol},day,2026-01-01,{ASOF},320,qfq'
        response = request(url)
        section = (response.get('data') or {}).get(symbol) or {}
        lines = section.get('qfqday') or section.get('day') or []
        raw = {'symbol':symbol,'adjust':'qfq','daily':lines}
        points = [{'date':v[0], 'close':float(v[2])} for v in lines if v[0] <= ASOF][-61:]
        if len(points) != 61 or points[-1]['date'] != ASOF: raise ValueError('行情不足61个观测值或末日不匹配')
        if any(p['close'] <= 0 for p in points): raise ValueError('无效收盘价')
        returns = [points[i]['close']/points[i-1]['close']-1 for i in range(1, len(points))]
        row['metrics']['volatility'] = statistics.stdev(returns)*math.sqrt(252)*100
        peak = points[0]['close']; drawdown = 0
        for point in points:
            peak = max(peak,point['close'])
            drawdown = max(drawdown, (1-point['close']/peak)*100)
        row['metrics']['drawdown'] = drawdown
        row['prices'] = points
        row['sources']['prices'] = url
        evidence['records']['prices'] = {'url':url, 'raw':raw, 'usedPoints':points,
             'formula':'sample stdev(close[t]/close[t-1]-1) × sqrt(252) × 100; 60 observed daily returns, qfq'}
    except Exception as e: row['errors'].append('prices: '+str(e)[:160])
    row['evidencePath'] = '/data/evidence/'+code+'.json'
    (OUT/'evidence'/f'{code}.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
    print(code, row['name'], len(row['metrics']), row['errors'], flush=True)
    return row

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        stocks = list(pool.map(fetch,CODES))
    dataset = {'version':'snapshot-20260930-v1','asOf':ASOF, 'financialPeriod':PERIOD,
        'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'source':'东方财富（财务、估值）与腾讯证券（前复权行情）公开接口',
        'universe':'手工选取的30只A股研究样本，非指数成分、非全市场、非推荐名单',
        'limitations':['固定历史快照，不是实时行情；不用于历史回测。',
          '当前接口可能返回后续修订记录，披露日晚于基准日的财务记录不参与筛选；不承诺历史时点数据库。',
          '行情为获取时点的前复权序列；波动率使用最近60个观测日收益率，停牌跨日收益可能影响可比性。',
          '财务为2026年上半年累计值，增长率沿用来源字段，非单季度增速。',
          '跨行业PE及利润增速不可直接解释为投资价值；负PE不适用于正盈利估值筛选。'],
        'stocks':stocks}
    (OUT/'snapshot.json').write_text(json.dumps(dataset,ensure_ascii=False,indent=2))
    print('Saved',len(stocks),'stocks; missing prices:',sum(not x['prices'] for x in stocks))
