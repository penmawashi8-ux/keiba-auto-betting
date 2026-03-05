function getRaceId() {
if (currentMode === Ã¢ÂÂdirectÃ¢ÂÂ) {
return document.getElementById(Ã¢ÂÂraceIdDirectÃ¢ÂÂ).value.trim();
}
var rnum = document.getElementById(Ã¢ÂÂraceNumÃ¢ÂÂ).value;
if (window._kaisaiSampleId && window._kaisaiSampleId.length === 12) {
return window._kaisaiSampleId.slice(0, 10) + rnum;
}
var date = document.getElementById(Ã¢ÂÂraceDateÃ¢ÂÂ).value.replace(/-/g,Ã¢ÂÂÃ¢ÂÂ);
var venue = document.getElementById(Ã¢ÂÂraceVenueÃ¢ÂÂ).value;
var times = window._kaisaiTimes;
var day = window._kaisaiDay;
if (!date || date.length !== 8 || !times || !day) return Ã¢ÂÂÃ¢ÂÂ;
return date.slice(0,4) + venue + times + day + rnum;
}

function updatePreview() {
var rid = getRaceId();
var preview = document.getElementById(Ã¢ÂÂraceIdPreviewÃ¢ÂÂ);
if (!preview) return;
if (rid && rid.length === 12) {
var venue = document.getElementById(Ã¢ÂÂraceVenueÃ¢ÂÂ).value;
var rnum = document.getElementById(Ã¢ÂÂraceNumÃ¢ÂÂ).value;
var vname = VENUE_CODES[venue] || venue;
var date = document.getElementById(Ã¢ÂÂraceDateÃ¢ÂÂ).value;
preview.textContent = Ã¢ÂÂrace_id: Ã¢ÂÂ + rid + Ã¢ÂÂ\uFF08Ã¢ÂÂ + date + Ã¢ÂÂ Ã¢ÂÂ + vname + Ã¢ÂÂ Ã¢ÂÂ + parseInt(rnum) + Ã¢ÂÂR\uFF09Ã¢ÂÂ;
preview.style.background = Ã¢ÂÂ#e8f5e9Ã¢ÂÂ;
preview.style.color = Ã¢ÂÂ#2e7d32Ã¢ÂÂ;
} else if (currentMode === Ã¢ÂÂsimpleÃ¢ÂÂ) {
preview.textContent = Ã¢ÂÂrace_id: Ã©ÂÂÃ¥ÂÂ¬Ã¦ÂÂÃ¥Â Â±Ã£ÂÂÃ¦Â¤ÂÃ§Â´Â¢Ã¤Â¸Â­Ã¢ÂÂ¦Ã¢ÂÂ;
preview.style.background = Ã¢ÂÂ#fff3e0Ã¢ÂÂ;
preview.style.color = Ã¢ÂÂ#e65100Ã¢ÂÂ;
}
}

function triggerActions() {
var rid = getRaceId();
if (!rid || rid.length !== 12) {
showError(Ã¢ÂÂrace_idÃ£ÂÂÃ§Â¢ÂºÃ¨ÂªÂÃ£ÂÂ§Ã£ÂÂÃ£ÂÂ¾Ã£ÂÂÃ£ÂÂÃ£ÂÂÃ©ÂÂÃ¥ÂÂ¬Ã¦ÂÂÃ¥Â Â±Ã£ÂÂ®Ã¦Â¤ÂÃ§Â´Â¢Ã¥Â®ÂÃ¤ÂºÂÃ£ÂÂÃ£ÂÂÃ¥Â¾ÂÃ£ÂÂ¡Ã£ÂÂÃ£ÂÂ Ã£ÂÂÃ£ÂÂÃ¢ÂÂ);
return;
}
var url = Ã¢ÂÂhttps://github.com/penmawashi8-ux/keiba-auto-betting/actions/workflows/fetch_odds.ymlÃ¢ÂÂ;
alert(Ã¢ÂÂGitHubÃ£ÂÂ®ActionsÃ£ÂÂÃ£ÂÂ¼Ã£ÂÂ¸Ã£ÂÂÃ©ÂÂÃ£ÂÂÃ£ÂÂ¾Ã£ÂÂÃ£ÂÂ\nÃ£ÂÂRun workflowÃ£ÂÂÃ¢ÂÂ race_id: Ã¢ÂÂ + rid + Ã¢ÂÂ Ã£ÂÂ§Ã¥Â®ÂÃ¨Â¡ÂÃ£ÂÂÃ£ÂÂ¦Ã£ÂÂÃ£ÂÂ Ã£ÂÂÃ£ÂÂÃ¯Â¼ÂÃ¢ÂÂ);
window.open(url, Ã¢ÂÂ_blankÃ¢ÂÂ);
}

async function handleFetchOdds() {
var raceId = getRaceId();
if (!raceId || raceId.length !== 12) {
showError(Ã¢ÂÂrace_idÃ£ÂÂÃ§Â¢ÂºÃ¨ÂªÂÃ£ÂÂÃ£ÂÂ¦Ã£ÂÂÃ£ÂÂ Ã£ÂÂÃ£ÂÂÃ¯Â¼ÂÃ©ÂÂÃ¥ÂÂ¬Ã¦ÂÂÃ¥Â Â±Ã£ÂÂ®Ã¦Â¤ÂÃ§Â´Â¢Ã¥Â®ÂÃ¤ÂºÂÃ£ÂÂÃ£ÂÂÃ¥Â¾ÂÃ£ÂÂ¡Ã£ÂÂÃ£ÂÂ Ã£ÂÂÃ£ÂÂÃ¯Â¼ÂÃ¢ÂÂ);
return;
}

hideError();
showLoading(true);
document.getElementById(Ã¢ÂÂoutputSectionÃ¢ÂÂ).style.display = Ã¢ÂÂnoneÃ¢ÂÂ;

var odds = null;
var dataSource = Ã¢ÂÂÃ¢ÂÂ;

try {
try {
odds = await loadOddsJson(raceId);
dataSource = Ã¢ÂÂ\u2705 GitHub ActionsÃ¥ÂÂÃ¥Â¾ÂÃ£ÂÂÃ£ÂÂ¼Ã£ÂÂ¿Ã¯Â¼Âodds.jsonÃ¯Â¼ÂÃ¢ÂÂ;
} catch(e) {
console.warn(Ã¢ÂÂodds.jsonÃ¥Â¤Â±Ã¦ÂÂ:Ã¢ÂÂ, e.message);
showError(e.message);
}

```
if (!odds || odds.length === 0) {
  odds = generateMockOdds();
  dataSource = '\u26A0\uFE0F Ã£ÂÂÃ£ÂÂ¢Ã£ÂÂÃ£ÂÂ¼Ã£ÂÂ¿Ã¯Â¼ÂGitHub ActionsÃ£ÂÂ§Ã£ÂÂªÃ£ÂÂÃ£ÂÂºJSONÃ¥ÂÂÃ¥Â¾ÂÃ¥Â¾ÂÃ£ÂÂ«Ã¥ÂÂÃ¥ÂºÂ¦Ã¦ÂÂ¼Ã£ÂÂÃ£ÂÂ¦Ã£ÂÂÃ£ÂÂ Ã£ÂÂÃ£ÂÂÃ¯Â¼Â';
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
showError(Ã¢ÂÂÃ£ÂÂ¨Ã£ÂÂ©Ã£ÂÂ¼: Ã¢ÂÂ + err.message);
} finally {
showLoading(false);
}
}

async function loadOddsJson(expectedRaceId) {
var url = Ã¢ÂÂodds.json?t=Ã¢ÂÂ + Date.now();
var res = await fetch(url);
if (!res.ok) {
throw new Error(Ã¢ÂÂodds.jsonÃ£ÂÂÃ¨Â¦ÂÃ£ÂÂ¤Ã£ÂÂÃ£ÂÂÃ£ÂÂ¾Ã£ÂÂÃ£ÂÂÃ£ÂÂÃ¥ÂÂÃ£ÂÂ«Ã£ÂÂÃ¢ÂÂ¡ GitHub ActionsÃ£ÂÂ§Ã£ÂÂªÃ£ÂÂÃ£ÂÂºÃ¥ÂÂÃ¥Â¾ÂÃ£ÂÂÃ£ÂÂÃ¥Â®ÂÃ¨Â¡ÂÃ£ÂÂÃ£ÂÂ¦Ã£ÂÂÃ£ÂÂ Ã£ÂÂÃ£ÂÂÃ¯Â¼ÂHTTP Ã¢ÂÂ + res.status + Ã¢ÂÂÃ¯Â¼ÂÃ¢ÂÂ);
}
var text = await res.text();
var data = JSON.parse(text);

if (data.status !== Ã¢ÂÂokÃ¢ÂÂ && data.status !== Ã¢ÂÂresultÃ¢ÂÂ) {
throw new Error(Ã¢ÂÂÃ£ÂÂªÃ£ÂÂÃ£ÂÂºÃ¥ÂÂÃ¥Â¾ÂÃ£ÂÂ¨Ã£ÂÂ©Ã£ÂÂ¼: Ã¢ÂÂ + (data.error || data.status || Ã¢ÂÂÃ¤Â¸ÂÃ¦ÂÂÃ¢ÂÂ));
}
// data.data.odds[Ã¢ÂÂ1Ã¢ÂÂ] Ã£ÂÂÃ¥ÂÂÃ¥ÂÂÃ£ÂÂªÃ£ÂÂÃ£ÂÂº {Ã©Â¦Â¬Ã§ÂÂª: [Ã£ÂÂªÃ£ÂÂÃ£ÂÂº, Ã¢ÂÂÃ¢ÂÂ, Ã¤ÂºÂºÃ¦Â°Â]}
var oddsObj = data.data && data.data.odds && data.data.odds[Ã¢ÂÂ1Ã¢ÂÂ];
if (!oddsObj || Object.keys(oddsObj).length === 0) {
throw new Error(Ã¢ÂÂÃ£ÂÂªÃ£ÂÂÃ£ÂÂºÃ£ÂÂÃ£ÂÂ¼Ã£ÂÂ¿Ã£ÂÂÃ§Â©ÂºÃ£ÂÂ§Ã£ÂÂÃ¯Â¼ÂÃ£ÂÂ¾Ã£ÂÂ Ã§ÂÂºÃ¥Â£Â²Ã¥ÂÂÃ£ÂÂ®Ã¥ÂÂ¯Ã¨ÂÂ½Ã¦ÂÂ§Ã£ÂÂÃ£ÂÂÃ£ÂÂÃ£ÂÂ¾Ã£ÂÂÃ¯Â¼ÂÃ¢ÂÂ);
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
