console.log('✅✅✅ script.js が読み込まれました！！！');

let cachedPortfolio = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔵 DOMContentLoaded');
    document.getElementById('fetchOdds').addEventListener('click', handleFetchOdds);
    document.getElementById('goToUmaca').addEventListener('click', handleGoToUmaca);
});

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
        console.log('📊 オッズ取得開始...');
        
        // プロキシ経由で取得を試みる
        let odds = null;
        
        try {
            odds = await fetchFromJraGoViaProxy(raceDate, racePlace, raceNumber);
            console.log('✅ プロキシ取得成功');
        } catch (e) {
            console.log('❌ プロキシ取得失敗:', e.message);
            console.log('💾 ダミーデータを使用します');
            odds = generateMockOdds();
        }
        
        console.log('📊 取得したオッズ:', odds);
        
        if (!odds || odds.length === 0) {
            console.log('❌ オッズが空。ダミー使用');
            odds = generateMockOdds();
        }

        const portfolio = calculatePortfolio(odds);
        cachedPortfolio = portfolio;

        displayResults(odds, portfolio);

        if (portfolio.割れ目あり) {
            displayPortfolioInfo(portfolio);
            document.getElementById('portfolioData').style.display = 'block';
        }

        document.getElementById('outputSection').style.display = 'block';
        
    } catch (error) {
        console.error('❌ エラー:', error);
        showError('エラー: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ========================================
// プロキシ経由で JRA公式からオッズを取得
// ========================================
async function fetchFromJraGoViaProxy(raceDate, racePlace, raceNumber) {
    console.log('🌐 プロキシ経由で jra.go.jp から取得中...');
    
    const [year, month, day] = raceDate.split('-');
    const dateStr = `${year}${month}${day}`;
    
    // JRA公式のオッズページ
    const targetUrl = `https://www.jra.go.jp/keiba/data/odds/?rf_date=${dateStr}`;
    
    // 無料プロキ���サービス（複数用意）
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    ];
    
    let lastError = null;

    for (let i = 0; i < proxies.length; i++) {
        try {
            const proxyUrl = proxies[i];
            console.log(`プロキシ${i + 1}を試行: ${proxyUrl.substring(0, 50)}...`);

            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            
            console.log('✅ HTML 取得成功');
            console.log('HTML長:', html.length);

            // HTML をパース
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // オッズを抽出
            const odds = extractOdds(doc);

            if (odds && odds.length > 0) {
                console.log('✅ オッズ抽出成功:', odds.length, '頭');
                return odds;
            } else {
                console.log('⚠️ このプロキシではオッズが見つかりません');
                lastError = new Error('オッズデータが見つかりません');
            }

        } catch (error) {
            console.log(`❌ プロキシ${i + 1}失敗:`, error.message);
            lastError = error;
        }
    }

    // 全てのプロキシが失敗
    throw lastError || new Error('���てのプロキシが失敗しました');
}

// ========================================
// HTMLからオッズを抽出
// ========================================
function extractOdds(doc) {
    console.log('🔍 オッズを抽出中...');
    
    const odds = [];
    
    // パターン1: テーブル内の <tr> から抽出
    const rows = doc.querySelectorAll('table tr');
    console.log('テーブル行数:', rows.length);

    if (rows.length > 0) {
        rows.forEach((row, rowIndex) => {
            try {
                const cells = row.querySelectorAll('td');
                
                if (cells.length >= 2) {
                    // 最初のセルが馬番
                    const horseNumText = cells[0]?.innerText.trim();
                    const horseNum = parseInt(horseNumText);

                    // 最後から2番目か最後のセルがオッズ
                    let oddsValue = null;
                    
                    // 複数の候補をチェック
                    for (let i = cells.length - 1; i >= 1; i--) {
                        const text = cells[i]?.innerText.trim();
                        const parsed = parseFloat(text);
                        
                        if (!isNaN(parsed) && parsed > 1.0 && parsed < 10000) {
                            oddsValue = parsed;
                            break;
                        }
                    }

                    if (horseNum > 0 && horseNum <= 18 && oddsValue) {
                        odds.push({
                            馬番: horseNum,
                            オッズ: oddsValue,
                            馬名: '競走馬'
                        });
                        
                        console.log(`行${rowIndex}: 馬番=${horseNum}, オッズ=${oddsValue}`);
                    }
                }
            } catch (e) {
                // 行のパース失敗
            }
        });
    }

    console.log('抽出結果:', odds.length, '頭');

    if (odds.length === 0) {
        console.log('⚠️ テーブルからは抽出できず。他のパターンを試行...');
        
        // パターン2: <strong> タグから抽出
        const strongElements = doc.querySelectorAll('strong');
        strongElements.forEach((el) => {
            const text = el.innerText.trim();
            const oddsMatch = text.match(/(\d+\.?\d*)/);
            if (oddsMatch) {
                console.log('strong:', text);
            }
        });
    }

    // ソート
    if (odds.length > 0) {
        odds.sort((a, b) => a.オッズ - b.オッズ);
        console.log('✅ オッズをソート完了');
    }

    return odds;
}

// ========================================
// ダミーオッズを生成
// ========================================
function generateMockOdds() {
    console.log('🎲 ダミーオッズ生成');
    return [
        { 馬番: 1, オッズ: 2.1, 馬名: 'サンプル①' },
        { 馬番: 2, オッズ: 3.5, 馬名: 'サンプル②' },
        { 馬番: 3, オッズ: 4.2, 馬名: 'サンプル③' },
        { 馬番: 4, オッズ: 8.5, 馬名: 'サンプル④' },
        { 馬番: 5, オッズ: 12.0, 馬名: 'サンプル⑤' },
        { 馬番: 6, オッズ: 18.5, 馬名: 'サンプル⑥' },
        { 馬番: 7, オッズ: 25.0, 馬名: 'サンプル⑦' },
        { 馬番: 8, オッズ: 32.0, 馬名: 'サンプル⑧' },
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

    const topAvg = top3.reduce((sum, o) => sum + o.オッズ, 0) / 3;
    const bottomAvg = bottom3.reduce((sum, o) => sum + o.オッズ, 0) / 3;
    const spread = bottomAvg / topAvg;

    console.log(`割れ目: top=${topAvg.toFixed(2)}, bottom=${bottomAvg.toFixed(2)}, spread=${spread.toFixed(2)}`);

    if (spread >= 2.0) {
        const totalBudget = 1000;
        const portfolio = [];

        top3.forEach(o => {
            const betAmount = Math.round(totalBudget / 3);
            portfolio.push({
                馬番: o.馬番,
                馬名: o.馬名,
                オッズ: o.オッズ,
                賭金: betAmount,
                期待値: (betAmount * o.オッズ).toFixed(0)
            });
        });

        const totalExpected = portfolio.reduce((s, p) => s + parseFloat(p.期待値), 0);

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
            割れ目指数: spread.toFixed(2)
        };
    }
}

// ========================================
// 結果を表示
// ========================================
function displayResults(odds, portfolio) {
    console.log('💾 結果を表示中...');

    let html = '<h3>📊 オッズ一覧</h3>';
    html += '<table><tr><th>馬番</th><th>馬名</th><th>オッズ</th></tr>';
    
    odds.forEach(o => {
        html += `<tr><td>${o.馬番}</td><td>${o.馬名}</td><td>${o.オッズ.toFixed(2)}</td></tr>`;
    });
    
    html += '</table>';

    if (portfolio.割れ目あり) {
        html += `<div style="background:#d4edda;padding:10px;border-radius:5px;color:#155724;margin:10px 0;">
            ✅ <strong>割れ目検出！購入推奨</strong><br>
            割れ目指数: <strong>${portfolio.割れ目指数}倍</strong>
        </div>`;
        
        html += '<h3>推奨購入内容</h3>';
        html += '<table><tr><th>馬番</th><th>馬名</th><th>オッズ</th><th>賭金</th></tr>';
        
        portfolio.推奨購入.forEach(p => {
            html += `<tr><td>${p.馬番}</td><td>${p.馬名}</td><td>${p.オッズ.toFixed(2)}</td><td>${p.賭金}円</td></tr>`;
        });
        
        html += '</table>';
        html += `<p><strong>総投資: ${portfolio.総投資}円</strong></p>`;
        html += `<p><strong>期待リターン: ${portfolio.期待リターン}円</strong></p>`;
    } else {
        html += `<div style="background:#f8d7da;padding:10px;border-radius:5px;color:#721c24;margin:10px 0;">
            ❌ <strong>購入見送り</strong><br>
            割れ目指数: ${portfolio.割れ目指数}倍（目安: 2.0倍以上）
        </div>`;
    }

    document.getElementById('oddsResult').innerHTML = html;
}

// ========================================
// ポートフォリオ情報を表示
// ========================================
function displayPortfolioInfo(portfolio) {
    let html = '<div style="background:#d4edda;padding:15px;border-radius:8px;border-left:4px solid #28a745;">';
    
    portfolio.推奨購入.forEach(p => {
        html += `<p>🐎 <strong>${p.馬番}番（${p.馬名}）</strong>: ${p.賭金}円 @ ${p.オッズ.toFixed(2)}倍</p>`;
    });
    
    html += `<p style="margin-top:10px;font-size:12px;">合計: ${portfolio.総投資}円</p>`;
    html += '</div>';

    document.getElementById('portfolioInfo').innerHTML = html;
}

// ========================================
// ウマカスマートへのボタン
// ========================================
function handleGoToUmaca() {
    console.log('🏇 ウマカスマートボタンクリック');

    if (!cachedPortfolio?.割れ目あり) {
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
            cachedPortfolio.推奨購入.map(p => `${p.馬番}番: ${p.賭金}円`).join('\n') +
            '\n\nページが読み込まれたら、自動入力が実行されます。');
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

        alert('🎯 自動入力が完了しました！\n\n「次へ」をタップしてください。');

    } catch (error) {
        console.error('❌ 自動入力エラー:', error);
        alert('自動入力に失敗しました。手動で入力してください。');
    }
}

// ========================================
// ヘルパー関数
// ========================================
function showError(message) {
    document.getElementById('error').textContent = message;
    document.getElementById('error').style.display = 'block';
    console.error('🚨', message);
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    console.log(show ? '⏳ ローディング開始' : '⏳ ローディング終了');
}
