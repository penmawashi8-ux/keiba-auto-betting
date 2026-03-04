import requests,json,re,sys,os
from datetime import datetime,timezone,timedelta
JST=timezone(timedelta(hours=9))

def fetch_odds(race_id):
    h={
        'User-Agent':'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Referer':'https://race.sp.netkeiba.com/',
        'Accept':'text/html,application/xhtml+xml,*/*',
        'Accept-Language':'ja-JP,ja;q=0.9',
    }
    s=requests.Session()
    urls=[
        'https://race.sp.netkeiba.com/?pid=odds_view&race_id='+race_id+'&type=b1',
        'https://race.netkeiba.com/odds/index.html?race_id='+race_id+'&type=b1',
    ]
    for url in urls:
        print('TRY:'+url)
        try:
            r=s.get(url,headers=h,timeout=15,allow_redirects=True)
            print('STATUS:'+str(r.status_code)+' LEN:'+str(len(r.text)))
            o=parse(r.text)
            if o:
                print('PARSED:'+str(len(o)))
                return o
            print('PARSE:0')
        except Exception as e:
            print('ERR:'+str(e))
    return []

def parse(html):
    odds=[]
    m=re.search(r'OddsWin\s*=\s*(\{.*?\})\s*;',html,re.DOTALL)
    if m:
        try:
            d=json.loads(m.group(1))
            for k,v in d.items():
                try:
                    n=int(k)
                    f=float(str(v).replace(',',''))
                    if 1<=n<=18 and 1.0<=f<9999:
                        odds.append({'horse_num':n,'horse_name':str(n),'odds':f})
                except:pass
            if odds:
                odds.sort(key=lambda x:x['odds'])
                return odds
        except:pass

    rows=re.findall(r'<tr[^>]*>(.*?)</tr>',html,re.DOTALL|re.IGNORECASE)
    for row in rows:
        cells=re.findall(r'<td[^>]*>(.*?)</td>',row,re.DOTALL|re.IGNORECASE)
        if len(cells)<3:continue
        cl=[re.sub(r'<[^>]+>','',c).strip() for c in cells]
        cl=[x for x in cl if x]
        if not cl:continue
        try:n=int(cl[0])
        except:continue
        if not(1<=n<=18):continue
        ov=None
        nm=str(n)
        for v in cl[1:]:
            v2=v.replace(',','')
            try:
                f=float(v2)
                if 1.0<=f<9999 and '.' in v2:
                    ov=f
            except:
                if 2<=len(v)<=20 and not re.match(r'^\d',v) and v not in ['---.-','--']:
                    nm=v
        if ov:
            odds.append({'horse_num':n,'horse_name':nm,'odds':ov})

    seen=set()
    res=[]
    for o in odds:
        if o['horse_num'] not in seen:
            seen.add(o['horse_num'])
            res.append(o)
    res.sort(key=lambda x:x['odds'])
    return res

def main():
    race_id=sys.argv[1] if len(sys.argv)>=2 else os.environ.get('RACE_ID','')
    if not race_id:sys.exit(1)
    print('RACEID:'+race_id)
    odds=fetch_odds(race_id)
    result={'race_id':race_id,'fetched_at":datetime.now(JST).isoformat(),'status':'ok' if odds else 'error','count':len(odds),'odds':odds}
    if not odds:result['error']='no odds found'
    with open('odds.json','w',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
    print('DONE:'+str(len(odds))+' entries written')
    if not odds:sys.exit(1)

if __name__=='__main__':main()
