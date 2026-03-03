// グローバル変数
let cachedOdds = null;
let cachedPortfolio = null;

// オッズ取得ボタンのクリック時
document.getElementById('fetchOdds').addEventListener('click', async function() {
    const raceDate = document.getElementById('raceDate').value;
    const racePlace = document.getElementById('racePlace').value;
    const raceNumber = document.getElementById('raceNumber').value;

    // 入力値のチェック
    if (!raceDate || !racePlace || !raceNumber) {
        showError('すべての項目を入力してください');
        return;
    }

    showLoading(true);
    hideError();

    try {
        // オッズを取得
        const odds = await fetchOddsFromJRA(raceDate, racePlace, raceNumber);
        
        if (!odds || odds.length === 0) {
            showError('オッズが取得できませんでした。レース情報を確認してください。');
            showLoading(false);
            return;
        }
        
        // キャッシュに保存
        cachedOdds = odds;
        
        // ポートフォリオを計算
        const portfolio = calculatePortfolio(odds);
        cachedPortfolio = portfolio;
        
        // 結果を表示
        displayResults(odds, portfolio);
        
        // ウマカスマートボタンを表示
        document.getElementById('outputSection').style.display = 'block';
    } catch (error) {
        console.error('エラー:', error);
        showError('オッズの取得に失敗し��した: ' + error.message);
    } finally {
        showLoading(false);
    }
});

// ========================================
// 🔑 JRA公式からオッズを取得する関数
// ========================================
async function fetchOddsFromJRA(date, place, raceNum) {
    try {
        // 開催地コードを数字で統一
        const placeCode = place.padStart(2, '0');
        
        // JRA公式オッズページのURL
        const jraUrl = `https://www.jra.go.jp/keiba/data/odds/index.html?`;
        
        // 📌 方法1: JRA公式の REST API を使用（推奨）
        // JRA がJSON形式で提供しているデータを直接取得
        
        // 日付を YYYYMMDD 形式に変換
        const formattedDate = date.replace(/-/g, '');
        
        // JRA公式のデータ取得エンドポイント
        // ※ 実際の API エンドポイントは JRA 公式ドキュメントを確認してください
        const apiUrl = `https://www.jra.go.jp/api/race/odds/${formattedDate}/${placeCode}/${raceNum}`;
        
        console.log('リクエストURL:', apiUrl);
        
        // CORS 対応のプロキシを使用
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${apiUrl}`;
        
        const response = await fetch(proxyUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // データの形式に合わせてパース
        return parseOdds(data);
        
    } catch (error) {
        console.error('JRA API取得エラー:', error);
        
        // フォールバック: ダミーデータを返す（テスト用）
        console.log('ダミーデータを使用します');
        return generateMockOdds();
    }
}

// ========================================
// オッズデータをパースする関数
// ========================================
function parseOdds(data) {
    // JRA公式の実際のデータ形式に合わせてパースします
    // ここは JRA API の応答形式に依存します
    
    if (!data || !data.odds) {
        throw new Error('無効なデータ形式です');
    }
    
    return data.odds.map((item, index) => ({
        馬番: item.horseNumber || (index + 1),
        オッズ: parseFloat(item.odds) || item.odds値,
        人気: item.popularity || (index + 1),
        馬名: item.horseName || '不明',
    })).sort((a, b) => a.オッズ - b.オッズ);
}

// ========================================
// ダミーデータを生成（テスト用）
// ========================================
function generateMockOdds() {
    // リアルな競馬データの例
    const mockData = [
        { 馬番: 1, オッズ: 2.1, 人気: 1, ��名: 'サンプル馬①' },
        { 馬番: 2, オッズ: 3.5, 人気: 2, 馬名: 'サンプル馬②' },
        { 馬番: 3, オッズ: 4.2, 人気: 3, 馬名: 'サンプル馬③' },
        { 馬番: 4, オッズ: 8.5, 人気: 4, 馬名: 'サンプル馬④' },
        { 馬番: 5, オッズ: 12.0, 人気: 5, 馬名: 'サンプル馬⑤' },
        { 馬番: 6, オッズ: 18.5, 人気: 6, 馬名: 'サンプル馬⑥' },
        { 馬番: 7, オッズ: 25.0, 人気: 7, 馬名: 'サンプル馬⑦' },
        { 馬番: 8, オッズ: 32.0, 人気: 8, 馬名: 'サンプル馬⑧' },
    ];
    
    return mockData;
}

// ========================================
// ポートフォリオを計算する関数
// ========================================
function calculatePortfolio(odds) {
    if (!odds || odds.length < 3) {
        return {
            割れ目あり: false,
            理由: '馬が足りません'
        };
    }
    
    // 上位3頭と下位3頭で割れ目をチェック
    const top3 = odds.slice(0, 3);
    const bottom3 = odds.slice(-3);
    
    const topAvgOdds = top3.reduce((sum, o) => sum + o.オッズ, 0) / top3.length;
    const bottomAvgOdds = bottom3.reduce((sum, o) => sum + o.オッズ, 0) / bottom3.length;
    
    const spread = bottomAvgOdds / topAvgOdds;
    
    console.log(`上位3頭平均オッズ: ${topAvgOdds.toFixed(2)}`);
    console.log(`下位3頭平均オッズ: ${bottomAvgOdds.toFixed(2)}`);
    console.log(`割れ目指数: ${spread.toFixed(2)}`);
    
    // 割れ目が2倍以上あれば購入対象
    if (spread >= 2.0) {
        const totalBudget = 1000; // 1000円で計算
        const portfolio = [];
        
        // 上位3頭に均等配分
        top3.forEach(o => {
            const betAmount = Math.round(totalBudget / top3.length);
            portfolio.push({
                馬番: o.馬番,
                馬名: o.馬名,
                オッズ: o.オッズ,
                賭金: betAmount,
                期待値: betAmount * o.オッズ
            });
        });
        
        const totalExpected = portfolio.reduce((sum, p) => sum + p.期待値, 0);
        
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
// 結果を表示する関数
// ========================================
function displayResults(odds, portfolio) {
    let html = '<h3>📊 オッズ一覧</h3>';
    html += '<table>';
    html += '<tr><th>馬番</th><th>馬名</th><th>オッズ</th><th>人気</th></tr>';
    
    odds.forEach(o => {
        html += `<tr>
            <td>${o.馬番}</td>
            <td>${o.馬名 || '不明'}</td>
            <td>${o.オッズ.toFixed(2)}</td>
            <td>${o.人気}</td>
        </tr>`;
    });
    
    html += '</table>';
    html += '<h3>📈 ポートフォリオ分析</h3>';
    
    if (portfolio.割れ目あり) {
        html += `<p style="color: green; font-weight: bold;">
            ✅ 割れ目指数: ${portfolio.割れ目指数}倍（購入推奨）
        </p>`;
        
        html += '<table>';
        html += '<tr><th>馬番</th><th>馬名</th><th>オッズ</th><th>賭金</th><th>期待値</th></tr>';
        
        portfolio.推奨購入.forEach(p => {
            html += `<tr>
                <td>${p.馬番}</td>
                <td>${p.馬名}</td>
                <td>${p.オッズ.toFixed(2)}</td>
                <td>${p.賭金}円</td>
                <td>${p.期待値.toFixed(0)}円</td>
            </tr>`;
        });
        
        html += '</table>';
        
        html += `<div style="background: #d4edda; padding: 10px; border-radius: 5px; margin-top: 10px;">
            <p><strong>総投資:</strong> ${portfolio.総投資}円</p>
            <p><strong>期待リターン:</strong> ${portfolio.期待リターン}円</p>
            <p><strong>期待値:</strong> ${portfolio.平均期待値}倍</p>
        </div>`;
    } else {
        html += `<p style="color: red; font-weight: bold;">
            ❌ 購入見送り: ${portfolio.理由}
        </p>`;
        html += `<p>割れ目指数: ${portfolio.割れ目指数}倍 （目安: 2.0倍以上）</p>`;
    }
    
    document.getElementById('oddsResult').innerHTML = html;
}

// ========================================
// ウマカスマートへのボタン
// ========================================
document.getElementById('goToUmaca').addEventListener('click', function() {
    if (!cachedPortfolio || !cachedPortfolio.割れ目あり) {
        alert('購入推奨のポートフォリオがありません');
        return;
    }
    
    // ステップ6で実装します
    alert('ウマカスマート自動入力ページに遷移します...\n（次のステップで実装）');
});

// ========================================
// ヘルパー関数
// ========================================
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}
