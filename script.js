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
        
        // jra.go.jp から取得を試みる
        const odds = await fetchFromJraGo(raceDate, racePlace, raceNumber);
        
        console.log('📊 取得したオッズ:', odds);
        
        if (!odds || odds.length === 0) {
            console.log('❌ jra.go.jp から取得失敗。ダミー使用');
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

async function fetchFromJraGo(raceDate, racePlace, raceNumber) {
    console.log('🌐 jra.go.jp から取得中...');
    
    const [year, month, day] = raceDate.split('-');
    const dateStr = `${year}${month}${day}`;
    
    const url = `https://www.jra.go.jp/keiba/data/odds/?rf_date=${dateStr}`;
    console.log('URL:', url);

    try {
        const response = await fetch(url);
        const html = await response.text();
        
        console.log('HTML 取得成功');

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const odds = [];
        const rows = doc.querySelectorAll('table tr');

        console.log('テーブル行数:', rows.length);

        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            
            if (cells.length >= 2) {
                const horseNum = parseInt(cells[0]?.innerText.trim());
                const oddsValue = parseFloat(cells[cells.length - 1]?.innerText.trim());

                if (horseNum > 0 && !isNaN(oddsValue) && oddsValue > 0) {
                    odds.push({
                        馬番: horseNum,
                        オッズ: oddsValue,
                        馬名: '競走馬'
                    });
                }
            }
        });

        console.log('抽出したオッズ数:', odds.length);

        if (odds.length === 0) {
            throw new Error('オッズデータが見つかりません');
        }

        return odds.sort((a, b) => a.オッズ - b.オッズ);

    } catch (error) {
        console.error('jra.go.jp エラー:', error);
        throw error;
    }
}

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

function calculatePortfolio(odds) {
    const top3 = odds.slice(0, 3);
    const bottom3 = odds.slice(-3);

    const topAvg = top3.reduce((sum, o) => sum + o.オッズ, 0) / 3;
    const bottomAvg = bottom3.reduce((sum, o) => sum + o.オッズ, 0) / 3;
    const spread = bottomAvg / topAvg;

    console.log(`割れ目: ${spread.toFixed(2)}`);

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

        return {
            割れ目あり: true,
            割れ目指数: spread.toFixed(2),
            推奨購入: portfolio,
            総投資: totalBudget,
            期待リターン: portfolio.reduce((s, p) => s + parseFloat(p.期待値), 0).toFixed(0)
        };
    } else {
        return {
            割れ目あり: false,
            割れ目指数: spread.toFixed(2)
        };
    }
}

function displayResults(odds, portfolio) {
    let html = '<h3>📊 オッズ一覧</h3>';
    html += '<table><tr><th>馬番</th><th>馬名</th><th>オッズ</th></tr>';
    odds.forEach(o => {
        html += `<tr><td>${o.馬番}</td><td>${o.馬名}</td><td>${o.オッズ.toFixed(2)}</td></tr>`;
    });
    html += '</table>';

    if (portfolio.割れ目あり) {
        html += `<div style="background:#d4edda;padding:10px;color:#155724;">
            ✅ 割れ目検出！${portfolio.割れ目指数}倍
        </div>`;
        html += '<h3>推奨購入</h3>';
        html += '<table><tr><th>馬番</th><th>馬名</th><th>オッズ</th><th>賭金</th></tr>';
        portfolio.推奨購入.forEach(p => {
            html += `<tr><td>${p.馬番}</td><td>${p.馬名}</td><td>${p.オッズ.toFixed(2)}</td><td>${p.賭金}円</td></tr>`;
        });
        html += '</table>';
    } else {
        html += `<div style="background:#f8d7da;padding:10px;color:#721c24;">
            ❌ 割れ目なし: ${portfolio.割れ目指数}倍
        </div>`;
    }

    document.getElementById('oddsResult').innerHTML = html;
}

function displayPortfolioInfo(portfolio) {
    let html = '<div style="background:#d4edda;padding:10px;">';
    portfolio.推奨購入.forEach(p => {
        html += `<p>🐎 ${p.馬番}番: ${p.賭金}円</p>`;
    });
    html += '</div>';
    document.getElementById('portfolioInfo').innerHTML = html;
}

function handleGoToUmaca() {
    if (!cachedPortfolio?.割れ目あり) {
        showError('推奨がありません');
        return;
    }

    const umacaUrl = 'https://www.ipat.jra.go.jp/sp/umaca/index.cgi';
    const newWindow = window.open(umacaUrl, '_blank');

    if (newWindow) {
        alert('ウマカスマートを開きました。\n\n以下を入力してください：\n\n' +
            cachedPortfolio.推奨購入.map(p => `${p.馬番}番: ${p.賭金}円`).join('\n'));
    }
}

function showError(message) {
    document.getElementById('error').textContent = message;
    document.getElementById('error').style.display = 'block';
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}
