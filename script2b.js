function generateMockOdds() {
  return [
    {horse_num:3, odds:2.1, horse_name:'アローエクスプレス'},
    {horse_num:7, odds:3.5, horse_name:'ゴールドシップ'},
    {horse_num:1, odds:4.2, horse_name:'ディープインパクト'},
    {horse_num:11,odds:8.5, horse_name:'キングカメハメハ'},
    {horse_num:5, odds:12.0,horse_name:'オルフェーヴル'},
    {horse_num:9, odds:18.5,horse_name:'ジェンテイルドンナ'},
    {horse_num:2, odds:25.0,horse_name:'ブエナビスタ'},
    {horse_num:14,odds:35.0,horse_name:'ウオッカ'},
  ].sort(function(a,b){ return a.odds - b.odds; });
}

function calculatePortfolio(odds, budgetInput, countInput) {
  if (!odds || odds.length < 4) return {found:false, reason:'出走馬が少なすぎます'};

  var top3 = odds.slice(0,3);
  var rest  = odds.slice(3);
  function avg(arr){ var s=0; arr.forEach(function(o){s+=o.odds;}); return s/arr.length; }
  var spread = avg(rest) / avg(top3);
  console.log('割れ目指数:', spread.toFixed(2));
  if (spread < 2.0) {
    return {found:false, spread:spread.toFixed(2), reason:'割れ目指数 '+spread.toFixed(2)+' < 2.0 のため購入見送り'};
  }

  var budget = budgetInput ? parseInt(budgetInput) : null;
  var maxCount = countInput ? parseInt(countInput) : null;

  // 期待値がプラスの馬を抽出（還元率80%として期待値 = odds * 0.8 > 1 → odds > 1.25）
  // 実際には人気順上位から選ぶ（1番人気から順に期待値が高い想定）
  var candidates = odds.slice(); // 人気順

  var picks = [];

  if (budget && !maxCount) {
    // 予算のみ: 予算内で利益がプラスになるよう頭数を最大化
    // 均等配分で試す: N頭に均等配分して最低払戻 > 予算 となる最大Nを探す
    var bestPicks = [];
    for (var n = candidates.length; n >= 1; n--) {
      var trial = candidates.slice(0, n);
      var betEach = Math.floor(budget / n / 100) * 100;
      if (betEach < 100) continue;
      var totalBet = betEach * n;
      var minPayout = Math.min.apply(null, trial.map(function(o){ return betEach * o.odds; }));
      if (minPayout > totalBet) {
        bestPicks = trial.map(function(o){
          return {horse_num:o.horse_num, horse_name:o.horse_name, odds:o.odds, bet:betEach, payout:Math.round(betEach*o.odds)};
        });
        break;
      }
    }
    picks = bestPicks;

  } else if (!budget && maxCount) {
    // 頭数のみ: 上位N頭を逆数比率で配分（デフォルト予算1000円）
    var BUDGET = 1000;
    var top = candidates.slice(0, maxCount);
    var inverses = top.map(function(o){ return 1/o.odds; });
    var sumInv = inverses.reduce(function(s,v){ return s+v; }, 0);
    picks = top.map(function(o,i){
      var raw = (inverses[i]/sumInv)*BUDGET;
      var bet = Math.max(100, Math.round(raw/100)*100);
      return {horse_num:o.horse_num, horse_name:o.horse_name, odds:o.odds, bet:bet, payout:Math.round(bet*o.odds)};
    });

  } else if (budget && maxCount) {
    // 両方: 予算内かつ頭数以内で逆数比率配分
    var top = candidates.slice(0, maxCount);
    var inverses = top.map(function(o){ return 1/o.odds; });
    var sumInv = inverses.reduce(function(s,v){ return s+v; }, 0);
    picks = top.map(function(o,i){
      var raw = (inverses[i]/sumInv)*budget;
      var bet = Math.max(100, Math.round(raw/100)*100);
      return {horse_num:o.horse_num, horse_name:o.horse_name, odds:o.odds, bet:bet, payout:Math.round(bet*o.odds)};
    });

  } else {
    // 何も入力なし: デフォルト（上位3頭・1000円）
    var BUDGET = 1000;
    var top = candidates.slice(0, 3);
    var inverses = top.map(function(o){ return 1/o.odds; });
    var sumInv = inverses.reduce(function(s,v){ return s+v; }, 0);
    picks = top.map(function(o,i){
      var raw = (inverses[i]/sumInv)*BUDGET;
      var bet = Math.max(100, Math.round(raw/100)*100);
      return {horse_num:o.horse_num, horse_name:o.horse_name, odds:o.odds, bet:bet, payout:Math.round(bet*o.odds)};
    });
  }

  if (!picks || picks.length === 0) {
    return {found:false, spread:spread.toFixed(2), reason:'予算内で利益がプラスになる組み合わせが見つかりません'};
  }

  var totalBet = picks.reduce(function(s,p){ return s+p.bet; }, 0);
  var payouts  = picks.map(function(p){ return p.payout; });
  var minPay   = Math.min.apply(null, payouts);
  var maxPay   = Math.max.apply(null, payouts);

  return {found:true, spread:spread.toFixed(2), picks:picks, totalBet:totalBet, minPay:minPay, maxPay:maxPay, minProfit:minPay-totalBet};
}

function displayResults(odds, portfolio) {
  var html = '<h3 style="margin-bottom:8px;font-size:14px;">\uD83D\uDCCA \u5358\u52dd\u30aa\u30c3\u30ba\u4e00\u89a7\uff08\u4eba\u6c17\u9806\uff09</h3>';
  html += '<table><thead><tr><th>\u4eba\u6c17</th><th>\u99ac\u756a</th><th>\u99ac\u540d</th><th>\u5358\u52dd</th></tr></thead><tbody>';
  for (var i=0; i<odds.length; i++) {
    var o = odds[i];
    var isPick = portfolio.found && portfolio.picks.some(function(p){ return p.horse_num===o.horse_num; });
    var style  = isPick ? 'background:#fff9c4;font-weight:bold;' : '';
    html += '<tr style="'+style+'"><td>'+(i+1)+'\u4eba\u6c17</td><td>'+o.horse_num+'</td><td>'+o.horse_name+'</td><td>'+o.odds.toFixed(1)+'\u500d</td></tr>';
  }
  html += '</tbody></table>';
  if (portfolio.found) {
    html += '<div class="alert-success">\u2705 <strong>\u5272\u308c\u76ee\u691c\u51fa\uff01\u8cfc\u5165\u63a8\u5968</strong><br>\u5272\u308c\u76ee\u6307\u6570: <strong>'+portfolio.spread+'\u500d</strong></div>';
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
