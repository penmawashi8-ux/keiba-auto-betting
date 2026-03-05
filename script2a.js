function getRaceId() {
if (currentMode === âdirectâ) {
return document.getElementById(âraceIdDirectâ).value.trim();
}
var rnum = document.getElementById(âraceNumâ).value;
if (window._kaisaiSampleId && window._kaisaiSampleId.length === 12) {
return window._kaisaiSampleId.slice(0, 10) + rnum;
}
var date = document.getElementById(âraceDateâ).value.replace(/-/g,ââ);
var venue = document.getElementById(âraceVenueâ).value;
var times = window._kaisaiTimes;
var day = window._kaisaiDay;
if (!date || date.length !== 8 || !times || !day) return ââ;
return date.slice(0,4) + venue + times + day + rnum;
}

function updatePreview() {
var rid = getRaceId();
var preview = document.getElementById(âraceIdPreviewâ);
if (!preview) return;
if (rid && rid.length === 12) {
var venue = document.getElementById(âraceVenueâ).value;
var rnum = document.getElementById(âraceNumâ).value;
var vname = VENUE_CODES[venue] || venue;
var date = document.getElementById(âraceDateâ).value;
preview.textContent = ârace_id: â + rid + â\uFF08â + date + â â + vname + â â + parseInt(rnum) + âR\uFF09â;
preview.style.background = â#e8f5e9â;
preview.style.color = â#2e7d32â;
} else if (currentMode === âsimpleâ) {
preview.textContent = ârace_id: éå¬æå ±ãæ¤ç´¢ä¸­â¦â;
preview.style.background = â#fff3e0â;
preview.style.color = â#e65100â;
}
}

function triggerActions() {
var rid = getRaceId();
if (!rid || rid.length !== 12) {
showError(ârace_idãç¢ºèªã§ãã¾ãããéå¬æå ±ã®æ¤ç´¢å®äºããå¾ã¡ãã ããâ);
return;
}
var url = âhttps://github.com/penmawashi8-ux/keiba-auto-betting/actions/workflows/fetch_odds.ymlâ;
alert(âGitHubã®Actionsãã¼ã¸ãéãã¾ãã\nãRun workflowãâ race_id: â + rid + â ã§å®è¡ãã¦ãã ããï¼â);
window.open(url, â_blankâ);
}

async function handleFetchOdds() {
var raceId = getRaceId();
if (!raceId || raceId.length !== 12) {
showError(ârace_idãç¢ºèªãã¦ãã ããï¼éå¬æå ±ã®æ¤ç´¢å®äºããå¾ã¡ãã ããï¼â);
return;
}

hideError();
showLoading(true);
document.getElementById(âoutputSectionâ).style.display = ânoneâ;

var odds = null;
var dataSource = ââ;

try {
try {
odds = await loadOddsJson(raceId);
dataSource = â\u2705 GitHub Actionsåå¾ãã¼ã¿ï¼odds.jsonï¼â;
} catch(e) {
console.warn(âodds.jsonå¤±æ:â, e.message);
showError(e.message);
}

```
if (!odds || odds.length === 0) {
  odds = generateMockOdds();
  dataSource = '\u26A0\uFE0F ãã¢ãã¼ã¿ï¼GitHub Actionsã§ãªããºJSONåå¾å¾ã«ååº¦æ¼ãã¦ãã ããï¼';
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
```

} catch(err) {
showError(âã¨ã©ã¼: â + err.message);
} finally {
showLoading(false);
}
}

async function loadOddsJson(expectedRaceId) {
var url = âodds.json?t=â + Date.now();
var res = await fetch(url);
if (!res.ok) {
throw new Error(âodds.jsonãè¦ã¤ããã¾ãããåã«ãâ¡ GitHub Actionsã§ãªããºåå¾ããå®è¡ãã¦ãã ããï¼HTTP â + res.status + âï¼â);
}
var text = await res.text();
var data = JSON.parse(text);

if (data.status !== âokâ && data.status !== âresultâ) {
throw new Error(âãªããºåå¾ã¨ã©ã¼: â + (data.error || data.status || âä¸æâ));
}
// data.data.odds[â1â] ãååãªããº {é¦¬çª: [ãªããº, ââ, äººæ°]}
var oddsObj = data.data && data.data.odds && data.data.odds[â1â];
if (!oddsObj || Object.keys(oddsObj).length === 0) {
throw new Error(âãªããºãã¼ã¿ãç©ºã§ãï¼ã¾ã çºå£²åã®å¯è½æ§ãããã¾ãï¼â);
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
