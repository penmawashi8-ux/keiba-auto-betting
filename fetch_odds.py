import requests,json,re,sys,os
from datetime import datetime,timezone,timedelta
JST=timezone(timedelta(hours=9))
def fetch_odds(race_id):
    h={"User-Agent":"Mozilla/5.0","Referer":"https://race.sp.netkeiba.com/","Accept-Language":"ja"}
    s=requests.Session()
    for u in ["https://race.sp.netkeiba.com/?pid=odds_view&race_id="+race_id+"&type=b1","https://race.netkeiba.com/odds/index.html?race_id="+race_id+"&type=b1"]:
        try:
            r=s.get(u,headers=h,timeout=15)
            r.raise_for_status()
            o=parse(r.text)
            if o:return o
        except Exception as e:print(str(e))
    return []
def parse(html):
    odds=[]
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>",html,re.DOTALL|re.IGNORECASE):
        cells=re.findall(r"<td[^>]*>(.*?)</td>",row,re.DOTALL|re.IGNORECASE)
        if len(cells)<2:continue
        cl=[re.sub(r"<[^>]+>","",c).strip() for c in cells]
        try:n=int(cl[0])
        except:continue
        if not(1<=n<=18):continue
        ov=None
        nm=str(n)
        for v in cl[1:]:
            try:
                f=float(v.replace(",",""))
                if 1.0<=f<9999:ov=f
            except:
                if 2<=len(v)<=15 and not re.match(r"^\d",v):nm=v
        if ov:odds.append({"horse_num":n,"horse_name":nm,"odds":ov})
    seen=set()
    res=[]
    for o in odds:
        if o["horse_num"] not in seen:
            seen.add(o["horse_num"])
            res.append(o)
    res.sort(key=lambda x:x["odds"])
    return res
def main():
    race_id=sys.argv[1] if len(sys.argv)>=2 else os.environ.get("RACE_ID","")
    if not race_id:sys.exit(1)
    odds=fetch_odds(race_id)
    result={"race_id":race_id,"fetched_at":datetime.now(JST).isoformat(),"status":"ok" if odds else "error","count":len(odds),"odds":odds}
    with open("odds.json","w",encoding="utf-8") as f:json.dump(result,f,ensure_ascii=False,indent=2)
    print(str(len(odds))+" entries written")
    if not odds:sys.exit(1)
if __name__=="__main__":main()
