
function getRaceId() {
  if (currentMode === 'direct') {
    return document.getElementById('raceIdDirect').value.trim();
  }
  var date = document.getElementById('raceDate').value.replace(/-/g,'');
  var venue = document.getElementById('raceVenue').value;
  var times = window._kaisaiTimes;
  var day = window._kaisaiDay;
  var rnum = document.getElementById('raceNum').value;
  if (!date || date.length !== 8 || !times || !day) return '';
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
    preview.textContent = 'race_id: ' + rid + '\uFF08' + date + ' ' + vname + ' ' + parseInt(rnum) + 'R\uFF09';
    preview.style.background = '#e8f5e9';
    preview.style.color = '#2e7d32';
  } else if (currentMode === 'simple') {
    preview.textContent = 'race_id: 開催情報を検索中...';
    preview.style.background = '#fff3e0';
    preview.style.color = '#e65100';
  }
}

function triggerActions() {
  var rid = getRaceId();
  if (!rid || rid.length !== 12) {
    showError('race_idが計算できません。開催情報の検索完了をお待ちください');
    return;
  }
  var url = 'https://github.com/penmawashi8-ux/keiba-auto-betting/actions/workflows/fetch_odds.yml';
  alert('GitHubのActionsページを開きます。\n「Run workflow」→ race_id: ' + rid + ' で実行してください！');
  window.open(url, '_blank');
}

async function handleFetchOdds() {
  var raceId = getRaceId();
  if (!raceId || raceId.length !== 12) {
    showError('race_idを確認してください（開催情報の検索完了をお待ちください）');
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
      dataSource = '\u2705 GitHub Actions取得データ（odds.json）';
    } catch(e) {
      console.warn('odds.json失敗:', e.message);
      showError(e.message);
    }

    if (!odds || odds.length === 0) {
      odds = generateMockOdds();
      dataSource = '\u26A0\uFE0F デモデータ（GitHub Actionsでオッズ取得後に再度押してください）';
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
