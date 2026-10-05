"""Derive observed-date technical features from retained public OHLCV. No fetching or invented values."""
import json, statistics, math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'tests/fixtures/legacy-snapshot.json';data=json.loads(p.read_text())
mean=lambda a:sum(a)/len(a)
for s in data['stocks']:
 e=json.loads((root/'public'/s['evidencePath'].lstrip('/')).read_text())
 records=e['records']['prices']['raw']['daily']
 bars=[dict(date=r[0],open=float(r[1]),close=float(r[2]),high=float(r[3]),low=float(r[4]),volume=float(r[5])) for r in records if r[0]<=data['asOf']]
 assert len(bars)>=65 and bars[-1]['date']==data['asOf']
 assert all(b['close']>0 and b['high']>=max(b['open'],b['close']) and b['low']<=min(b['open'],b['close']) and b['volume']>=0 for b in bars)
 close=[b['close'] for b in bars];vol=[b['volume'] for b in bars]
 for i,b in enumerate(bars):
  b['ma20']=mean(close[i-19:i+1]) if i>=19 else None
  b['ma60']=mean(close[i-59:i+1]) if i>=59 else None
 m=s['metrics'];ma20=mean(close[-20:]);ma60=mean(close[-60:])
 m.update(maSpread=(ma20/ma60-1)*100,maSlope=(ma20/mean(close[-25:-5])-1)*100,maDistance=(close[-1]/ma20-1)*100,
  pullback10=(1-close[-1]/max(close[-10:]))*100,volumeRatio=vol[-1]/mean(vol[-21:-1]) if mean(vol[-21:-1])>0 else None,
  volume3Ratio=mean(vol[-3:])/mean(vol[-23:-3]) if mean(vol[-23:-3])>0 else None,
  breakoutDistance=(close[-1]/max(b['high'] for b in bars[-21:-1])-1)*100,
  range10=(max(b['high'] for b in bars[-10:])/min(b['low'] for b in bars[-10:])-1)*100)
 for n in [3,5,10,20]:m[f'return{n}']=(close[-1]/close[-n-1]-1)*100
 s['bars']=bars[-90:]
 s['provenance']={k:{'provider':'腾讯证券日线 / 本地计算','date':data['asOf']} for k in ['maSpread','maSlope','maDistance','pullback10','volumeRatio','volume3Ratio','breakoutDistance','range10','return3','return5','return10','return20','volatility','drawdown']}
data['version']='snapshot-20260930-v3'
extra=['技术指标按观测日计算，停牌可能造成窗口与完整交易日历不一致。','量能比值使用相同来源原始成交量，不将其等同于资金净流入；日线取收盘后完整值。','板块主线、机构席位、成交额集中度尚未接入，不从30只样本外推全市场。']
data['limitations']=[x for x in data['limitations'] if x not in extra]+extra
p.write_text(json.dumps(data,ensure_ascii=False,indent=2))
print('Derived trend features for',len(data['stocks']),'real stocks; snapshot',data['version'])
