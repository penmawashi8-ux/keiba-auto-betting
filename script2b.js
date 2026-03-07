function calculatePortfolio(oddsArr,budget,count){
budget=parseInt(budget)||3000;
var sorted=oddsArr.slice().filter(function(o){return o.odds>=1.1;}).sort(function(a,b){return a.odds-b.odds;});

var best=null;
var maxN=count?Math.min(parseInt(count),sorted.length):Math.min(10,sorted.length);
for(var n=2;n<=maxN;n++){
var horses=sorted.slice(0,n);
var invSum=horses.reduce(function(s,h){return s+1/h.odds;},0);
var bets=horses.map(function(h){var raw=(1/h.odds)/invSum*budget;return Math.max(100,Math.round(raw/100)*100);});
var total=bets.reduce(function(s,b){return s+b;},0);
if(total>budget*1.1)break;
var minReturn=null;
for(var i=0;i<horses.length;i++){var ret=bets[i]/100*horses[i].odds*100;if(minReturn===null||ret<minReturn)minReturn=ret;}
var minProfit=minReturn-total;
if(minProfit>0){best={horses:horses,bets:bets,total:total,minReturn:minReturn,minProfit:minProfit,n:n};}
}
if(!best)return{found:false};
var maxReturn=null;
for(var i=0;i<best.horses.length;i++){var ret=best.bets[i]/100*best.horses[i].odds*100;if(maxReturn===null||ret>maxReturn)maxReturn=ret;}
best.maxReturn=maxReturn;
best.found=true;
return best;
}

function displayPortfolioInfo(portfolio){
var box=document.getElementById('portfolioInfo');
if(!portfolio.found){box.innerHTML='<p style="color:#999">割れ目なし</p>';return;}
var html='<div class="portfolio-box">';
for(var i=0;i<portfolio.horses.length;i++){
var h=portfolio.horses[i];
var b=portfolio.bets[i];
var ret=Math.round(b/100*h.odds*100);
html+='<div class="bet-row">';
html+='<div class="bet-horse">'+h.horse_num+'番'+(h.horse_name?' '+h.horse_name:'')+'</div>';
html+='<div class="bet-amount">'+b+'円</div>';
html+='<div class="bet-return">@ '+h.odds+'倍 → '+ret+'円</div>';
html+='</div>';
}
var minR=Math.round(portfolio.minReturn);
var maxR=Math.round(portfolio.maxReturn);
html+='<div class="summary-box">';
html+='<div class="summary-row"><span>合計投資:</span><span>'+portfolio.total+'円</span></div>';
html+='<div class="summary-row"><span>払戻:</span><span>'+minR+'〜'+maxR+'円</span></div>';
html+='<div class="summary-row"><span>最低利益:</span><span class="profit">+'+Math.round(portfolio.minProfit)+'円</span></div>';
html+='</div></div>';
box.innerHTML=html;
}

function buildNbCode(raceId,horseNum,amount){
var venue=raceId.slice(4,6);
var rnum=parseInt(raceId.slice(10,12));
var rHex=rnum.toString(16).toUpperCase();
var bits=[0x8000,0x4000,0x2000,0x1000,0x0800,0x0400,0x0200,0x0100,0x0080,0x0040,0x0020,0x0010,0x0008,0x0004,0x0002];
var bit=bits[horseNum-1]||0;
var bitHex=bit.toString(16).toUpperCase().padStart(4,'0');
var horseBits=bitHex+'00000000000';
return '1'+'00'+venue+rHex+'7'+'01'+'8'+horseBits+'0001';
}

function goToUmaca(){
var portfolio=window.cachedPortfolio;
var raceId=typeof getRaceId==='function'?getRaceId():'';
if(!portfolio||!portfolio.found){alert('ポートフォリオがありません');return;}
if(!raceId||raceId.length!==12){alert('race_idが不正です');return;}
var token=localStorage.getItem('gh_token')||prompt('GitHub Token:');
if(token)localStorage.setItem('gh_token',token);
var venue=raceId.slice(4,6);
var rHex=parseInt(raceId.slice(10,12)).toString(16).toUpperCase();
var nbList=[];
for(var i=0;i<portfolio.horses.length;i++){
var h=portfolio.horses[i];
var b=portfolio.bets[i];
var horseHex=((28-h.horse_num*4)>>>0).toString(16).toUpperCase().padStart(2,'0');
var amt=Math.round(b/100);
nbList.push('1'+'00'+venue+rHex+'70'+horseHex+'00000000000000'+h.horse_num.toString().padStart(2,'0')+amt);
}
var data={nb:nbList,total:portfolio.total,ts:Date.now()};
var url='https://api.github.com/repos/penmawashi8-ux/keiba-auto-betting/contents/bets.json';
fetch(url,{headers:{Authorization:'token '+token}}).then(function(r){return r.json();}).then(function(d){
var sha=d.sha||undefined;
var body={message:'update bets',content:btoa(JSON.stringify(data))};
if(sha)body.sha=sha;
return fetch(url,{method:'PUT',headers:{Authorization:'token '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
}).then(function(r){
if(r.status===200||r.status===201){
alert('購入データ保存完了！\nウマカスマート740画面でブックマークレット「自動入力」をタップしてください\n\n合計:'+portfolio.total+'円');
}else{
alert('保存失敗: '+r.status);
}
}).catch(function(e){alert('エラー: '+e.message);});
}



window.calculatePortfolio=calculatePortfolio;
window.displayPortfolioInfo=displayPortfolioInfo;
window.goToUmaca=goToUmaca;
window.cachedPortfolio=null;
function generateMockOdds(){
var mock=[];
for(var i=1;i<=12;i++){
mock.push({horse_num:i,horse_name:'',odds:Math.round((1+Math.random()*19)*10)/10,popular:i});
}
mock.sort(function(a,b){return a.odds-b.odds;});
mock.forEach(function(o,i){o.popular=i+1;});
return mock;
}
window.generateMockOdds=generateMockOdds;

function displayResults(odds,portfolio){
var el=document.getElementById('oddsResult');
if(!el)return;
var html='<table><tr><th>馬番</th><th>オッズ</th><th>人気</th></tr>';
odds.forEach(function(o){
html+='<tr><td>'+o.horse_num+'</td><td>'+o.odds+'</td><td>'+o.popular+'</td></tr>';
});
html+='</table>';
el.innerHTML=html;
}
window.displayResults=displayResults;
