let homeworkData = [];
let targetAlertDays = 14;

// 1. APIから宿題データを取得 (JSONP)
function fetchHomeworkZone() {
    const jsonpUrl = "https://script.google.com/macros/s/AKfycbzCoWsfnoNW1WH75I6GXwDxEkadQD9c2rqfUwy-XU_2dMaNWVM6B5eCrwlLu_FO7aonww/exec?prefix=handleResponse";
    
    // 古いスクリプトタグが残っていれば削除
    const oldScript = document.getElementById('gas-jsonp');
    if (oldScript) oldScript.remove();

    // 10秒経っても応答がない場合のタイムアウト処理
    const timeoutId = setTimeout(() => {
        showError("GASからの応答がありませんでした。デプロイ設定が『全員』になっているかご確認ください。");
    }, 10000);

    window.gasTimeoutId = timeoutId;

    const script = document.createElement('script');
    script.id = 'gas-jsonp';
    script.src = jsonpUrl + "&_t=" + new Date().getTime(); // キャッシュ対策
    script.onerror = () => {
        clearTimeout(window.gasTimeoutId);
        showError("スクリプトの読み込みに失敗しました。");
    };
    
    document.body.appendChild(script);
}

// 2. JSONPコールバック関数
function handleResponse(response) {
    if (window.gasTimeoutId) clearTimeout(window.gasTimeoutId);

    if (!response) {
        showError("データを受け取れませんでした。");
        return;
    }

    if (response.status === "empty_sheet") {
        showError("スプレッドシートに見出し行が設定されていません。");
        return;
    }
    
    if (response.error) {
        showError("GASエラー: " + response.error);
        return;
    }

    // 新GASコードの response.data、または旧GASコードの配列構造の両方に対応
    const data = response.data || (Array.isArray(response) ? response : []);

    homeworkData = data;
    updateLastUpdatedTime();
    renderAlertZone(homeworkData);
    renderCards(homeworkData);
}

// エラーメッセージ表示
function showError(message) {
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
        mainContainer.innerHTML = `<div class="error">⚠️ ${message}</div>`;
    }
}

// 最終更新日時の更新
function updateLastUpdatedTime() {
    const updateElem = document.querySelector('.update-info');
    if (updateElem) {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        updateElem.textContent = `データ更新: ${month}/${date} ${hours}:${minutes}`;
    }
}

// 教科ごとのクラス名を判定するヘルパー
function getSubjectClass(subject) {
    switch (subject) {
        case '国語': return 'badge-japanese';
        case '数学': return 'badge-math';
        case '社会': return 'badge-social';
        case '理科': return 'badge-science';
        case '英語': return 'badge-english';
        case '技術・家庭': return 'badge-tech';
        case '音楽': return 'badge-music';
        case '美術': return 'badge-art';
        default: return 'badge-other';
    }
}

// 警告ゾーン（締め切り間近）の描画
function renderAlertZone(data) {
    const alertZone = document.querySelector('.alert-zone');
    if (!alertZone) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const urgentItems = data.filter(item => {
        if (!item.deadline) return false;
        const deadlineDate = new Date(item.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= targetAlertDays;
    });

    if (urgentItems.length === 0) {
        alertZone.innerHTML = '';
        return;
    }

    let html = `<h2>⚠️ 締め切り間近（${targetAlertDays}日以内）</h2>`;
    urgentItems.forEach(item => {
        const badgeClass = getSubjectClass(item.subject);
        html += `
            <div class="alert-card">
                <span class="alert-badge ${badgeClass}">${item.subject}</span>
                <span class="alert-range">${item.range || ''}</span>
                <span class="alert-days">⏳ 締め切り: ${item.deadline}</span>
            </div>
        `;
    });
    alertZone.innerHTML = html;
}

// メインの宿題カード描画
function renderCards(data) {
    const mainContainer = document.querySelector('main');
    if (!mainContainer) return;

    if (data.length === 0) {
        mainContainer.innerHTML = '<div class="loading">現在、出されている宿題はありません！🎉</div>';
        return;
    }

    let html = '';
    data.forEach(item => {
        const badgeClass = getSubjectClass(item.subject);
        html += `
            <div class="card" data-subject="${item.subject}">
                <div class="card-header">
                    <span class="subject-badge ${badgeClass}">${item.subject}</span>
                    <span class="deadline">⏳ 締め切り: ${item.deadline || '未定'}</span>
                </div>
                <div class="card-body">
                    <div class="range">${item.range || '範囲指定なし'}</div>
                    ${item.notes ? `<p class="notes">📝 ${item.notes}</p>` : ''}
                </div>
            </div>
        `;
    });
    mainContainer.innerHTML = html;
}

// ----------------------------------
// 🚀 画面読み込み時に自動実行
// ----------------------------------
document.addEventListener('DOMContentLoaded', () => {
    fetchHomeworkZone();
});
