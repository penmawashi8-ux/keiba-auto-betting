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
        // オッズを取得（実装は次のステップで詳しくします）
        const odds = await fetchOddsFromJRA(raceDate, racePlace, raceNumber);
        
        // ポートフォリオを計算
        const portfolio = calculatePortfolio(odds);
        
        // 結果を表示
        displayResults(odds, portfolio);
        
        // ウマカスマートボタンを表示
        document.getElementById('outputSection').style.display = 'block';
    } catch (error) {
        showError('オッズの取得に失敗しました: ' + error.message);
    } finally {
        showLoading(false);
    }
});

// JRA公式からオッズを取得する関数（仮実装）
async function fetchOddsFromJRA(date, place, raceNum) {
    // ⚠️ 注: 実装が必要です
    // JRA公式サイトから実際のオッズデータを取得する処理をここに書きます
    
    // 仮のダミーデータ（テスト用）
    return [
        { 馬番: 1, オッズ: 2.1, 人気: 1 },
        { 馬番: 2, オッズ: 3.5, 人気: 2 },
        { 馬番: 3, オッズ: 4.2, 人気: 3 },
        { 馬番: 4, オッズ: 8.5, 人気: 4 },
        { 馬番: 5, オッズ: 12.0, 人気: 5 },
        { 馬番: 6, オッズ: 18.5, 人気: 6 },
        { 馬番: 7, オッズ: 25.0, 人気: 7 },
        { 馬番: 8, オッズ: 32.0, 人気: 8 },
    ];
}

// ポートフォリオを計算する関数
function calculatePortfolio(odds) {
    // 上位3頭と下位3頭で割れ目があるかチェック
    const top3 = odds.slice(0, 3);
    const bottom3 = odds.slice(-3);
    
    const topAvgOdds = top3.reduce((sum, o) => sum + o.オッズ, 0) / top3.length;
    const bottomAvgOdds = bottom3.reduce((sum, o) => sum + o.オッズ, 0) / bottom3.length;
    
    const spread = bottomAvgOdds / topAvgOdds;
    
    // 割れ目が2倍以上あれば購入対象
    if (spread >= 2.0) {
        // 簡易的なポートフォリオ計算
        const totalBudget = 1000; // 1000円
        const portfolio = [];
        
        top3.forEach(o => {
            const betAmount = Math.round(totalBudget / (o.オッズ * top3.length));
            portfolio.push({
                馬番: o.馬番,
                オッズ: o.オッズ,
                賭金: betAmount,
                期待値: betAmount * o.オッズ
            });
        });
        
        return {
            ���れ目あり: true,
            割れ目指数: spread.toFixed(2),
            推奨購入: portfolio,
            総投資: totalBudget,
            期待リターン: portfolio.reduce((sum, p) => sum + p.期待値, 0).toFixed(0)
        };
    } else {
        return {
            割れ目あり: false,
            割れ目指数: spread.toFixed(2),
            理由: '割れ目が不十分です（目安: 2.0倍以上）'
        };
    }
}

// 結果を表示する関数
function displayResults(odds, portfolio) {
    let html = '<h3>オッズ一覧</h3>';
    html += '<table>';
    html += '<tr><th>馬番</th><th>オッズ</th><th>人気</th></tr>';
    
    odds.forEach(o => {
        html += `<tr><td>${o.馬番}</td><td>${o.オッズ.toFixed(2)}</td><td>${o.人気}</td></tr>`;
    });
    
    html += '</table>';
    html += '<h3>ポートフォリオ分析</h3>';
    
    if (portfolio.割れ目あり) {
        html += `<p><strong>割れ目指数: ${portfolio.割れ目指数}倍</strong> ✅ 購入推��</p>`;
        html += '<table>';
        html += '<tr><th>馬番</th><th>オッズ</th><th>賭金</th><th>期待値</th></tr>';
        
        portfolio.推奨購入.forEach(p => {
            html += `<tr><td>${p.馬番}</td><td>${p.オッズ.toFixed(2)}</td><td>${p.賭金}円</td><td>${p.期待値.toFixed(0)}円</td></tr>`;
        });
        
        html += '</table>';
        html += `<p><strong>総投資: ${portfolio.総投資}円</strong></p>`;
        html += `<p><strong>期待リターン: ${portfolio.期待リターン}円</strong></p>`;
    } else {
        html += `<p>❌ 購入見送り: ${portfolio.理由}</p>`;
        html += `<p>割れ目指数: ${portfolio.割れ目指数}倍</p>`;
    }
    
    document.getElementById('oddsResult').innerHTML = html;
}

// ウマカスマートへのボタンをクリック時
document.getElementById('goToUmaca').addEventListener('click', function() {
    // ⚠️ 後のステップで実装します
    alert('ウマカスマート自動入力機能は次のステップで実装します');
});

// ヘルパー関数
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
