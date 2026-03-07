function showError(m){var e=document.getElementById("error");if(e){e.innerHTML=m;e.style.display="block";}}
function hideError(){var e=document.getElementById("error");if(e)e.style.display="none";}
function showLoading(s){var e=document.getElementById("loading");if(e)e.style.display=s?"block":"none";}

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
  // kaisai情報を更新してからrace_id取得
  var date = document.getElementById('raceDate').value;
  var venueCode = document.getElementById('raceVenue').value;
  var raceNum = document.getElementById('raceNum').value;
  var raceId = null;
  if(date && venueCode) {
    try {
      var yyyymmdd = date.replace(/-/g,'');
      var res = await fetch('https://raw.githubusercontent.com/penmawashi8-ux/keiba-auto-betting/main/kaisai.json?t='+Date.now());
      var kaisai = await res.json();
      if(kaisai[yyyymmdd] && kaisai[yyyymmdd][venueCode]) {
        var info = kaisai[yyyymmdd][venueCode];
        var sampleId = info.sample_race_id;
        raceId = sampleId.slice(0,10) + raceNum;
      }
    } catch(e) {}
  }
  console.log('date='+date+' venue='+venueCode+' raceNum='+raceNum+' raceId='+raceId);
  if (!raceId || raceId.length !== 12) { showError('race_id not ready: '+raceId); return; }

  // netkeibaから直接オッズ取得
  showLoading(true);
  document.getElementById('outputSection').style.display = 'none';
  var oddsData = null;
  try {
    var oddsUrl = 'https://race.netkeiba.com/api/api_get_jra_odds.html?race_id=' + raceId + '&type=1&action=update';
    var oddsRes = await fetch(oddsUrl, { headers: { Referer: 'https://race.netkeiba.com/' } });
    if(!oddsRes.ok) throw new Error('HTTP ' + oddsRes.status);
    oddsData = await oddsRes.json();
    oddsData.race_id = raceId;
    console.log('netkeiba status='+oddsData.status+' race_id='+oddsData.race_id);
  } catch(e) {
    console.log('netkeiba error:'+e.message);
    // CORSエラーならActionsにフォールバック
    try {
      var ghToken = localStorage.getItem('gh_token');
      if(!ghToken) throw new Error('Token not found');
      await fetch('https://api.github.com/repos/penmawashi8-ux/keiba-auto-betting/actions/workflows/fetch_odds.yml/dispatches', {
        method: 'POST',
        headers: { Authorization: 'token ' + ghToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: 'main', inputs: { race_id: raceId } })
      });
      var waited = 0;
      while(waited < 90) {
        await new Promise(r => setTimeout(r, 5000));
        waited += 5;
        document.getElementById('loading').textContent = 'オッズ取得中... (' + waited + '秒)';
        try {
          var od = await (await fetch('https://raw.githubusercontent.com/penmawashi8-ux/keiba-auto-betting/main/odds.json?t='+Date.now())).json();
          if(od.race_id === raceId || waited >= 30) { oddsData = od; break; }
        } catch(e2) {}
      }
    } catch(e2) {
      showError('オッズ取得失敗: ' + e.message);
      showLoading(false);
      return;
    }
  }
  if(!oddsData) { showError('オッズ取得失敗'); showLoading(false); return; }
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
      var oddsJson = await loadOddsJson(raceId);
      if(oddsJson.race_id && raceId && oddsJson.race_id !== raceId){showError("race_id mismatch\n select:"+raceId+"\n fetched:"+oddsJson.race_id);return;}
      odds = oddsJson;
      dataSource = 'OK: odds.json';
    } catch(e) {
      console.warn('odds.json failed:', e.message);
      showError(e.message);
    }

    if (!odds || odds.length === 0) {
      odds = generateMockOdds();
      dataSource = 'DEMO data';
    }

    var portfolio = calculatePortfolio(odds,document.getElementById("budgetInput")&&document.getElementById("budgetInput").value,document.getElementById("countInput")&&document.getElementById("countInput").value);
    cachedPortfolio = portfolio;
window.cachedPortfolio = portfolio;

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

  if (data.status !== 'ok' && data.status !== 'result' && data.status !== 'middle') {

    throw new Error('Odds error: ' + (data.error || data.status || 'unknown'));
  }
  // win odds
  var oddsObj = data.data && data.data.odds && data.data.odds['1'];
  if (!oddsObj || Object.keys(oddsObj).length === 0) {
    throw new Error('Odds empty');
  }
  var oddsArr = Object.entries(oddsObj).map(function(e) {
    return {horse_num: parseInt(e[0]), horse_name: '', odds: parseFloat(e[1][0]), popular: parseInt(e[1][2])};
  }).filter(function(o) { return !isNaN(o.odds); });
  oddsArr.sort(function(a,b){ return a.popular - b.popular; });
  return oddsArr;
}

window.updatePreview = updatePreview;
window.triggerActions = triggerActions;
window.handleFetchOdds = handleFetchOdds;
window.loadOddsJson = loadOddsJson;
window.showError = showError;
window.hideError = hideError;
window.showLoading = showLoading;

var approvedRaceId=null;
var approvalTimer=null;

function getGhToken(){
  var t=localStorage.getItem('gh_token');
  if(!t){t=prompt('GitHub Personal Access TokenÃ£ÂÂÃ¥ÂÂ¥Ã¥ÂÂÃ£ÂÂÃ£ÂÂ¦Ã£ÂÂÃ£ÂÂ Ã£ÂÂÃ£ÂÂ:');if(t)localStorage.setItem('gh_token',t);}
  return t;
}

function showApprovalCard(raceId,startTimeStr){
  approvedRaceId=raceId;
  document.getElementById('approvalCard').style.display='block';
  document.getElementById('approvalRaceInfo').textContent='race_id:'+raceId+' start:'+startTimeStr;
  window._approvalStartTime=startTimeStr;
}

function handleApproval(){
  if(!approvedRaceId){alert('no race_id');return;}
  var t=window._approvalStartTime;
  if(!t){alert('no start time');return;}
  var now=new Date();
  var h=parseInt(t.split(':')[0]),m=parseInt(t.split(':')[1]);
  var trigger=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m-2,0);
  var left=trigger-now;
  window._approvalBudget=document.getElementById('approvalBudget').value;
  window._approvalCount=document.getElementById('approvalCount').value;
  document.getElementById('approvalBtn').disabled=true;
  document.getElementById('timerDisplay').style.display='block';
  var status=document.getElementById('approvalStatus');
  if(left<=0){status.textContent='Fetching now...';triggerActionsAndReload(approvedRaceId);return;}
  status.textContent='Auto fetch 2min before start';
  approvalTimer=setInterval(function(){
    var l=trigger-new Date();
    if(l<=0){clearInterval(approvalTimer);document.getElementById('timerDisplay').textContent='Fetching...';triggerActionsAndReload(approvedRaceId);return;}
    var mm=Math.floor(l/60000),ss=Math.floor((l%60000)/1000);
    document.getElementById('timerDisplay').textContent=mm+'m'+ss+'s';
  },1000);
}

async function triggerActionsAndReload(raceId){
  var status=document.getElementById('approvalStatus');
  status.textContent='Starting Actions...';
  var token=getGhToken();
  if(!token){status.textContent='Token missing';return;}
  try{
    var r=await fetch('https://api.github.com/repos/penmawashi8-ux/keiba-auto-betting/actions/workflows/fetch_odds.yml/dispatches',{method:'POST',headers:{'Authorization':'token '+token,'Content-Type':'application/json'},body:JSON.stringify({ref:'main',inputs:{race_id:raceId}})});
    if(r.status===204){
      status.textContent='Actions started. Reloading in 30s...';
      setTimeout(async function(){
        await handleFetchOdds();
        status.textContent='Done!';
      },30000);
    } else {
      status.textContent='Actions error: '+r.status;
    }
  }catch(e){status.textContent='Error:'+e.message;}
}

window.showApprovalCard=showApprovalCard;
window.handleApproval=handleApproval;

document.addEventListener("DOMContentLoaded",function(){var p=new URLSearchParams(window.location.search);var rid=p.get("race_id"),st=p.get("start");if(rid&&st&&window.showApprovalCard){window.showApprovalCard(rid,st);}});
