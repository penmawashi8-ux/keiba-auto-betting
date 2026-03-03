// ========================================
// グローバル変数
// ========================================
let cachedPortfolio = null;

console.log('✅✅✅ script.js が読み込まれました！！！');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔵 DOM 準備完了');
    document.getElementById('fetchOdds').addEventListener('click', handleFetchOdds);
    document.getElementById('goToUmaca').addEventListener('click', handleGoToUmaca);
});

// ========================================
// オッズ取得ボタンのハンドラー
// ========================================
async function handleFetchOdds() {
    console.log('🔵🔵🔵 オッズ取得ボタンクリック');
    
    const raceDate = document.getElementById('raceDate').value;
    const racePlace = document.getElementById('racePlace').value;
    const raceNumber = document.getElementById('raceNumber').value;

    console.log(`入力値: 日付=${raceDate}, 開催地=${racePlace}, レース=${raceNumber}`);

    if (!raceDate || !racePlace || !raceNumber) {
        showError('すべての項目を入力してください');
        return;
    }

    hideError();
    showLoading(true);

    try {
        console.log('🔄 JRA公式からオッズを取得中...');
        const odds = await fetchOddsFromJRA(raceDate, racePlace, raceNumber);
        
        console.log('取得したオッズ:', odds);
        
        if (!odds || odds.length === 0) {
            showError('オッズが取得できませんでした。レース情報を確認してください。');
            return;
        }

        const portfolio = calculatePortfolio(odds);
        cachedPortfolio = portfolio;

        displayResults(odds, portfolio);

        if (portfolio.割れ目あり) {
            displayPortfolioInfo(portfolio);
            document.getElementById('portfolioData').style.display = 'block';
        } else {
            document.getElementById('portfolioData').style.display = 'none';
        }

        document.getElementById('outputSection').style.display = 'block';
        console.log('✅✅✅ 表示完了');
        
    } catch (error) {
        console.error('❌ エラー:', error);
        showError('オッズの取得に失敗しました: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ========================================
// JRA公式からオッズを取得
// ========================================
async function fetchOddsFromJRA(raceDate, racePlace, raceNumber) {
    console.log('📊 fetchOddsFromJRA 開始');

    const [year, month, day] = raceDate.split('-');
    const dateStr = `${year}${month}${day}`;

    console.log(`日付フォーマット: ${dateStr}`);

    // 方法1: jra.go.jp から取得
    try {
        console.log('方法1: jra.go.jp から取得中...');
        const odds = await fetchFromJraGo(dateStr, racePlace, raceNumber);
        if (odds && odds.length > 0) {
            console.log('✅ jra.go.jp から取得成功:', odds);
            return odds;
        }
    } catch (e) {
        console.log('❌ jra.go.jp 取得失敗:', e.message);
    }

    // 方法2: netkeiba から取得
    try {
        console.log('方法2: netkeiba から取得中...');
        const odds = await fetchFromNetkeiba(dateStr, racePlace, raceNumber);
        if (odds && odds.length > 0) {
            console.log('✅ netkeiba から取得成功:', odds);
            return odds;
        }
    } catch (e) {
        console.log('❌ netkeiba 取得失敗:', e.message);
    }

    // 失敗したらダミーデータ
    console.log('💾 ダミーデータを使用します');
    return generateMockOdds();
}

// ========================================
// jra.go.jp からオッズを取得
// ========================================
async function fetchFromJraGo(dateStr, racePlace, raceNum) {
    console.log('🌐 jra.go.jp URL構築...');
    
    const url = `https://www.jra.go.jp/keiba/data/odds/?rf_date=${dateStr}`;
    console.log('URL:', url);

    const response = await fetch(url);
    const html = await response.text();

    console.log('HTML 取得成功。パース中...');

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const odds = [];
    const rows = doc.querySelectorAll('table tr');

    console.log('テーブル行数:', rows.length);

    rows.forEach((row, index) => {
        try {
            const cells = row.querySelectorAll('td');
            
            if (cells.length >= 2) {
                const horseNumText = cells[0]?.innerText.trim();
                const oddsText = cells[cells.length - 1]?.innerText.trim();

                const horseNum = parseInt(horseNumText);
                const oddsValue = parseFloat(oddsText);

                if (horseNum > 0 && !isNaN(oddsValue) && oddsValue > 0) {
                    odds.push({
                        馬番: horseNum,
                        オッズ: oddsValue,
                        馬名: '競走馬'
                    });
                    
                    console.log(`馬番: ${horseNum}, オッズ: ${oddsValue}`);
                }
            }
        } catch (e) {
            // スキップ
        }
    });

    if (odds.length === 0) {
        throw new Error('データを抽出できませんでした');
    }

    return odds.sort((a, b) => a.オッズ - b.オッズ);
}

// ========================================
// netkeiba からオッズを取得
// ========================================
async function fetchFromNetkeiba(dateStr, racePlace, raceNum) {
    console.log('🌐 netkeiba URL構築...');

    const placeCodeMap = {
        '06': '06',
        '09': '09',
        '10': '10'
    };

    const placeCode = placeCodeMap[racePlace] || '06';
    const raceId = dateStr + placeCode + String(raceNum).padStart(2, '0');
    const url = `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`;

    console.log('netkeiba URL:', url);

    const response = await fetch(url);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const odds = [];
    const rows = doc.querySelectorAll('table tr');

    rows.forEach((row) => {
        const cells = row.querySelectorAll('td');

        if (cells.length > 5) {
            try {
                const horseNum = parseInt(cells[0].innerText.trim());

                let oddsValue = null;
                for (let i = 4; i < cells.length; i++) {
                    const val = parseFloat(cells[i].innerText.trim());
                    if (!isNaN(val) && val > 1.0 && val < 1000) {
                        oddsValue = val;
                        break;
                    }
                }

                if (horseNum > 0 && oddsValue) {
                    odds.push({
                        馬番: horseNum,
                        オッズ: oddsValue,
                        馬名: '競走馬'
                    });
                    
                    console.log(`馬番: ${horseNum}, オッズ: ${oddsValue}`);
                }
            } catch (e) {
                // スキップ
            }
        }
    });

    if (odds.length === 0) {
        throw new Error('データを抽出できませんでした');
    }

    return odds.sort((a, b) => a.オッズ - b.オッズ);
}

// ========================================
// ダミーオッズを生成
// ========================================
function generateMockOdds() {
    console.log('🎲 ダミーオッズを生成');
    
    return [
        { 馬番: 1, オッズ: 2.1, 馬名: 'サンプル馬①' },
        { 馬番: 2, オッズ: 3.5, 馬名: 'サンプル馬②' },
        { 馬番: 3, オッズ: 4.2, 馬名: 'サンプル馬③' },
        { 馬番: 4, オッズ: 8.5, 馬名: 'サンプル馬④' },
        { 馬番: 5, オッズ: 12.0, 馬名: 'サンプル馬⑤' },
        { 馬番: 6, オッズ: 18.5, 馬名: 'サンプル馬⑥' },
        { 馬番: 7, オッズ: 25.0, 馬名: 'サンプル馬⑦' },
        { 馬番: 8, オッズ: 32.0, 馬名: 'サンプル馬⑧' },
    ];
}

// ========================================
// ポートフォリオを計算
// ========================================
function calculatePortfolio(odds) {
    if (!odds || odds.length < 3) {
        return {
            割れ目あり: false,
            理由: '馬が足りません'
        };
    }

    const top3 = odds.slice(0, 3);
    const bottom3 = odds.slice(-3);

    const topAvg = top3.reduce((sum, o) => sum + o.オッズ, 0) / top3.length;
    const bottomAvg = bottom3.reduce((sum, o) => sum + o.オッズ, 0) / bottom3.length;

    const spread = bottomAvg / topAvg;

    console.log(`割れ目計算: top=${topAvg.toFixed(2)}, bottom=${bottomAvg.toFixed(2)}, spread=${spread.toFixed(2)}`);

    if (spread >= 2.0) {
        const totalBudget = 1000;
        const portfolio = [];

        top3.forEach(o => {
            const betAmount = Math.round(totalBudget / top3.length);
            portfolio.push({
                馬番: o.馬番,
                馬名: o.馬名,
                オッズ: o.オッズ,
                賭金: betAmount,
                期待値: (betAmount * o.オッズ).toFixed(0)
            });
        });

        const totalExpected = portfolio.reduce((sum, p) => sum + parseFloat(p.期待値), 0);

        return {
            割れ目あり: true,
            割れ目指数: spread.toFixed(2),
            推奨購入: portfolio,
            総投資: totalBudget,
            期待リターン: totalExpected.toFixed(0)
        };
    } else {
        return {
            割れ目あり: false,
            割れ目指数: spread.toFixed(2),
            理由: '割れ目が不十分です（目安: 2.0倍以上）'
        };
    }
}

// ========================================
// 結果を表示
// ========================================
function displayResults(odds, portfolio) {
    console.log('💾 結果を表示中...');

    let html = '<h3>📊 オッズ一覧</h3>';
    html += '<table>';
    html += '<tr><th>馬番</th><th>馬名</th><th>オッズ</th></tr>';

    odds.forEach(o => {
        html += `<tr><td>${o.馬番}</td><td>${o.馬名}</td><td>${o.オッズ.toFixed(2)}</td></tr>`;
    });

    html += '</table>';

    if (portfolio.割れ目あり) {
        html += `<div style="background:#d4edda;padding:10px;border-radius:5px;margin:10px 0;color:#155724;">
            ✅ <strong>割れ目検出！購入推奨</strong><br>
            割れ目指数: <strong>${portfolio.割れ目指数}倍</strong>
        </div>`;

        html += '<h3>推奨購入内容</h3>';
        html += '<table>';
        html += '<tr><th>馬番</th><th>馬名</th><th>オッズ</th><th>賭金</th></tr>';

        portfolio.推奨購入.forEach(p => {
            html += `<tr><td>${p.馬番}</td><td>${p.馬名}</td><td>${p.オッズ.toFixed(2)}</td><td>${p.賭金}円</td></tr>`;
        });

        html += '</table>';
        html += `<p><strong>総投資: ${portfolio.総投資}円</strong></p>`;
        html += `<p><strong>期待リターン: ${portfolio.期待リターン}円</strong></p>`;

    } else {
        html += `<div style="background:#f8d7da;padding:10px;border-radius:5px;margin:10px 0;color:#721c24;">
            ❌ <strong>購入見送り</strong><br>
            ${portfolio.理由}<br>
            割れ目指数: ${portfolio.割れ目指数}倍
        </div>`;
    }

    document.getElementById('oddsResult').innerHTML = html;
}

// ========================================
// ポートフォリオ情報を表示
// ========================================
function displayPortfolioInfo(portfolio) {
    let html = '<div style="background:#d4edda;padding:15px;border-radius:8px;border-left:4px solid #28a745;">';
    html += '<h4>推奨購入内容</h4>';

    portfolio.推奨購入.forEach(p => {
        html += `<p>🐎 <strong>${p.馬番}番（${p.馬名}）</strong>: ${p.賭金}円 @ ${p.オッズ.toFixed(2)}倍</p>`;
    });

    html += `<p style="margin-top:10px;font-size:12px;">計: ${portfolio.総投資}円</p>`;
    html += '</div>';

    document.getElementById('portfolioInfo').innerHTML = html;
}

// ========================================
// ウマカスマートへのボタン
// ========================================
function handleGoToUmaca() {
    console.log('🏇 ウマカスマートボタンクリック');

    if (!cachedPortfolio || !cachedPortfolio.割れ目あり) {
        showError('購入推奨のポートフォリオがありません');
        return;
    }

    const umacaUrl = 'https://www.ipat.jra.go.jp/sp/umaca/index.cgi';
    const newWindow = window.open(umacaUrl, '_blank');

    if (newWindow) {
        setTimeout(() => {
            autoFillUmaca(newWindow, cachedPortfolio);
        }, 3000);

        alert('ウマカスマートのページが開きます。\n\n以下の内容を確認してください：\n\n' +
            cachedPortfolio.推奨購入.map(p => `${p.馬番}番: ${p.賭金}円`).join('\n'));
    } else {
        showError('ウマカスマートのページを開けませんでした');
    }
}

// ========================================
// ウマカスマート自動入力
// ========================================
function autoFillUmaca(windowRef, portfolio) {
    try {
        console.log('🔄 自動入力開始');

        if (!windowRef || windowRef.closed) {
            console.log('❌ ウィンドウが閉じられました');
            return;
        }

        const doc = windowRef.document;
        const inputs = doc.querySelectorAll('input[type="text"], input[type="number"]');

        console.log('入力フィールド数:', inputs.length);

        let inputIndex = 0;

        portfolio.推奨購入.forEach(betInfo => {
            if (inputs[inputIndex]) {
                inputs[inputIndex].value = betInfo.馬番;
                inputs[inputIndex].dispatchEvent(new Event('input', { bubbles: true }));
                inputIndex++;
            }

            if (inputs[inputIndex]) {
                inputs[inputIndex].value = betInfo.賭金;
                inputs[inputIndex].dispatchEvent(new Event('input', { bubbles: true }));
                inputIndex++;
            }
        });

        alert('🎯 自動入力完了！\n\n「次へ」をタップしてください。');

    } catch (error) {
        console.error('❌ エラー:', error);
        alert('自動入力��敗。手動で入力してください。');
    }
}

// ========================================
// ヘルパー関数
// ========================================
function showError(message) {
    document.getElementById('error').textContent = message;
    document.getElementById('error').style.display = 'block';
    console.error('🚨 エラー:', message);
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}
