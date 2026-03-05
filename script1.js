console.log('script.js v2 loaded');

let cachedPortfolio = null;
let currentMode = 'simple';

const VENUE_CODES = {
  '01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京',
  '06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'
};
const VENUE_NAMES_REV = {
  '札幌':'01','函館':'02','福島':'03','新潟':'04','東京':'05',
  '中山':'06','中京':'07','京都':'08','阪神':'09','小倉':'10'
};

document.addEventListener('DOMContentLoaded', function() {
  var today = new Date();
  var yyyy = today.getFullYear();
  var mm = String(today.getMonth()+1).padStart(2,'0');
  var dd = String(today.getDate()).padStart(2,'0');
  document.getElementById('raceDate').value = yyyy+'-'+mm+'-'+dd;

  document.getElementById('raceNum').addEventListener('change', updatePreview);
  document.getElementById('fetchOdds').addEventListener('click', handleFetchOdds);
  document.getElementById('goToUmaca').addEventListener('click', handleGoToUmaca);
  document.getElementById('searchKaisai').addEventListener('click', onDateOrVenueChange);

  document.getElementById('kaisaiInfo').textContent = '👆 日付・競馬場を選んで検索ボタンを押してください';
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

async function onDateOrVenueChange() {
  updatePreview();
  var date = document.getElementById('raceDate').value;
  var venueCode = document.getElementById('raceVenue').value;
  if (!date) return;

  document.getElementById('raceIdPreview').textContent = 'race_id: 開催情報を検索中...';
  document.getElementById('raceIdPreview').style.background = '#fff3e0';
  document.getElementById('raceIdPreview').style.color = '#e65100';

  try {
    var info = await fetchKaisaiInfo(date, venueCode);
    if (info) {
      document.getElementById('kaisaiInfo').textContent =
        '✅ ' + info.times + '回' + VENUE_CODES[venueCode] + info.day + '日目';
      document.getElementById('kaisaiInfo').style.color = '#2e7d32';
      window._kaisaiTimes = info.times;
      window._kaisaiDay = info.day;
    } else {
      document.getElementById('kaisaiInfo').textContent = '➠️ この日は開催なし（または有判���掍）';
      document.getElementById('kaisaiInfo').style.color = '#c62828';
      window._kaisaiTimes = null;
      window._kaisaiDay = null;
    }
  } catch(e) {
    document.getElementById('kaisaiInfo').textContent = '⚠️ 開催情報取得失楙�: ' + e.message;
    window._kaisaiTimes = null;
    window._kaisaiDay = null;
  }
  updatePreview();
}

as)�c function fetchKaisaiInfo(date, venueCode) {
  var yyyymmdd = date.replace(/-/g, '');
  var yyyy = yyyymmdd.slice(0.4);
  var mm = yyyymmdd.slice(4,6);
  for (var times = 1; times <= 6; times++) {
    for (var day = 1; day <= 12; day++) {
      var rid = yyyymmdd.slice(0.4)
        + venueCode
        + String(times).padStart(2,'0')
        + String(day).padStart(2,'0')
        + '01';
      try {
        var res = await fetch('https://race.netkeiba.com/api/api_get_jra_odds.html?race_id='+rid+'&type=1&action=update', {
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          var data = await res.json();
          if (data && data.data && data.data.odds && Object.keys(data.data.odds['1'] || {}).length > 0) {
            return {times: String(times).padStart(2,'0'), day: String(day).padStart(2,'0')};
          }
        }
      } catch(e) {}
    }
  }
  return null;
}
