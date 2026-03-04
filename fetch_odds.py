import requests,json,sys,os,re
from datetime import datetime,timezone,timedelta
JST=timezone(timedelta(hours=9))

def fetch_horse_names(race_id,h,s):
    url='https://race.sp.netkeiba.com/?pid=shutuba&race_id='+race_id
    try:
        r=s.get(url,headers=h,timeout=15,allow_redirects=True)
        print('SHUTUBA_LEN:'+str(len(r.text)))
        horses={}
        matches=re.findall(r'shutuba_modal[^>]*[?&]i=(\d+)[^>]*>\s*([^<]+)</a>',r.text)
        print('MATCHES:'+str(matches[:5]))
        for m in matches:
            try:
                n=int(m[0])
                nm=m[1].strip()
                if nm and 1<=n<=18:
                    horses[n]=nm
            except:
                pass
        print('NAMES:'+str(horses))
        return horses
    except Exception as e:
        print('NAMES_ERR:'+str(e))
        return {}

def fetch_odds(race_id):
    h={
        'User-Agent':'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Referer':'https://race.netkeiba.com/',
        'Accept':'application/json,text/html,*/*',
        'Accept-Language':'ja-JP,ja;q=0.9',
    }
    s=requests.Session()
    names=fetch_horse_names(race_id,h,s)
    url='https://race.netkeiba.com/api/api_get_jra_odds.html?race_id='+race_id+'&type=1&action=update'
    print('TRY:'+url)
    try:
        r=s.get(url,headers=h,timeout=15)
        print('STATUS:'+str(r.status_code))
        d=r.json()
        odds_raw=d.get('data',{}).get('odds',{}).get('1',{})
        odds=[]
        for k,v in odds_raw.items():
            try:
                n=int(k)
                ov=float(v[0])
                nm=names.get(n,str(n))
                odds.append({'horse_num':n,'horse_name':nm,'odds':ov})
            except:
                pass
        odds.sort(key=lambda x:x['odds'])
        print('PARSED:'+str(len(odds)))
        return odds
    except Exception as e:
        print('ERR:'+str(e))
    return []

def main():
    race_id=sys.argv[1] if len(sys.argv)>=2 else os.environ.get('RACE_ID','')
    if not race_id:
        sys.exit(1)
    print('RACEID:'+race_id)
    odds=fetch_odds(race_id)
    at=datetime.now(JST).isoformat()
    st='ok' if odds else 'error'
    result={'race_id':race_id,'fetched_at':at,'status':st,'count':len(odds),'odds':odds}
    if not odds:
        result['error']='no odds found'
    with open('odds.json','w',encoding='utf-8') as f:
        json.dump(result,f,ensure_ascii=False,indent=2)
    print('DONE:'+str(len(odds))+' entries written')
    if not odds:
        sys.exit(1)

if __name__=='__main__':
    main()
