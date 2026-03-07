var cachedPortfolio = null;
var currentMode = 'simple';

var VENUE_CODES = {
  '01':'札幌','02':'函館','03':'福島','04':'新潟','05':'東京',
  '06':'中山','07':'中京','08':'京都','09':'阪神','10':'小倉'
};

window.addEventListener('load', function() {
  var today = new Date();
  // 直近の開催日（土日）を探す
  var d = new Date(today);
  var dow = d.getDay(); // 0=日,6=土
  if(dow === 0 || dow === 6) {
    // 今日が土日ならそのまま
  } else {
    // 平日なら直近の土曜に戻す
    var diff = dow === 0 ? 1 : dow - 6;
    d.setDate(d.getDate() - (dow === 1 ? 2 : dow - 6));
  }
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth()+1).padStart(2,'0');
  var dd = String(d.getDate()).padStart(2,'0');
  document.getElementById('raceDate').value = yyyy+'-'+mm+'-'+dd;

  document.getElementById('raceNum').addEventListener('change', window.updatePreview);
  document.getElementById('fetchOdds').addEventListener('click', window.handleFetchOdds);
  document.getElementById('goToUmaca').addEventListener('click', window.handleGoToUmaca);
  document.getElementById('searchKaisai').addEventListener('click', window.onDateOrVenueChange);
  document.getElementById('raceVenue').addEventListener('change', window.onDateOrVenueChange);
  document.getElementById('raceDate').addEventListener('change', window.onDateOrVenueChange);

  document.getElementById('kaisaiInfo').textContent = '👆 日付・競馬場を選んで検索ボタンを押してください';
  // ページ読み込み時に自動検索
  window.onDateOrVenueChange();
});

window.switchMode = function(mode) {
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
};

window.onDateOrVenueChange = async function() {
  window.updatePreview();
  var date = document.getElementById('raceDate').value;
  var venueCode = document.getElementById('raceVenue').value;
  if (!date) return;

  document.getElementById('kaisaiInfo').textContent = '⏳ 検索中...';
  try {
    var yyyymmdd = date.replace(/-/g, '');
    var res = await fetch('kaisai.json?t='+Date.now());
    var kaisai = await res.json();
    if (kaisai[yyyymmdd] && kaisai[yyyymmdd][venueCode]) {
      var info = kaisai[yyyymmdd][venueCode];
      document.getElementById('kaisaiInfo').textContent = '✅ ' + info.times + '回' + VENUE_CODES[venueCode] + info.day + '日目';
      document.getElementById('kaisaiInfo').style.color = '#2e7d32';
      window._kaisaiTimes = info.times;
      window._kaisaiDay = info.day;
      window._kaisaiSampleId = info.sample_race_id || null;
    } else {
      document.getElementById('kaisaiInfo').textContent = '⚠️ この日は開催なし（またはkaisai.json未更新）';
      document.getElementById('kaisaiInfo').style.color = '#c62828';
      window._kaisaiTimes = null;
      window._kaisaiDay = null;
      window._kaisaiSampleId = null;
    }
  } catch(e) {
    document.getElementById('kaisaiInfo').textContent = '⚠️ 検索エラー: ' + e.message;
    window._kaisaiTimes = null;
    window._kaisaiDay = null;
    window._kaisaiSampleId = null;
  }
  window.updatePreview();
};
window.searchKaisai=searchKaisai;

