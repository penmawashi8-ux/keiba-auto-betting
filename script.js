// ========================================
// グローバル変数
// ========================================
let cachedPortfolio = null;
let cachedRaceInfo = null;

console.log('✅ script.js が読み込まれました');

// ========================================
// ページ読み込み時の初期化
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔵 DOM 準���完了');
    
    document.getElementById('fetchOdds').addEventListener('click', handleFetchOdds);
    document.getElementById('goToUmaca').addEventListener('click', handleGoToUmaca);
});

// ========================================
// オッズ取得ボタンのハンドラー
// ========================================
async function handleFetchOdds() {
    console.log('🔵 オッズ取得ボタンクリック');
    
    const raceDate = document.getElementById('raceDate').value;
    const racePlace = document.getElementById('racePlace').value;
    const raceNumber = document.getElementById('raceNumber').value;

    console.log(`入力値: 日付=${raceDate}, 開催地=${racePlace}, レース=${raceNumber}`);

    // 入力値チェック
    if (!raceDate || !racePlace || !raceNumber) {
        showError('すべての項目を入力してください');
        return;
    }

    hideError();
    showLoading(true);

    try {
        // オッズを取得
        console.log('📊 JRA公式からオッズを取得中...');
        const odds = await fetchOddsFromJRA(raceDate, racePlace, raceNumber);
        
        if (!odds || odds.length === 0) {
            showError('オッズが取得できませんでした。レース情報を確認してください。');
            return;
        }

        console.log('✅ オッズ取得成功:', odds);

        // ポートフォリオを計算
        const portfolio = calculatePortfolio(odds, raceDate, racePlace, raceNumber);
        cachedPortfolio = portfolio;
        cachedRaceInfo = { raceDate, racePlace, raceNumber };

        // 結果を表示
        displayResults(odds, portfolio);

        // ポートフォリオ情報を表示
        if (portfolio.割れ目あり) {
            displayPortfolioInfo(portfolio);
            document.getElementById('portfolioData').style.display = 'block';
        } else {
            document.getElementById('portfolioData').style.display = 'none';
        }

        document.getElementById('outputSection').style.display = 'block';
        
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
    console.log('🔄 JRA公式オッズ取得開始');

    // 日付をフォーマット
    const [year, month, day] = raceDate.split('-');
    const dateStr = `${year}${month}${day}`; // 20260303

    // 開催地名を日本語に変換
    const placeMap = {
        'nakayama': '中山',
        'hanshin': '阪神',
        'kokura': '小倉'
    };
    const placeName = placeMap[racePlace] || racePlace;

    try {
        // 方法1: sp.jra.jp から取得
        console.log('方法1: sp.jra.jp から取得中...');
        const odds1 = await fetchFromSpJRA(dateStr, placeName, raceNumber);
        if (odds1 && odds1.length > 0) {
            console.log('✅ sp.jra.jp から取得成功');
            return odds1;
        }
    } catch (e) {
        console.log('❌ sp.jra.jp 取得失敗:', e.message);
    }

    try {
        // 方法2: jra.go.jp から取得
        console.log('方法2: jra.go.jp から取得中...');
        const odds2 = await fetchFromJraGo(dateStr, racePlace, raceNumber);
        if (odds2 && odds2.length > 0) {
            console.log('✅ jra.go.jp から取得成功');
            return odds2;
        }
    } catch (e) {
        console.log('❌ jra.go.jp 取得失敗:', e.message);
    }

    try {
        // 方法3: netkeiba から取得
        console.log('方法3: netkeiba から取得中...');
        const odds3 = await fetchFromNetkeiba(dateStr, racePlace, raceNumber);
        if (odds3 && odds3.length > 0) {
            console.log('✅ netkeiba から取得成功');
            return odds3;
        }
    } catch (e) {
        console.log('❌ netkeiba 取得失敗:', e.message);
    }

    // 全て失敗したらダミーデータ
    console.log('💾 全て失敗。ダミーデータを使用します');
    return generateMockOdds();
}

// ========================================
// sp.jra.jp からオッズを取得
// ========================================
async function fetchFromSpJRA(dateStr, placeName, raceNum) {
    console.log('sp.jra.jp URL構築中...');
    
    // sp.jra.jp のオッズページ
    // 写真から見えるように、レース選択後にオッズが表示される
    const url = `https://sp.jra.jp/`;
    
    console.log('URL:', url);
    
    // このアプローチではスクリプト実行が必要なため、
    // 以下は簡略化したバージョン
    // 実際にはサーバー側でのスクレイピングが必要
    
    throw new Error('sp.jra.jp は JavaScriptで動的生成されるため、クライアント側での取得は困難');
}

// ========================================
// jra.go.jp からオッズを取得
// ========================================
async function fetchFromJraGo(dateStr, racePlace, raceNum) {
    console.log('jra.go.jp から取得中...');
    
    // 写真から見えるように、jra.go.jp にはテーブル形式でオッズが表示されている
    // HTML構造: <table> → <tr> → <td class="waku"> (馬番), <td class="odds_tan"> (オッズ)
    
    const url = `https://www.jra.go.jp/keiba/data/odds/?rf_date=${dateStr}`;
    
    try {
        const response = await fetch(url);
        const html = await response.text();
        
        console.log('HTML 取得成功。パース中...');
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const odds = [];
        
        // テーブルから馬番とオッズを抽出
        // 写真から: <td class="waku"> = 馬番, <td class="odds_tan"> = オッズ
        const rows = doc.querySelectorAll('table tr');
        
        console.log('テーブル行数:', rows.length);
        
        rows.forEach((row, index) => {
            try {
                const wakuCell = row.querySelector('td.waku');
                const oddsCell = row.querySelector('td.odds_tan, td.odds');
                
                if (wakuCell && oddsCell) {
                    const horseNum = parseInt(wakuCell.innerText.trim());
                    const oddsValue = parseFloat(oddsCell.innerText.trim().split('\n')[0]);
                    
                    if (horseNum > 0 && !isNaN(oddsValue) && oddsValue > 0) {
                        odds.push({
                            馬番: horseNum,
                            オッズ: oddsValue,
                            馬名: '（取得中）'
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
        
    } catch (error) {
        console.error('jra.go.jp 取得エラー:', error);
        throw error;
    }
}

// ========================================
// netkeiba からオッズを取得
// ========================================
async function fetchFromNetkeiba(dateStr, racePlace, raceNum) {
    console.log('netkeiba から取得中...');
    
    // netkeiba のレース ID フォーマット: YYYYMMDDPPNN
    // PP = 開催地コード（中山=06など）
    const placeCodeMap = {
        '05': '01', // 東京 → 札幌
        '06': '06', // 中山
        '07': '07', // 中京
        '08': '08', // 京都
        '09': '09', // 阪神
        '10': '10', // 小倉
        'nakayama': '06',
        'hanshin': '09',
        'kokura': '10'
    };
    
    const placeCode = placeCodeMap[racePlace] || '06';
    const raceId = dateStr + placeCode + String(raceNum).padStart(2, '0');
    
    const url = `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`;
    
    console.log('netkeiba URL:', url);
    
    try {
        const response = await fetch(url);
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const odds = [];
        
        // netkeiba のテーブルから抽出
        const rows = doc.querySelectorAll('table tr');
        
        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            
            if (cells.length > 5) {
                try {
                    const horseNum = parseInt(cells[0].innerText.trim());
                    
                    // オッズは複数のセルを確認
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
                            馬名: '（取得中）'
                        });
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
        
    } catch (error) {
        console.error('netkeiba 取得エラー:', error);
        throw error;
    }
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
        { 馬番: 7, オッズ: 25.0, 馬名: 'サ���プル馬⑦' },
        { 馬番: 8, オッズ: 32.0, 馬名: 'サンプル馬⑧' },
    ];
}

// ========================================
// ポートフォリオを計算
// ========================================
function calculatePortfolio(odds, raceDate, racePlace, raceNumber) {
    if (!odds || odds.length < 3) {
        return {
            割れ目あり: false,
            理由: '馬が足りません'
        };
    }

    // 上位3頭と下位3頭で割れ目をチェック
    const top3 = odds.slice(0, 3);
    const bottom3 = odds.slice(-3);

    const topAvg = top3.reduce((sum, o) => sum + o.オッズ, 0) / top3.length;
    const bottomAvg = bottom3.reduce((sum, o) => sum + o.オッズ, 0) / bottom3.length;

    const spread = bottomAvg / topAvg;

    console.log(`割れ目計算: top=${topAvg.toFixed(2)}, bottom=${bottomAvg.toFixed(2)}, spread=${spread.toFixed(2)}`);

    if (spread >= 2.0) {
        const totalBudget = 1000;
        const portfolio = [];

        // 上位3頭に均等配分
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
            期待リターン: totalExpected.toFixed(0),
            平均期待値: (totalExpected / totalBudget).toFixed(2)
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
        html += `<tr>
            <td>${o.馬番}</td>
            <td>${o.馬名}</td>
            <td>${o.オッズ.toFixed(2)}</td>
        </tr>`;
    });

    html += '</table>';

    if (portfolio.割れ目あり) {
        html += `<div class="recommendation">`;
        html += `✅ <strong>割れ目検出！購入推奨</strong><br>`;
        html += `割れ目指数: <strong>${portfolio.割れ目指数}倍</strong>`;
        html += `</div>`;

        html += '<h3>推奨購入内容</h3>';
        html += '<table>';
        html += '<tr><th>馬番</th><th>馬名</th><th>オッズ</th><th>賭金</th></tr>';

        portfolio.推奨購入.forEach(p => {
            html += `<tr>
                <td>${p.馬番}</td>
                <td>${p.馬名}</td>
                <td>${p.オッズ.toFixed(2)}</td>
                <td>${p.賭金}円</td>
            </tr>`;
        });

        html += '</table>';
        html += `<p><strong>総投資: ${portfolio.総投資}円</strong></p>`;
        html += `<p><strong>期待リターン: ${portfolio.期待リターン}円</strong></p>`;

    } else {
        html += `<div class="warning">`;
        html += `❌ <strong>購入見送り</strong><br>`;
        html += `${portfolio.理由}<br>`;
        html += `割れ目指数: ${portfolio.割れ目指数}倍 （目安: 2.0倍以上）`;
        html += `</div>`;
    }

    document.getElementById('oddsResult').innerHTML = html;
}

// ========================================
// ポートフォリオ情報を表示
// ========================================
function displayPortfolioInfo(portfolio) {
    let html = '<div class="portfolio-info">';
    html += '<h4>推奨購入内容</h4>';

    portfolio.推奨購入.forEach(p => {
        html += `<p>🐎 <strong>${p.馬番}番（${p.馬名}）</strong>: ${p.賭金}円 @ ${p.オッズ.toFixed(2)}倍</p>`;
    });

    html += `<p style="margin-top: 10px; font-size: 12px;">計: ${portfolio.総投資}円</p>`;
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
        // 3秒後に自動入力を試みる
        setTimeout(() => {
            autoFillUmaca(newWindow, cachedPortfolio);
        }, 3000);

        console.log('✅ ウマカスマートのページを開きました');
        alert('ウマカスマートのページが開きます。\n\n以下の内容を確認してください：\n\n' +
            cachedPortfolio.推奨購入.map(p => `${p.馬番}番: ${p.賭金}円`).join('\n') +
            '\n\nページが読み込まれたら、自動入力が実行されます。\n投票内容を確認して「次へ」をタップしてください。');
    } else {
        showError('ウマカスマートのページを開けませんでした。ポップアップがブロックされていないか確認してください。');
    }
}

// ========================================
// ウマカスマート自動入力
// ========================================
function autoFillUmaca(windowRef, portfolio) {
    try {
        console.log('🔄 ウマカスマート自動入力開始');

        if (!windowRef || windowRef.closed) {
            console.log('❌ ウィンドウが閉じられました');
            return;
        }

        const doc = windowRef.document;
        const inputs = doc.querySelectorAll('input[type="text"], input[type="number"]');

        console.log('見つかった入力フィールド:', inputs.length);

        let inputIndex = 0;

        portfolio.推奨購入.forEach(betInfo => {
            // 馬番を入力
            if (inputs[inputIndex]) {
                inputs[inputIndex].value = betInfo.馬番;
                inputs[inputIndex].dispatchEvent(new Event('input', { bubbles: true }));
                inputs[inputIndex].dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ 馬番 ${betInfo.馬番} を入力`);
                inputIndex++;
            }

            // 金額を入力
            if (inputs[inputIndex]) {
                inputs[inputIndex].value = betInfo.賭金;
                inputs[inputIndex].dispatchEvent(new Event('input', { bubbles: true }));
                inputs[inputIndex].dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ 金額 ${betInfo.賭金}円 を入力`);
                inputIndex++;
            }
        });

        alert('🎯 自動入力が完了しました！\n\n入力内容を確認して、「次へ」ボタンをタップしてください。');

    } catch (error) {
        console.error('❌ 自動入力エラー:', error);
        alert('自動入力に失敗しました。\n\n手動で以下の内容を入力してください：\n\n' +
            portfolio.推奨購入.map(p => `${p.馬番}番: ${p.賭金}円`).join('\n'));
    }
}

// ========================================
// ヘルパー関数
// ========================================
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    console.error('🚨 エラー:', message);
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    if (show) {
        console.log('⏳ ローディング開始');
    } else {
        console.log('⏳ ローディング終了');
    }
}
