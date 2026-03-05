console.log('script.js loaded');

let cachedPortfolio = null;
let currentMode = 'simple';

// 場コード
const VENUE_CODES = {
  '01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京',
  '06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'
};

document.addEventListener('DOMContentLoaded', function() {
  // 今日の日付をデフォルトに
  var today = new Date();
  var yyyy = today.getFullYear();
  var mm = String(today.getMonth()+1).padStart(2,'0');
  var dd = String(today.getDate()).padStart(2,'0');
  document.getElementById('raceDate').value = yyyy+'-'+mm+'-'+dd;

  // race_idプレビュー更新
  ['raceDate','raceVenue','raceTimes','raceDay','raceNum'].forEach(function(id) {
    document.getElementById(id).addEventListener('change', updatePreview);
  });
  updatePreview();

  document.getElementById('fetchOdds').addEventListener('click', handleFetchOdds);
  document.getElementById('goToUmaca').addEventListener('click', handleGoToUmaca);
});

function switchMode(mode) {
  currentMode = mode;
  if (mode === 'simple') {
    document.getElementById('panelSimple').style.display = 'block';
    document.getElementById('panelDirect').style.display = 'none';
    document.getElementById('modeSimple').classList.add('active');
    document.getElementById('modeDirect').classList.remove('active');
  } else {
    document.getElementById('panelSimple').style.display = 'none';
    document.getElementById('panelDirect').style.display = 'block';
    document.getElementById('modeSimple').classList.remove('active');
    document.getElementById('modeDirect').classList.add('active');
  }
}

function getRaceId() {
  if (currentMode === 'direct') {
    return document.getElementById('raceIdDirect').value.trim();
  }
  var date = document.getElementById('raceDate').value.replace(/-/g,'');
  var venue = document.getElementById('raceVenue').value;
  var times = document.getElementById('raceTimes').value;
  var day = document.getElementById('raceDay').value;
  var rnum = document.getElementById('raceNum').value;
  if (!date || date.length !== 8) return '';
  return date.slice(0,4) + venue + times + day + rnum;
}

function updatePreview() {
  var rid = getRaceId();
  var preview = document.getElementById('raceIdPreview');
  if (!preview) return;
  if (rid && rid.length === 12) {
    var venue = document.getElementById('raceVenue').value;
    var rnum = document.getElementById('raceNum').value;
    var vname = VENUE_CODES[venue] || venue;
    var date = document.getElementById('raceDate').value;
    preview.textContent = 'race_id: ' + rid + '（' + date + ' ' + vname + ' ' + parseInt(rnum) + 'R）';
    preview.style.background = '#e8f5e9';
    preview.style.color = '#2e7d32';
  } else {
    preview.textContent = 'race_id: 日付を選択してください';
    preview.style.background = '#fff3e0';
    preview.style.color = '#e65100';
  }
}

function triggerActions() {
  var rid = getRaceId();
  if (!rid || rid.length !== 12) {
    showError('race_idが正しく計算できません。日付・競馬場・回・日・Rを確認してください');
    return;
  }
  var url = 'https://github.com/penmawashi8-ux/keiba-auto-betting/actions/workflows/fetch_odds.yml';
  alert('GitHubのActionsページを開きます。\n「Run workflow」→ race_id: ' + rid + ' で実行してください！');
  window.open(url, '_blank');
}

async function handleFetchOdds() {
  var raceId = getRaceId();
  if (!raceId || raceId.length !== 12) {
    showError('race_idを確認してください（12桁必要）');
    return;
  }

  hideError();
  showLoading(true);
  document.getElementById('outputSection').style.display = 'none';

  var odds = null;
  var dataSource = '';

  try {
    try {
      odds = await loadOddsJson(raceId);
      dataSource = '✅ GitHub Actions取得データ（odds.json）';
    } catch(e) {
      console.warn('odds.json失敗:', e.message);
      showError(e.message);
    }

    if (!odds || odds.length === 0) {
      odds = generateMockOdds();
      dataSource = '⚠️ デモデータ（GitHub Actionsでオッズ取得後に再度押してください）';
    }

    var portfolio = calculatePortfolio(odds);
    cachedPortfolio = portfolio;

    document.getElementById('dataSource').textContent = dataSource;
    displayResults(odds, portfolio);

    if (portfolio.found) {
      displayPortfolioInfo(portfolio);
      document.getElementById('portfolioData').style.display = 'block';
    } else {
      document.getElementById('portfolioData').style.display = 'none';
    }

    document.getElementById('outputSection').style.display = 'block';

  } catch(err) {
    showError('エラー: ' + err.message);
  } finally {
    showLoading(false);
  }
}

async function loadOddsJson(expectedRaceId) {
  var url = 'odds.json?t=' + Date.now();
  var res = await fetch(url);
  if (!res.ok) {
    throw new Error('odds.jsonが見つかりません。先に「⚡ GitHub Actionsでオッズ取得」を実行してください（HTTP ' + res.status + '）');
  }
  var text = await res.text();
  var data = JSON.parse(text);

  if (data.status !== 'ok') {
    throw new Error('オッズ取得エラー: ' + (data.error || '不明'));
  }
  if (data.race_id !== expectedRaceId) {
    throw new Error('race_idが一致しません\n入力: ' + expectedRaceId + '\njson: ' + data.race_id + '\n先に「⚡ GitHub Actionsでオッズ取得」で ' + expectedRaceId + ' を実行してください');
  }
  if (!data.odds || data.odds.length === 0) {
    throw new Error('オッズデータが空です');
  }
  return data.odds;
}

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
  var html = '<h3 style="margin-bottom:8px;font-size:14px;">📊 単勝オッズ一覧（人気順）</h3>';
  html += '<table><thead><tr><th>人気</th><th>馬番</th><th>馬名</th><th>単勝</th></tr></thead><tbody>';
  for (var i=0; i<odds.length; i++) {
    var o = odds[i];
    var isPick = portfolio.found && portfolio.picks.some(function(p){ return p.horse_num===o.horse_num; });
    var style  = isPick ? 'background:#fff9c4;font-weight:bold;' : '';
    html += '<tr style="'+style+'"><td>'+(i+1)+'人気</td><td>'+o.horse_num+'</td><td>'+o.horse_name+'</td><td>'+o.odds.toFixed(1)+'倍</td></tr>';
  }
  html += '</tbody></table>';
  if (portfolio.found) {
    html += '<div class="alert-success">✅ <strong>割れ目検出！購入推奨</strong><br>割れ目指数: <strong>'+portfolio.spread+'倍</strong></div>';
  } else {
    html += '<div class="alert-danger">❌ <strong>購入見送り</strong> — '+portfolio.reason+'</div>';
  }
  document.getElementById('oddsResult').innerHTML = html;
}

function displayPortfolioInfo(portfolio) {
  var html = '<div class="portfolio-box">';
  for (var i=0; i<portfolio.picks.length; i++) {
    var p = portfolio.picks[i];
    html += '<div class="bet-row">🐎 <strong>'+p.horse_num+'番 '+p.horse_name+'</strong><span class="bet-amount">'+p.bet+'円</span><span class="odds-label">@ '+p.odds.toFixed(1)+'倍 → <strong>'+p.payout+'円</strong></span></div>';
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
