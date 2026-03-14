const pass = Keychain.get('ipat_pass');
const card = Keychain.get('ipat_card');
const birth = Keychain.get('ipat_birth');

const req = new Request('https://raw.githubusercontent.com/penmawashi8-ux/keiba-auto-betting/main/bet_target.json?t=' + Date.now());
const info = await req.loadJSON();

const venueName = info.venue;
const raceNum = info.race_num;
const horseNum = info.top1_horse_num;
const sikiName = '単勝';
const houName = '通常';
const amountPerBet = 1000;
const kuchisu = amountPerBet / 100;
log(venueName + ' ' + raceNum + 'R 馬番:' + horseNum + ' ' + amountPerBet + '円(' + kuchisu + '口)');

async function waitForPages(wv, targetIds, timeoutMs = 15000) {
  const interval = 500;
  let elapsed = 0;
  while (elapsed < timeoutMs) {
    await new Promise(r => Timer.schedule(interval, false, r));
    elapsed += interval;
    const pageId = await wv.evaluateJavaScript(
      `(function(){ try { return $.mobile.activePage[0].id; } catch(e) { return 'notready'; } })()`
    );
    if (targetIds.indexOf(pageId) >= 0) return pageId;
  }
  log('timeout: ' + targetIds.join('/'));
  return null;
}

const wv = new WebView();
await wv.loadURL('https://www.ipat.jra.go.jp/sp/umaca/');
await new Promise(r => Timer.schedule(3000, false, r));

const initialPage = await wv.evaluateJavaScript(
  `(function(){ try { return $.mobile.activePage[0].id; } catch(e) { return 'notready'; } })()`
);
if (initialPage === 'page01') { log('時間外'); await wv.present(); return; }

if (!await waitForPages(wv, ['umacalogin'])) { log('ログインページ表示失敗'); await wv.present(); return; }
log('ログインページOK');

await wv.evaluateJavaScript(`
  document.getElementById('umacaCard').value = '${card}';
  document.getElementById('birth').value = '${birth}';
  document.getElementById('pass').value = '${pass}';
  document.getElementById('umacaCard').dispatchEvent(new Event('input'));
  document.getElementById('birth').dispatchEvent(new Event('input'));
  document.getElementById('pass').dispatchEvent(new Event('input'));
  document.querySelector('.btnColor a').click();
  true;
`);

if (!await waitForPages(wv, ['voteMenu'])) { log('ログイン失敗'); await wv.present(); return; }
log('ログインOK');

await wv.evaluateJavaScript(`$('.ico_regular').trigger('tap'); true;`);
if (!await waitForPages(wv, ['jyo'])) { log('jyo遷移失敗'); await wv.present(); return; }
log('jyoOK');

const dayOfWeek = new Date().getDay();
const dayStr = dayOfWeek === 0 ? '(日)' : '(土)';
await wv.evaluateJavaScript(`
  (function(){
    var links = document.querySelectorAll('.selectList a');
    for (var i = 0; i < links.length; i++) {
      var txt = links[i].textContent.trim();
      if (txt.indexOf('${venueName}') >= 0 && txt.indexOf('${dayStr}') >= 0) {
        $(links[i]).trigger('tap'); return;
      }
    }
    for (var i = 0; i < links.length; i++) {
      if (links[i].textContent.indexOf('${venueName}') >= 0) {
        $(links[i]).trigger('tap'); return;
      }
    }
  })(); true;
`);

if (!await waitForPages(wv, ['race'])) { log('race遷移失敗'); await wv.present(); return; }
log('raceOK');

await wv.evaluateJavaScript(`
  (function(){
    var links = document.querySelectorAll('.selectList a');
    for (var i = 0; i < links.length; i++) {
      var txt = links[i].textContent;
      if (txt.indexOf('${raceNum}R') >= 0 || txt.trim() === '${raceNum}') {
        $(links[i]).trigger('tap'); return;
      }
    }
  })(); true;
`);

if (!await waitForPages(wv, ['siki'])) { log('siki遷移失敗'); await wv.present(); return; }
log('sikiOK');

await wv.evaluateJavaScript(`
  (function(){
    var links = document.querySelectorAll('.selectList a');
    for (var i = 0; i < links.length; i++) {
      if (links[i].textContent.trim() === '${sikiName}') {
        $(links[i]).trigger('tap'); return;
      }
    }
  })(); true;
`);

const afterSiki = await waitForPages(wv, ['hou', '740', 'uma1', 'uma2', 'uma3'], 15000);
if (!afterSiki) { log('siki後遷移失敗'); await wv.present(); return; }

if (afterSiki === 'hou') {
  await wv.evaluateJavaScript(`
    (function(){
      var links = document.querySelectorAll('.selectList a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent.trim() === '${houName}') {
          $(links[i]).trigger('tap'); return;
        }
      }
    })(); true;
  `);
  const afterHou = await waitForPages(wv, ['740', 'uma1', 'uma2', 'uma3'], 15000);
  if (!afterHou) { log('hou後遷移失敗'); await wv.present(); return; }
}

const currentPage = await wv.evaluateJavaScript(
  `(function(){ try { return $.mobile.activePage[0].id; } catch(e) { return 'error'; } })()`
);
if (currentPage === 'uma1') {
  const clicked = await wv.evaluateJavaScript(`
    (function(){
      var hn = ${horseNum};
      var links = document.querySelectorAll('#uma1 a');
      for (var i = 0; i < links.length; i++) {
        var num = parseInt(links[i].textContent.trim(), 10);
        if (num === hn) { $(links[i]).trigger('tap'); return '馬番' + hn + 'クリックOK'; }
      }
      return '馬番' + hn + 'が見つからない';
    })();
  `);
  log(clicked);
}

if (!await waitForPages(wv, ['kin'], 15000)) { log('kin遷移失敗'); await wv.present(); return; }
log('kinOK');

await wv.evaluateJavaScript(`
  (function(){
    var input = document.querySelector('#kin input');
    input.value = '${kuchisu}';
    input.dispatchEvent(new Event('input'));
    var links = document.querySelectorAll('#kin a');
    for (var i = 0; i < links.length; i++) {
      if (links[i].textContent.trim() === 'セット') { $(links[i]).trigger('tap'); return; }
    }
  })(); true;
`);
log(amountPerBet + '円(' + kuchisu + '口)セット');

if (!await waitForPages(wv, ['toui'], 15000)) { log('toui遷移失敗'); await wv.present(); return; }

await wv.evaluateJavaScript(`
  (function(){
    var links = document.querySelectorAll('#toui a');
    for (var i = 0; i < links.length; i++) {
      if (links[i].textContent.trim() === '入力終了') { $(links[i]).trigger('tap'); return; }
    }
  })(); true;
`);
log('入力終了タップ → 確認画面へ');

await wv.present();
