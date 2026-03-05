
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

function calculatePortfolio(odds) {
  if (!odds || odds.length < 4) return {found:false, reason:'出走馬が少なすぎます'};
  var top3 = odds.slice(0,3);
  var rest  = odds.slice(3);
  function avg(arr){ var s=0; arr.forEach(function(o){s+=o.odds;}); return s/arr.length; }
  var spread = avg(rest) / avg(top3);
  console.log('割れ目指数:', spread.toFixed(2));
  if (spread < 2.0) {
    return {found:false, spread:spread.toFixed(2), reason:'割れ目指数 '+spread.toFixed(2)+' < 2.0 のため購入見送り'};
  }
  var BUDGET = 1000;
  var inverses = top3.map(function(o){ return 1/o.odds; });
  var sumInv = inverses.reduce(function(s,v){ return s+v; }, 0);
  var portfolio = top3.map(function(o,i){
    var raw = (inverses[i]/sumInv)*BUDGET;
    var bet = Math.max(100, Math.round(raw/100)*100);
    return {horse_num:o.horse_num, horse_name:o.horse_name, odds:o.odds, bet:bet, payout:Math.round(bet*o.odds)};
  });
  var totalBet = portfolio.reduce(function(s,p){ return s+p.bet; }, 0);
  var payouts  = portfolio.map(function(p){ return p.payout; });
  var minPay   = Math.min.apply(null,payouts);
  var maxPay   = Math.max.apply(null,payouts);
  return {found:true, spread:spread.toFixed(2), picks:portfolio, totalBet:totalBet, minPay:minPay, maxPay:maxPay, minProfit:minPay-totalBet};
}

function displayResults(odds, portfolio) {
  var html = '<h3 style="margin-bottom:8px;font-size:14px;">\uD83D\uDCCA 単勝オッズ一覧（人気順）</h3>';
  html += '<table><thead><tr><th>人気</th><th>馬番</th><th>馬名</th><th>単勝</th></tr></thead><tbody>';
  for (var i=0; i<odds.length; i++) {
    var o = odds[i];
    var isPick = portfolio.found && portfolio.picks.some(function(p){ return p.horse_num===o.horse_num; });
    var style  = isPick ? 'background:#fff9c4;font-weight:bold;' : '';
    html += '<tr style="'+style+'"><td>'+(i+1)+'人気</td><td>'+o.horse_num+'</td><td>'+o.horse_name+'</td><td>'+o.odds.toFixed(1)+'倍</td></tr>';
  }
  html += '</tbody></table>';
  if (portfolio.found) {
    html += '<div class="alert-success">\u2705 <strong>割れ目検出！購入推奨</strong><br>割れ目指数: <strong>'+portfolio.spread+'倍</strong></div>';
  } else {
    html += '<div class="alert-danger">\u274C <strong>購入見送り</strong> — '+portfolio.reason+'</div>';
  }
  document.getElementById('oddsResult').innerHTML = html;
}

function displayPortfolioInfo(portfolio) {
  var html = '<div class="portfolio-box">';
  for (var i=0; i<portfolio.picks.length; i++) {
    var p = portfolio.picks[i];
    html += '<div class="bet-row">\uD83D\uDC0E <strong>'+p.horse_num+'番 '+p.horse_name+'</strong><span class="bet-amount">'+p.bet+'円</span><span class="odds-label">@ '+p.odds.toFixed(1)+'倍 → <strong>'+p.payout+'円</strong></span></div>';
  }
  var profit = portfolio.minProfit;
  html += '<div class="summary-row"><div>合計投資: <strong>'+portfolio.totalBet+'円</strong></div><div>払戻: <strong>'+portfolio.minPay+'〜'+portfolio.maxPay+'円</strong>　最低利益: <strong class="'+(profit>=0?'profit':'loss')+'">'+(profit>=0?'+':'')+profit+'円</strong></div></div>';
  html += '</div>';
  document.getElementById('portfolioInfo').innerHTML = html;
}

function handleGoToUmaca() {
  if (!cachedPortfolio || !cachedPortfolio.found) { showError('購入推奨のポートフォリオがありません'); return; }
  var lines = cachedPortfolio.picks.map(function(p){ return '  '+p.horse_num+'番（'+p.horse_name+'）: '+p.bet+'円'; }).join('\n');
  alert('【単勝 投票内容】\n\n'+lines+'\n\n合計: '+cachedPortfolio.totalBet+'円\n\nウマカスマートを開きます。');
  window.open('https://www.ipat.jra.go.jp/sp/umaca/index.cgi', '_blank');
}

function showError(msg) { var el=document.getElementById('error'); el.innerHTML=msg.replace(/\n/g,'<br>'); el.style.display='block'; }
function hideError() { document.getElementById('error').style.display='none'; }
function showLoading(show) { document.getElementById('loading').style.display=show?'block':'none'; }
