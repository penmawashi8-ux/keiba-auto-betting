console.log(‘✅ script.js 読み込み完了’);

let cachedPortfolio = null;

document.addEventListener(‘DOMContentLoaded’, () => {
const today = new Date().toISOString().split(‘T’)[0];
document.getElementById(‘raceDate’).value = today;
document.getElementById(‘fetchOdds’).addEventListener(‘click’, handleFetchOdds);
document.getElementById(‘goToUmaca’).addEventListener(‘click’, handleGoToUmaca);
});

// race_id を組み立てる
// 例: 2026, ‘06’, ‘02’, ‘02’, ‘11’ → “202606020211”
function buildRaceId(date, place, kai, day, raceNum) {
const year = date.replace(/-/g, ‘’).slice(0, 4);
return `${year}${place.padStart(2,'0')}${kai.padStart(2,'0')}${day.padStart(2,'0')}${raceNum.padStart(2,'0')}`;
}

// ============================================================
// メイン
// ============================================================
async function handleFetchOdds() {
const raceDate  = document.getElementById(‘raceDate’).value;
const racePlace = document.getElementById(‘racePlace’).value;
const kai       = String(document.getElementById(‘kaisai’).value);
const day       = String(document.getElementById(‘day’).value);
const raceNum   = String(document.getElementById(‘raceNumber’).value);

```
if (!raceDate || !racePlace || !kai || !day || !raceNum) {
    showError('すべての項目を入力してください');
    return;
}

const raceId = buildRaceId(raceDate, racePlace, kai, day, raceNum);
document.getElementById('raceIdDisplay').textContent = `race_id: ${raceId}`;

hideError();
showLoading(true);
document.getElementById('outputSection').style.display = 'none';

try {
    let odds = null;
    let dataSource = '';

    // メイン: 同リポジトリの odds.json を読む（CORS不要）
    try {
        odds = await loadOddsJson(raceId);
        dataSource = '✅ GitHub Actions 取得データ（odds.json）';
    } catch (e) {
        console.warn('odds.json 読み込み失敗:', e.message);
        showError('⚠️ ' + e.message);
    }

    // フォールバック: デモデータ
    if (!odds || odds.length === 0) {
        odds = generateMockOdds();
        dataSource = '⚠️ デモデータ（GitHub Actionsでオッズ取得後に再読み込みしてください）';
    }

    const portfolio = calculatePortfolio(odds);
    cachedPortfolio = portfolio;

    document.getElementById('dataSource').textContent = dataSource;
    displayResults(odds, portfolio);

    document.getElementById('portfolioData').style.display =
        portfolio.割れ目あり ? 'block' : 'none';
    if (portfolio.割れ目あり) displayPortfolioInfo(portfolio);

    document.getElementById('outputSection').style.display = 'block';

} catch (err) {
    showError('エラー: ' + err.message);
} finally {
    showLoading(false);
}
```

}

// ============================================================
// odds.json を読み込む（同一オリジンなのでCORSなし）
// ============================================================
async function loadOddsJson(expectedRaceId) {
const url = `odds.json?t=${Date.now()}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`odds.jsonが見つかりません。GitHub Actionsを実行してください (HTTP ${res.status})`);

```
const data = await res.json();
console.log('odds.json:', data);

if (data.status !== 'ok') {
    throw new Error('オッズ取得エラー: ' + (data.error || '不明'));
}

if (data.race_id !== expectedRaceId) {
    throw new Error(
        `race_idが一致しません\n期待: ${expectedRaceId}\n実際: ${data.race_id}\n` +
        `GitHub ActionsでRACE_ID=${expectedRaceId}を指定して実行してください`
    );
}

if (!data.odds || data.odds.length === 0) {
    throw new Error('オッズデータが空です');
}

console.log(`✅ ${data.odds.length}頭取得（取得時刻: ${data.fetched_at}）`);
return data.odds;
```

}

// ============================================================
// デモデータ
// ============================================================
function generateMockOdds() {
return [
{ 馬番:  3, オッズ:  2.1, 馬名: ‘アローエクスプレス’ },
{ 馬番:  7, オッズ:  3.5, 馬名: ‘ゴールドシップ’     },
{ 馬番:  1, オッズ:  4.2, 馬名: ‘ディープインパクト’  },
{ 馬番: 11, オッズ:  8.5, 馬名: ‘キングカメハメハ’    },
{ 馬番:  5, オッズ: 12.0, 馬名: ‘オルフェーヴル’      },
{ 馬番:  9, オッズ: 18.5, 馬名: ‘ジェンティルドンナ’  },
{ 馬番:  2, オッズ: 25.0, 馬名: ‘ブエナビスタ’        },
{ 馬番: 14, オッズ: 35.0, 馬名: ‘ウオッカ’            },
].sort((a, b) => a.オッズ - b.オッズ);
}

// ============================================================
// ポートフォリオ計算
//
// ① 割れ目判定
//    割れ目指数 = 下位馬(4着以下)の平均オッズ ÷ 上位3頭の平均オッズ
//    2.0以上で購入推奨
//
// ② 賭金配分（逆数比）
//    各馬の賭金 = (1/オッズ) / Σ(1/オッズ) × 予算
//    → どの馬が来ても払戻が均等に近づく
//    → 100円単位、最低100円
// ============================================================
function calculatePortfolio(odds) {
if (!odds || odds.length < 4) {
return { 割れ目あり: false, 理由: ‘出走馬が少なすぎます’ };
}

```
const top3  = odds.slice(0, 3);
const rest  = odds.slice(3);
const avg   = arr => arr.reduce((s, o) => s + o.オッズ, 0) / arr.length;
const spread = avg(rest) / avg(top3);

console.log(`割れ目指数: ${spread.toFixed(2)}`);

if (spread < 2.0) {
    return {
        割れ目あり:  false,
        割れ目指数: spread.toFixed(2),
        理由: `割れ目指数 ${spread.toFixed(2)} < 2.0 のため購入見送り`,
    };
}

const BUDGET     = 1000;
const inverses   = top3.map(o => 1 / o.オッズ);
const sumInverse = inverses.reduce((s, v) => s + v, 0);

const portfolio = top3.map((o, i) => {
    const raw       = (inverses[i] / sumInverse) * BUDGET;
    const betAmount = Math.max(100, Math.round(raw / 100) * 100);
    return {
        馬番:     o.馬番,
        馬名:     o.馬名,
        オッズ:   o.オッズ,
        賭金:     betAmount,
        的中払戻: Math.round(betAmount * o.オッズ),
    };
});

const totalInvested = portfolio.reduce((s, p) => s + p.賭金, 0);
const returns       = portfolio.map(p => p.的中払戻);

return {
    割れ目あり:   true,
    割れ目指数:  spread.toFixed(2),
    推奨購入:    portfolio,
    総投資:      totalInvested,
    最小リターン: Math.min(...returns),
    最大リターン: Math.max(...returns),
    最小利益:    Math.min(...returns) - totalInvested,
};
```

}

// ============================================================
// 結果表示
// ============================================================
function displayResults(odds, portfolio) {
let html = ‘<h3>📊 単勝オッズ一覧（人気順）</h3>’;
html += ‘<table><thead><tr><th>人気</th><th>馬番</th><th>馬名</th><th>単勝</th></tr></thead><tbody>’;

```
odds.forEach((o, i) => {
    const isPick = portfolio.割れ目あり && portfolio.推奨購入?.some(p => p.馬番 === o.馬番);
    const style  = isPick ? 'background:#fff9c4;font-weight:bold;' : '';
    html += `<tr style="${style}">
        <td>${i + 1}人気</td><td>${o.馬番}</td><td>${o.馬名}</td><td>${o.オッズ.toFixed(1)}倍</td>
    </tr>`;
});

html += '</tbody></table>';

if (portfolio.割れ目あり) {
    html += `<div class="alert-success">
        ✅ <strong>割れ目検出！購入推奨</strong><br>
        割れ目指数: <strong>${portfolio.割れ目指数}倍</strong>
    </div>`;
} else {
    html += `<div class="alert-danger">
        ❌ <strong>購入見送り</strong> — ${portfolio.理由}
    </div>`;
}

document.getElementById('oddsResult').innerHTML = html;
```

}

// ============================================================
// ポートフォリオ表示
// ============================================================
function displayPortfolioInfo(portfolio) {
let html = ‘<div class="portfolio-box">’;

```
portfolio.推奨購入.forEach(p => {
    html += `<div class="bet-row">
        🐎 <strong>${p.馬番}番 ${p.馬名}</strong>
        <span class="bet-amount">${p.賭金}円</span>
        <span class="odds-label">@ ${p.オッズ.toFixed(1)}倍 → 的中時 <strong>${p.的中払戻}円</strong></span>
    </div>`;
});

const profit = portfolio.最小利益;
html += `<div class="summary-row">
    <div>合計投資: <strong>${portfolio.総投資}円</strong></div>
    <div>払戻: <strong>${portfolio.最小リターン}〜${portfolio.最大リターン}円</strong>
        　最低利益: <strong class="${profit >= 0 ? 'profit' : 'loss'}">${profit >= 0 ? '+' : ''}${profit}円</strong>
    </div>
</div>`;
html += '</div>';

document.getElementById('portfolioInfo').innerHTML = html;
```

}

// ============================================================
// ウマカスマート
// ============================================================
function handleGoToUmaca() {
if (!cachedPortfolio?.割れ目あり) {
showError(‘購入推奨のポートフォリオがありません’);
return;
}
const lines = cachedPortfolio.推奨購入
.map(p => `  ${p.馬番}番（${p.馬名}）: ${p.賭金}円`)
.join(’\n’);

```
alert('【単勝 投票内容】\n\n' + lines + '\n\n合計: ' + cachedPortfolio.総投資 + '円\n\nウマカスマートを開きます。');
window.open('https://www.ipat.jra.go.jp/sp/umaca/index.cgi', '_blank');
```

}

// ============================================================
// ヘルパー
// ============================================================
function showError(msg) {
const el = document.getElementById(‘error’);
el.innerHTML = msg.replace(/\n/g, ‘<br>’);
el.style.display = ‘block’;
}
function hideError() { document.getElementById(‘error’).style.display = ‘none’; }
function showLoading(show) { document.getElementById(‘loading’).style.display = show ? ‘block’ : ‘none’; }
