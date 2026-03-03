console.log(‘✅ script.js 読み込み完了’);

let cachedPortfolio = null;

// 競馬場コード → netkeiba場コード のマッピング
const PLACE_CODE_MAP = {
‘01’: ‘01’, // 札幌
‘02’: ‘02’, // 函館
‘03’: ‘03’, // 福島
‘04’: ‘04’, // 新潟
‘05’: ‘05’, // 東京
‘06’: ‘06’, // 中山
‘07’: ‘07’, // 中京
‘08’: ‘08’, // 京都
‘09’: ‘09’, // 阪神
‘10’: ‘10’, // 小倉
};

document.addEventListener(‘DOMContentLoaded’, function () {
// デフォルト日付を今日に設定
const today = new Date().toISOString().split(‘T’)[0];
document.getElementById(‘raceDate’).value = today;

```
document.getElementById('fetchOdds').addEventListener('click', handleFetchOdds);
document.getElementById('goToUmaca').addEventListener('click', handleGoToUmaca);
```

});

// ========================================
// メイン: オッズ取得ハンドラ
// ========================================
async function handleFetchOdds() {
const raceDate = document.getElementById(‘raceDate’).value;
const racePlace = document.getElementById(‘racePlace’).value;
const kaisai = document.getElementById(‘kaisai’).value.padStart(2, ‘0’);
const raceNumber = document.getElementById(‘raceNumber’).value.padStart(2, ‘0’);

```
if (!raceDate || !racePlace || !kaisai || !raceNumber) {
    showError('すべての項目を入力してください');
    return;
}

hideError();
showLoading(true);
document.getElementById('outputSection').style.display = 'none';

let odds = null;
let dataSource = '';

try {
    // ① netkeiba経由で取得を試みる
    try {
        odds = await fetchFromNetkeiba(raceDate, racePlace, kaisai, raceNumber);
        dataSource = '📡 netkeibaよりリアルタイム取得';
        console.log('✅ netkeiba取得成功');
    } catch (e) {
        console.warn('⚠️ netkeiba取得失敗:', e.message);
    }

    // ② 失敗したらJRA公式HTMLをプロキシ経由で試みる
    if (!odds || odds.length === 0) {
        try {
            odds = await fetchFromJraViaProxy(raceDate, racePlace, kaisai, raceNumber);
            dataSource = '📡 JRA公式よりリアルタイム取得';
            console.log('✅ JRA取得成功');
        } catch (e) {
            console.warn('⚠️ JRA取得失敗:', e.message);
        }
    }

    // ③ 全て失敗 → ダミーデータ
    if (!odds || odds.length === 0) {
        odds = generateMockOdds();
        dataSource = '⚠️ デモデータ（実際のオッズ取得に失敗）';
        console.log('💾 ダミーデータを使用');
    }

    const portfolio = calculatePortfolio(odds);
    cachedPortfolio = portfolio;

    document.getElementById('dataSource').textContent = dataSource;
    displayResults(odds, portfolio);

    if (portfolio.割れ目あり) {
        displayPortfolioInfo(portfolio);
        document.getElementById('portfolioData').style.display = 'block';
    } else {
        document.getElementById('portfolioData').style.display = 'none';
    }

    document.getElementById('outputSection').style.display = 'block';

} catch (error) {
    console.error('❌ 予期しないエラー:', error);
    showError('エラーが発生しました: ' + error.message);
} finally {
    showLoading(false);
}
```

}

// ========================================
// ① netkeibaのオッズページから取得
//    URL例: https://race.netkeiba.com/odds/index.html?race_id=202406050811
//    race_id = 年(4桁) + 場コード(2桁) + 開催回(2桁) + 日目(2桁) + レース番号(2桁)
//    ※「日目」はkaisaiをそのまま流用（簡易版）
// ========================================
async function fetchFromNetkeiba(raceDate, racePlace, kaisai, raceNumber) {
const [year, month, day] = raceDate.split(’-’);

```
// race_id の組み立て
// netkeibaのrace_idは: YYYY + 場コード(2桁) + 開催回(2桁) + 開催日目(2桁) + レース番号(2桁)
// 開催日目はユーザー入力の「kaisai」で代替（簡易的に）
const raceId = `${year}${PLACE_CODE_MAP[racePlace]}${kaisai}${kaisai}${raceNumber}`;
const targetUrl = `https://race.netkeiba.com/odds/index.html?race_id=${raceId}&type=b1`;

console.log('🌐 netkeiba URL:', targetUrl);

const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
if (!response.ok) throw new Error(`HTTP ${response.status}`);

const html = await response.text();
console.log('HTML取得完了 length:', html.length);

return parseNetkeibaOdds(html);
```

}

// ========================================
// netkeibaのHTMLからオッズを抽出
// ========================================
function parseNetkeibaOdds(html) {
const parser = new DOMParser();
const doc = parser.parseFromString(html, ‘text/html’);
const odds = [];

```
// netkeibaの単勝オッズテーブル: id="odds_tan_block" or class含む
// 各行 <tr> に馬番・馬名・オッズが入っている
const rows = doc.querySelectorAll('tr');

rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 3) return;

    // 馬番は通常1列目
    const numText = (cells[0].textContent || '').trim();
    const horseNum = parseInt(numText);
    if (isNaN(horseNum) || horseNum < 1 || horseNum > 18) return;

    // 馬名は2〜3列目あたり
    let horseName = '';
    for (let i = 1; i < Math.min(cells.length, 4); i++) {
        const t = (cells[i].textContent || '').trim();
        if (t.length >= 2 && t.length <= 12 && !/^\d/.test(t) && !/倍|円/.test(t)) {
            horseName = t;
            break;
        }
    }

    // オッズは数値で「X.X」形式のセルを探す
    let oddsValue = null;
    for (let i = cells.length - 1; i >= 1; i--) {
        const t = (cells[i].textContent || '').replace(/[,\s]/g, '').trim();
        const v = parseFloat(t);
        if (!isNaN(v) && v >= 1.0 && v < 9999) {
            oddsValue = v;
            break;
        }
    }

    if (horseNum && oddsValue) {
        odds.push({
            馬番: horseNum,
            馬名: horseName || `${horseNum}番`,
            オッズ: oddsValue,
        });
    }
});

// 重複排除（馬番ベース）
const seen = new Set();
const unique = odds.filter(o => {
    if (seen.has(o.馬番)) return false;
    seen.add(o.馬番);
    return true;
});

unique.sort((a, b) => a.オッズ - b.オッズ);
console.log(`✅ netkeiba抽出結果: ${unique.length}頭`);
return unique;
```

}

// ========================================
// ② JRA公式HTMLをプロキシ経由で取得（フォールバック）
// ========================================
async function fetchFromJraViaProxy(raceDate, racePlace, kaisai, raceNumber) {
const [year, month, day] = raceDate.split(’-’);
const dateStr = `${year}${month}${day}`;

```
// JRA公式オッズページのURL（単勝・複勝）
const targetUrl = `https://www.jra.go.jp/keiba/odds/tanfuku/${dateStr}${racePlace}${kaisai}${raceNumber}.html`;
console.log('🌐 JRA URL:', targetUrl);

const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
];

for (const proxyUrl of proxies) {
    try {
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
        if (!response.ok) continue;

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const odds = extractOddsFromJraHtml(doc);

        if (odds.length > 0) return odds;
    } catch (e) {
        console.warn('プロキシ失敗:', e.message);
    }
}

throw new Error('JRAからの取得に失敗しました');
```

}

// ========================================
// JRA公式HTMLからオッズを抽出
// ========================================
function extractOddsFromJraHtml(doc) {
const odds = [];
const rows = doc.querySelectorAll(‘table tr’);

```
rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return;

    const numText = (cells[0].textContent || '').trim();
    const horseNum = parseInt(numText);
    if (isNaN(horseNum) || horseNum < 1 || horseNum > 18) return;

    let oddsValue = null;
    for (let i = cells.length - 1; i >= 1; i--) {
        const t = (cells[i].textContent || '').replace(/[,\s]/g, '').trim();
        const v = parseFloat(t);
        if (!isNaN(v) && v >= 1.0 && v < 9999) {
            oddsValue = v;
            break;
        }
    }

    let horseName = '';
    for (let i = 1; i < Math.min(cells.length, 4); i++) {
        const t = (cells[i].textContent || '').trim();
        if (t.length >= 2 && t.length <= 12 && !/^\d/.test(t)) {
            horseName = t;
            break;
        }
    }

    if (horseNum && oddsValue) {
        odds.push({ 馬番: horseNum, 馬名: horseName || `${horseNum}番`, オッズ: oddsValue });
    }
});

odds.sort((a, b) => a.オッズ - b.オッズ);
return odds;
```

}

// ========================================
// ③ ダミーオッズ（デモ用）
// ========================================
function generateMockOdds() {
return [
{ 馬番: 3, オッズ: 2.1, 馬名: ‘アローエクスプレス’ },
{ 馬番: 7, オッズ: 3.5, 馬名: ‘ゴールドシップ’ },
{ 馬番: 1, オッズ: 4.2, 馬名: ‘ディープインパクト’ },
{ 馬番: 11, オッズ: 8.5, 馬名: ‘キングカメハメハ’ },
{ 馬番: 5, オッズ: 12.0, 馬名: ‘オルフェーヴル’ },
{ 馬番: 9, オッズ: 18.5, 馬名: ‘ジェンティルドンナ’ },
{ 馬番: 2, オッズ: 25.0, 馬名: ‘ブエナビスタ’ },
{ 馬番: 14, オッズ: 35.0, 馬名: ‘ウオッカ’ },
{ 馬番: 6, オッズ: 48.0, 馬名: ‘ダイワスカーレット’ },
{ 馬番: 12, オッズ: 62.0, 馬名: ‘テイエムオペラオー’ },
].sort((a, b) => a.オッズ - b.オッズ);
}

// ========================================
// ポートフォリオ計算
// 上位人気と下位人気のオッズ差（割れ目）を判定
// 推奨馬への賭金を逆数比で配分（期待値が均等になるよう）
// ========================================
function calculatePortfolio(odds) {
if (!odds || odds.length < 4) {
return { 割れ目あり: false, 理由: ‘出走馬が少なすぎます’ };
}

```
const top3 = odds.slice(0, 3);  // 上位人気3頭
const rest = odds.slice(3);      // それ以降

const topAvg = top3.reduce((s, o) => s + o.オッズ, 0) / top3.length;
const restAvg = rest.reduce((s, o) => s + o.オッズ, 0) / rest.length;
const spread = restAvg / topAvg;

console.log(`割れ目指数: top平均=${topAvg.toFixed(1)}, rest平均=${restAvg.toFixed(1)}, spread=${spread.toFixed(2)}`);

if (spread < 2.0) {
    return {
        割れ目あり: false,
        割れ目指数: spread.toFixed(2),
        理由: '割れ目が小さいため購入見送り（目安: 2.0倍以上）'
    };
}

// 賭金を逆数比で計算（オッズが低い馬に多く賭ける）
const totalBudget = 1000; // 合計1000円
const inverses = top3.map(o => 1 / o.オッズ);
const sumInverse = inverses.reduce((s, v) => s + v, 0);

const portfolio = top3.map((o, i) => {
    // 100円単位に丸める
    const rawAmount = (inverses[i] / sumInverse) * totalBudget;
    const betAmount = Math.round(rawAmount / 100) * 100 || 100;
    return {
        馬番: o.馬番,
        馬名: o.馬名,
        オッズ: o.オッズ,
        賭金: betAmount,
        期待値: Math.round(betAmount * o.オッズ),
    };
});

const totalInvested = portfolio.reduce((s, p) => s + p.賭金, 0);
const maxReturn = Math.max(...portfolio.map(p => p.期待値));

return {
    割れ目あり: true,
    割れ目指数: spread.toFixed(2),
    推奨購入: portfolio,
    総投資: totalInvested,
    最大リターン: maxReturn,
    最小利益: maxReturn - totalInvested,
};
```

}

// ========================================
// 結果を表示
// ========================================
function displayResults(odds, portfolio) {
let html = ‘<h3>📊 単勝オッズ一覧（人気順）</h3>’;
html += ‘<table><thead><tr><th>人気</th><th>馬番</th><th>馬名</th><th>単勝オッズ</th></tr></thead><tbody>’;

```
odds.forEach((o, i) => {
    const highlight = portfolio.割れ目あり && portfolio.推奨購入?.some(p => p.馬番 === o.馬番);
    const rowStyle = highlight ? 'background:#fff3cd;font-weight:bold;' : '';
    html += `<tr style="${rowStyle}">
        <td>${i + 1}番人気</td>
        <td>${o.馬番}</td>
        <td>${o.馬名}</td>
        <td>${o.オッズ.toFixed(1)}倍</td>
    </tr>`;
});

html += '</tbody></table>';

if (portfolio.割れ目あり) {
    html += `<div class="alert-success">
        ✅ <strong>割れ目検出！購入推奨</strong><br>
        割れ目指数: <strong>${portfolio.割れ目指数}倍</strong>（上位と下位のオッズ差）
    </div>`;
} else {
    html += `<div class="alert-danger">
        ❌ <strong>購入見送り</strong><br>
        割れ目指数: ${portfolio.割れ目指数}倍 — ${portfolio.理由}
    </div>`;
}

document.getElementById('oddsResult').innerHTML = html;
```

}

// ========================================
// ポートフォリオ情報を表示
// ========================================
function displayPortfolioInfo(portfolio) {
let html = ‘<div class="portfolio-box">’;

```
portfolio.推奨購入.forEach(p => {
    html += `<div class="bet-row">
        🐎 <strong>${p.馬番}番 ${p.馬名}</strong>
        <span class="bet-amount">${p.賭金}円</span>
        <span class="odds-label">@ ${p.オッズ.toFixed(1)}倍 → 的中時 ${p.期待値}円</span>
    </div>`;
});

html += `<div class="summary-row">
    <span>合計投資: <strong>${portfolio.総投資}円</strong></span>
    <span>最大リターン: <strong>${portfolio.最大リターン}円</strong>
    （最低利益: <strong>+${portfolio.最小利益}円</strong>）</span>
</div>`;
html += '</div>';

document.getElementById('portfolioInfo').innerHTML = html;
```

}

// ========================================
// ウマカスマートへ誘導
// ========================================
function handleGoToUmaca() {
if (!cachedPortfolio?.割れ目あり) {
showError(‘購入推奨のポートフォリオがありません’);
return;
}

```
const summary = cachedPortfolio.推奨購入
    .map(p => `${p.馬番}番（${p.馬名}）: ${p.賭金}円`)
    .join('\n');

alert(
    '【ウマカスマートへの入力内容】\n\n' +
    '馬券種別: 単勝\n\n' +
    summary +
    '\n\n合計: ' + cachedPortfolio.総投資 + '円\n\n' +
    'ウマカスマートを開きます。\n' +
    '※ログイン後、上記内容を手動で入力してください。\n' +
    '（クロスドメイン制限により自動入力はご利用の環境によって動作しない場合があります）'
);

const umacaUrl = 'https://www.ipat.jra.go.jp/sp/umaca/index.cgi';
window.open(umacaUrl, '_blank');
```

}

// ========================================
// ヘルパー
// ========================================
function showError(msg) {
const el = document.getElementById(‘error’);
el.textContent = msg;
el.style.display = ‘block’;
}
function hideError() {
document.getElementById(‘error’).style.display = ‘none’;
}
function showLoading(show) {
document.getElementById(‘loading’).style.display = show ? ‘block’ : ‘none’;
}
