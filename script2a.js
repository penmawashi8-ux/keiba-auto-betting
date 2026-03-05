
function getRaceId() {
  if (currentMode === 'direct') {
    return document.getElementById('raceIdDirect').value.trim();
  }
  var rnum = document.getElementById('raceNum').value;
  if (window._kaisaiSampleId && window._kaisaiSampleId.length === 12) {
    return window._kaisaiSampleId.slice(0, 10) + rnum;
  }
  var date = document.getElementById('raceDate').value.replace(/-/g,'');
  var venue = document.getElementById('raceVenue').value;
  var times = window._kaisaiTimes;
  var day = window._kaisaiDay;
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
    preview.textContent = 'race_id: loading...';
    preview.style.background = '#fff3e0';
    preview.style.color = '#e65100';
  }
}

function triggerActions() {
  var rid = getRaceId();
  if (!rid || rid.length !== 12) {
    showError('race_id not ready');
    return;
  }
  var url = 'https://github.com/penmawashi8-ux/keiba-auto-betting/actions/workflows/fetch_odds.yml';
  alert('Open GitHub Actions.\nRun workflow: ' + rid);
  window.open(url, '_blank');
}

async function handleFetchOdds() {
  var raceId = getRaceId();
  if (!raceId || raceId.length !== 12) {
    showError('race_id not ready');
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
      dataSource = 'OK: odds.json';
    } catch(e) {
      console.warn('odds.json failed:', e.message);
      showError(e.message);
    }

    if (!odds || odds.length === 0) {
      odds = generateMockOdds();
      dataSource = 'DEMO data';
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
    showError('Error: ' + err.message);
  } finally {
    showLoading(false);
  }
}

async function loadOddsJson(expectedRaceId) {
  var url = 'odds.json?t=' + Date.now();
  var res = await fetch(url);
  if (!res.ok) {
    throw new Error('odds.json not found (HTTP ' + res.status + ')');
  }
  var text = await res.text();
  var data = JSON.parse(text);

  if (data.status !== 'ok' && data.status !== 'result') {
    throw new Error('Odds error: ' + (data.error || data.status || 'unknown'));
  }
  // win odds
  var oddsObj = data.data && data.data.odds && data.data.odds['1'];
  if (!oddsObj || Object.keys(oddsObj).length === 0) {
    throw new Error('Odds empty');
  }
  var oddsArr = Object.entries(oddsObj).map(function(e) {
    return {num: parseInt(e[0]), odds: parseFloat(e[1][0]), popular: parseInt(e[1][2])};
  }).filter(function(o) { return !isNaN(o.odds); });
  oddsArr.sort(function(a,b){ return a.popular - b.popular; });
  return oddsArr;
}

window.updatePreview = updatePreview;
window.triggerActions = triggerActions;
window.handleFetchOdds = handleFetchOdds;
window.loadOddsJson = loadOddsJson;
