// ==========================================
// 宿題ダッシュボード メインスクリプト 更新202607221744
// ==========================================

let homeworkData = [];
let currentSubject = 'すべて';
let currentDaysFilter = 'all'; // 'all' または 数字 (例: 14)

// 1. APIから宿題データを取得 (JSONP)
function fetchHomeworkZone() {
    const jsonpUrl = "https://script.google.com/macros/s/AKfycbzCoWsfnoNW1WH75I6GXwDxEkadQD9c2rqfUwy-XU_2dMaNWVM6B5eCrwlLu_FO7aonww/exec?prefix=handleResponse";
    
    // 古いスクリプトタグがあれば削除
    const oldScript = document.getElementById('gas-jsonp');
    if (oldScript) oldScript.remove();

    // 10秒タイムアウト設定
    const timeoutId = setTimeout(() => {
        showError("GASからの応答がありませんでした。デプロイ設定をご確認ください。");
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

// 2. JSONPコールバック関数（受信処理）
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

    // レスポンスデータの正規化（新・旧GASレスポンス両対応）
    const rawData = response.data || (Array.isArray(response) ? response : []);

    // 💡 見出し行や不正な行を徹底排除
    homeworkData = rawData.filter(item => {
        if (!item || !item.subject) return false;
        const subj = String(item.subject).trim();
        return subj !== '' && subj !== '教科' && subj !== 'undefined' && subj !== '-';
    });

    updateLastUpdatedTime();
    renderAlertZone(homeworkData);
    applyFiltersAndRender(); // フィルターを適用して描画
}

// 3. 教科クラス名変換ヘルパー
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

// 日付文字列を「YYYY/MM/DD」または「MM/DD」に整えるヘルパー関数
function formatDeadline(dateStr) {
    if (!dateStr) return '未定';
    
    // 日付オブジェクトを作成
    const d = new Date(dateStr);
    
    // 日付として正しく読み込めない文字列の場合はそのまま返す
    if (isNaN(d.getTime())) return dateStr;

    // 日本時間に合わせた月日を取得
    const month = d.getMonth() + 1;
    const date = d.getDate();

    return `${month}/${date}`; // 例: 8/22 （「2026/08/22」にしたい場合は `${d.getFullYear()}/${month}/${date}`）
}

// 4. フィルター適用＆描画関数
function applyFiltersAndRender() {
    const standardSubjects = ['国語', '数学', '社会', '理科', '英語', '技術・家庭', '音楽', '美術'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = homeworkData.filter(item => {
        // --- 教科フィルター ---
        if (currentSubject === 'その他') {
            if (standardSubjects.includes(item.subject)) return false;
        } else if (currentSubject !== 'すべて') {
            if (item.subject !== currentSubject) return false;
        }

        // --- 表示日数（絞り込み）フィルター ---
        if (currentDaysFilter !== 'all' && item.deadline) {
            const deadlineDate = new Date(item.deadline);
            if (!isNaN(deadlineDate.getTime())) {
                deadlineDate.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
                const maxDays = parseInt(currentDaysFilter, 10);
                // 過去の宿題、または指定日数を超える未来の宿題は非表示
                if (diffDays < 0 || diffDays > maxDays) return false;
            }
        }

        return true;
    });

    renderCards(filtered);
}

// 5. 宿題カードの描画
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
                    <span class="deadline">⏳ 締め切り: ${formatDeadline(item.deadline)}</span>
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

// 6. ⚠️ 警告ゾーン（締め切り間近：14日以内）の描画
function renderAlertZone(data) {
    const alertZone = document.querySelector('.alert-zone');
    if (!alertZone) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const urgentItems = data.filter(item => {
        if (!item.deadline) return false;
        const deadlineDate = new Date(item.deadline);
        if (isNaN(deadlineDate.getTime())) return false;

        deadlineDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 14;
    });

    if (urgentItems.length === 0) {
        alertZone.innerHTML = '';
        return;
    }

    let html = `<h2>⚠️ 締め切り間近（14日以内）</h2>`;
    urgentItems.forEach(item => {
        const badgeClass = getSubjectClass(item.subject);
        html += `
            <div class="alert-card">
                <span class="alert-badge ${badgeClass}">${item.subject}</span>
                <span class="alert-range">${item.range || ''}</span>
                <span class="alert-days">⏳ 締め切り: ${formatDeadline(item.deadline)}</span>
            </div>
        `;
    });
    alertZone.innerHTML = html;
}

// 7. エラー表示
function showError(message) {
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
        mainContainer.innerHTML = `<div class="error">⚠️ ${message}</div>`;
    }
}

// 8. 最終更新日時
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

// ==========================================
// 🚀 イベントリスナー登録 & 初期化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 教科ボタンのクリック処理
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            navButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // data-subject 属性から教科名を取得
            currentSubject = e.target.getAttribute('data-subject') || 'すべて';
            
            // ヘッダーの色も連動変更
            const header = document.querySelector('header');
            if (header) header.setAttribute('data-subject', currentSubject);

            applyFiltersAndRender();
        });
    });

    // 絞り込みセレクトボックスの変更処理
    const daysSelect = document.querySelector('.days-filter-container select');
    if (daysSelect) {
        daysSelect.addEventListener('change', (e) => {
            currentDaysFilter = e.target.value;
            applyFiltersAndRender();
        });
    }

    // 初回データ取得
    fetchHomeworkZone();
});
