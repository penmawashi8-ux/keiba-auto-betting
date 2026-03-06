function generateMockOdds() {
  return [
    {horse_num:3, odds:2.1, horse_name:'ã¢ã­ã¼ã¨ã¯ã¹ãã¬ã¹'},
    {horse_num:7, odds:3.5, horse_name:'ã´ã¼ã«ãã·ãã'},
    {horse_num:1, odds:4.2, horse_name:'ãã£ã¼ãã¤ã³ãã¯ã'},
    {horse_num:11,odds:8.5, horse_name:'ã­ã³ã°ã«ã¡ãã¡ã'},
    {horse_num:5, odds:12.0,horse_name:'ãªã«ãã§ã¼ã´ã«'},
    {horse_num:9, odds:18.5,horse_name:'ã¸ã§ã³ãã¤ã«ãã³ã'},
    {horse_num:2, odds:25.0,horse_name:'ãã¨ããã¹ã¿'},
    {horse_num:14,odds:35.0,horse_name:'ã¦ãªãã«'},
  ].sort(function(a,b){ return a.odds - b.odds; });
}

function calculatePortfolio(odds, budgetInput, countInput) {
  if (!odds || odds.length < 4) return {found:false, reason:'åºèµ°é¦¬ãå°ãªããã¾ã'};

  var top3 = odds.slice(0,3);
  var rest  = odds.slice(3);
  function avg(arr){ var s=0; arr.forEach(function(o){s+=o.odds;}); return s/arr.length; }
  var spread = avg(rest) / avg(top3);
  console.log('å²ãç®ææ°:', spread.toFixed(2));
  if (spread < 2.0) {
    return {found:false, spread:spread.toFixed(2), reason:'å²ãç®ææ° '+spread.toFixed(2)+' < 2.0 ã®ããè³¼å¥è¦éã'};
  }

  var budget = budgetInput ? parseInt(budgetInput) : 1000;
  var maxCount = countInput ? parseInt(countInput) : odds.length;
  var candidates = odds.slice(0, maxCount);

  // éæ°æ¯çéåã§å©çãåºãæå¤§é ­æ°ãæ¢ã
  var picks = [];
  for (var n = candidates.length; n >= 1; n--) {
    var top = candidates.slice(0, n);
    var inv = top.map(function(o){ return 1/o.odds; });
    var sumInv = inv.reduce(function(s,v){ return s+v; }, 0);
    var bets = top.map(function(o,i){
      return Math.max(100, Math.round(inv[i]/sumInv*budget/100)*100);
    });
    var totalBet = bets.reduce(function(s,v){ return s+v; }, 0);
    var minPayout = Math.min.apply(null, top.map(function(o,i){
      return Math.round(bets[i]*o.odds);
    }));
    if (minPayout > totalBet) {
      picks = top.map(function(o,i){
        return {horse_num:o.horse_num, horse_name:o.horse_name, odds:o.odds, bet:bets[i], payout:Math.round(bets[i]*o.odds)};
      });
      break;
    }
  }

  if (!picks || picks.length === 0) {
    return {found:false, spread:spread.toFixed(2), reason:'äºç®åã§å©çãåºãçµã¿åãããè¦ã¤ããã¾ãã'};
  }

  var totalBet = picks.reduce(function(s,p){ return s+p.bet; }, 0);
  var payouts  = picks.map(function(p){ return p.payout; });
  var minPay   = Math.min.apply(null, payouts);
  var maxPay   = Math.max.apply(null, payouts);
  var pickRatio = picks.length / odds.length;

  // éç¥æ¡ä»¶ãã§ãã¯: é ­æ°40%ä»¥ä¸ or å²ãç®ææ°3.0ä»¥ä¸
  var condA = pickRatio >= 0.4;
  var condB = spread >= 3.0;
  var recommended = condA || condB;
  var recommendReason = [];
  if (condA) recommendReason.push('é ­æ°' + picks.length + '/' + odds.length + 'é ­(' + Math.round(pickRatio*100) + '%)');
  if (condB) recommendReason.push('å²ãç®ææ°' + spread.toFixed(2));

  return {
    found: true,
    recommended: recommended,
    recommendReason: recommendReason.join(' & '),
    spread: spread.toFixed(2),
    picks: picks,
    totalBet: totalBet,
    minPay: minPay,
    maxPay: maxPay,
    minProfit: minPay - totalBet,
    pickRatio: pickRatio
  };
}

function displayResults(odds, portfolio) {
  var html = '<h3 style="margin-bottom:8px;font-size:14px;">\uD83D\uDCCA \u5358\u52dd\u30aa\u30c3\u30ba\u4e00\u89a7\uff08\u4eba\u6c17\u9806\uff09</h3>';
  html += '<table><thead><tr><th>\u4eba\u6c17</th><th>\u99ac\u756a</th><th>\u99ac\u540d</th><th>\u5358\u52dd</th></tr></thead><tbody>';
  for (var i=0; i<odds.length; i++) {
    var o = odds[i];
    var isPick = portfolio.found && portfolio.picks.some(function(p){ return p.horse_num===o.horse_num; });
    var style = isPick ? 'background:#fff9c4;font-weight:bold;' : '';
    html += '<tr style="'+style+'"><td>'+(i+1)+'\u4eba\u6c17</td><td>'+o.horse_num+'</td><td>'+o.horse_name+'</td><td>'+o.odds.toFixed(1)+'\u500d</td></tr>';
  }
  html += '</tbody></table>';
  if (portfolio.found && portfolio.recommended) {
    html += '<div class="alert-success">\u2705 <strong>\u8cfc\u5165\u63a8\u5968\uff01</strong> '+portfolio.recommendReason+'<br>\u5272\u308c\u76ee\u6307\u6570: <strong>'+portfolio.spread+'\u500d</strong></div>';
  } else if (portfolio.found && !portfolio.recommended) {
    html += '<div class="alert-danger">\u26A0\uFE0F <strong>\u6761\u4ef6\u4e0d\u6e80\u8db3</strong> \u2014 \u982'+Math.round(portfolio.pickRatio*100)+'%\u30fb\u6307\u6570'+portfolio.spread+'(\u30564\u0030%\u4ee5\u4e0a\u304b\u6307\u65703.0\u4ee5\u4e0a\u304c\u5fc5\u8981)</div>';
  } else {
    html += '<div class="alert-danger">\u274C <strong>\u8cfc\u5165\u898b\u9001\u308a</strong> \u2014 '+portfolio.reason+'</div>';
  }
  document.getElementById('oddsResult').innerHTML = html;
}

function displayPortfolioInfo(portfolio) {
  var html = '<div class="portfolio-box">';
  for (var i=0; i<portfolio.picks.length; i++) {
    var p = portfolio.picks[i];
    html += '<div class="bet-row">\uD83D\uDC0E <strong>'+p.horse_num+'\u756a '+p.horse_name+'</strong><span class="bet-amount">'+p.bet+'\u5186</span><span class="odds-label">@ '+p.odds.toFixed(1)+'\u500d \u2192 <strong>'+p.payout+'\u5186</strong></span></div>';
  }
  var profit = portfolio.minProfit;
  html += '<div class="summary-row"><div>\u5408\u8a08\u6295\u8cc7: <strong>'+portfolio.totalBet+'\u5186</strong></div><div>\u6255\u6231: <strong>'+portfolio.minPay+'\u301c'+portfolio.maxPay+'\u5186</strong>\u3000\u6700\u4f4e\u5229\u76ca: <strong class="'+(profit>=0?'profit':'loss')+'">'+(profit>=0?'+':'')+profit+'\u5186</strong></div></div>';
  html += '</div>';
  document.getElementById('portfolioInfo').innerHTML = html;
}

function handleGoToUmaca() {
  if (!cachedPortfolio || !cachedPortfolio.found) { showError('\u8cfc\u5165\u63a8\u5968\u306e\u30dd\u30fc\u30c8\u30d5\u30a9\u30ea\u30aa\u304c\u3042\u308a\u307e\u305b\u3093'); return; }
  var lines = cachedPortfolio.picks.map(function(p){ return '  '+p.horse_num+'\u756a\uff08'+p.horse_name+'\uff09: '+p.bet+'\u5186'; }).join('\n');
  alert('\u3010\u5358\u52dd \u6295\u7968\u5185\u5bb9\u3011\n\n'+lines+'\n\n\u5408\u8a08: '+cachedPortfolio.totalBet+'\u5186\n\n\u30a6\u30de\u30ab\u30b9\u30de\u30fc\u30c8\u3092\u958b\u304d\u307e\u3059\u3002');
  window.open('https://www.ipat.jra.go.jp/sp/umaca/index.cgi', '_blank');
}

function showError(msg) { var el=document.getElementById('error'); el.innerHTML=msg.replace(/\n/g,'<br>'); el.style.display='block'; }
function hideError() { document.getElementById('error').style.display='none'; }
function showLoading(show) { document.getElementById('loading').style.display=show?'block':'none'; }

window.calculatePortfolio=calculatePortfolio;window.generateMockOdds=generateMockOdds;window.displayResults=displayResults;window.displayPortfolioInfo=displayPortfolioInfo;window.handleGoToUmaca=handleGoToUmaca;