console.log('🔵 script.js が読み込まれました！');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔵 DOM が準備完了しました');
    
    const button = document.getElementById('fetchOdds');
    console.log('ボタン要素:', button);
    
    if (button) {
        button.addEventListener('click', function() {
            console.log('🟢 ボタンがクリックされました！！！');
            handleFetchOdds();
        });
    } else {
        console.error('❌ ボタンが見つかりません！');
    }
});

function handleFetchOdds() {
    console.log('開始: handleFetchOdds()');
    
    const raceDate = document.getElementById('raceDate').value;
    const racePlace = document.getElementById('racePlace').value;
    const raceNumber = document.getElementById('raceNumber').value;

    console.log(`入力値: 日付=${raceDate}, 開催地=${racePlace}, レース=${raceNumber}`);

    if (!raceDate || !racePlace || !raceNumber) {
        alert('すべての項目を入力してください');
        return;
    }

    // ダミーオッズを作成
    const odds = [
        { 馬番: 1, オッズ: 2.1, 人気: 1, 馬名: 'サンプル馬①' },
        { 馬番: 2, オッズ: 3.5, 人気: 2, 馬名: 'サンプル馬②' },
        { 馬番: 3, オッズ: 4.2, 人気: 3, 馬名: 'サンプル馬③' },
        { 馬番: 4, オッズ: 8.5, 人気: 4, 馬名: 'サンプル馬④' },
        { 馬番: 5, オッズ: 12.0, 人気: 5, 馬名: 'サンプル馬⑤' },
        { 馬番: 6, オッズ: 18.5, 人気: 6, 馬名: 'サンプル馬⑥' },
        { 馬番: 7, オッズ: 25.0, 人気: 7, 馬名: 'サンプル馬⑦' },
        { 馬番: 8, オッズ: 32.0, 人気: 8, 馬名: 'サンプル馬⑧' },
    ];

    console.log('オッズ:', odds);

    // ポートフォリオ計算
    const top3 = odds.slice(0, 3);
    const bottom3 = odds.slice(-3);
    const topAvg = top3.reduce((sum, o) => sum + o.オッズ, 0) / 3;
    const bottomAvg = bottom3.reduce((sum, o) => sum + o.オッズ, 0) / 3;
    const spread = bottomAvg / topAvg;

    console.log(`割れ目指数: ${spread.toFixed(2)}`);

    // 結果を表示
    let html = '<h3>📊 オッズ一覧</h3>';
    html += '<table style="width:100%; border-collapse:collapse;">';
    html += '<tr style="background:#667eea; color:white;"><th>馬番</th><th>馬名</th><th>オッズ</th></tr>';
    
    odds.forEach(o => {
        html += `<tr style="border:1px solid #ddd; padding:8px;">
            <td style="padding:8px; border:1px solid #ddd;">${o.馬番}</td>
            <td style="padding:8px; border:1px solid #ddd;">${o.馬名}</td>
            <td style="padding:8px; border:1px solid #ddd;">${o.オッズ.toFixed(2)}</td>
        </tr>`;
    });
    html += '</table>';

    if (spread >= 2.0) {
        html += '<h3 style="color:green;">✅ 割れ目検出！購入推奨</h3>';
        html += `<p>割れ目指数: <strong>${spread.toFixed(2)}倍</strong></p>`;
    } else {
        html += '<h3 style="color:red;">❌ 割れ目なし</h3>';
        html += `<p>割れ目指数: ${spread.toFixed(2)}倍</p>`;
    }

    document.getElementById('oddsResult').innerHTML = html;
    document.getElementById('outputSection').style.display = 'block';

    console.log('✅ 表示完了');
}
