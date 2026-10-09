const GAS_URL = "https://script.google.com/macros/s/AKfycbwU0bU-WXlFhDOeiAooUXe6QMGCCYyyzAcK1GxYQFzjUr7v7VLEMpL_NWC822hiV2z3og/exec";

let homeworkData = [];
let currentSubject = 'すべて';
let currentAlertDays = 14; // デフォルトは14日（2週間前）から警告表示

// JSONP受信用コールバック関数
window.handleResponse = function(response) {
    if (!response || response.status === "error") {
        showError("データ取得エラー: " + (response ? response.error : "応答なし"));
        return;
    }

    homeworkData = response.data || [];
    updateUI();
};

function fetchHomeworkJSONP() {
    const script = document.createElement('script');
    script.src = `${GAS_URL}?callback=handleResponse`;
    script.onerror = () => {
        showError("⚠️ データ通信に失敗しました。");
    };
    document.body.appendChild(script);
}

function showError(msg) {
    const errorElem = document.querySelector('.loading') || document.body;
    if (errorElem) {
        errorElem.textContent = msg;
    }
}

function updateUI() {
    // 1. 最終更新日時の表示
    const updateTimeElem = document.querySelector('.update-info');
    if (updateTimeElem) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        updateTimeElem.textContent = `データ更新: ${month}/${date} ${hours}:${minutes}`;
    }

    // 今日（時刻を 00:00:00 にリセット）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. データの自動振り分け（有効な課題 vs 期限切れアーカイブ）
    const activeItems = [];
    const archivedItems = [];

    homeworkData.forEach(item => {
        if (!item.deadline) {
            activeItems.push(item);
            return;
        }

        const deadlineDate = new Date(item.deadline);
        if (isNaN(deadlineDate.getTime())) {
            activeItems.push(item);
            return;
        }

        deadlineDate.setHours(0, 0, 0, 0);
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        item.diffDays = diffDays; // 残り日数を保持

        if (diffDays < 0) {
            archivedItems.push(item); // 過去の課題（アーカイブ）
        } else {
            activeItems.push(item);   // これからの課題
        }
    });

    // 3. 各ゾーンの描画
    renderAlertZone(activeItems);
    renderCards(activeItems, archivedItems);
}

// ⚠️ 締め切り間近（アラートゾーン）の描画
function renderAlertZone(activeItems) {
    const alertZone = document.querySelector('.alert-zone');
    if (!alertZone) return;

    // 指定した日数（currentAlertDays）以内の課題を抽出
    const urgentItems = activeItems.filter(item => {
        return item.diffDays !== undefined && item.diffDays >= 0 && item.diffDays <= currentAlertDays;
    });

    // 日数が近い順にソート
    urgentItems.sort((a, b) => a.diffDays - b.diffDays);

    if (urgentItems.length === 0) {
        alertZone.innerHTML = '';
        return;
    }

    let html = `<h2>⚠️ 締め切り間近（あと${currentAlertDays}日以内）</h2>`;
    urgentItems.forEach(item => {
        const badgeClass = getSubjectClass(item.subject);
        const deadlineText = formatDeadline(item.deadline);
        const daysText = item.diffDays === 0 ? "🔥 今日が締め切り！" : `⏳ あと ${item.diffDays} 日！`;

        html += `
            <div class="alert-card">
                <span class="alert-badge ${badgeClass}">${item.subject || 'その他'}</span>
                <span class="alert-range">${item.range || ''}</span>
                <span class="alert-days">${daysText} (${deadlineText})</span>
            </div>
        `;
    });
    alertZone.innerHTML = html;
}

// メインのカード一覧 ＆ アーカイブの描画
function renderCards(activeItems, archivedItems) {
    const mainContainer = document.getElementById('card-container') || document.querySelector('main');
    if (!mainContainer) return;

    // 教科による絞り込みフィルタ
    const filteredActive = activeItems.filter(item => filterBySubject(item));
    const filteredArchived = archivedItems.filter(item => filterBySubject(item));

    let html = '';

    // 【進行中の課題】
    if (filteredActive.length === 0) {
        html += '<div class="loading">現在、対象の進行中宿題はありません！🎉</div>';
    } else {
        // 締め切りが近い順に並び替え
        filteredActive.sort((a, b) => (a.diffDays ?? 999) - (b.diffDays ?? 999));

        filteredActive.forEach(item => {
            html += createCardHtml(item, false);
        });
    }

    // 【過去の課題（アーカイブ）】
    if (filteredArchived.length > 0) {
        html += `<h2 class="archive-header" style="margin-top: 40px; color: #7f8c8d; border-bottom: 2px solid #ccc; padding-bottom: 5px;">📦 完了・過去の課題 (アーカイブ)</h2>`;
        // 新しい（直近で切れた）順に並び替え
        filteredArchived.sort((a, b) => b.diffDays - a.diffDays);

        filteredArchived.forEach(item => {
            html += createCardHtml(item, true);
        });
    }

    mainContainer.innerHTML = html;
}

function createCardHtml(item, isArchived) {
    const badgeClass = getSubjectClass(item.subject);
    const deadlineText = formatDeadline(item.deadline);
    
    let daysBadge = '';
    if (isArchived) {
        daysBadge = `<span class="deadline-tag archived">期限切れ (${Math.abs(item.diffDays)}日前)</span>`;
    } else if (item.diffDays !== undefined) {
        if (item.diffDays === 0) {
            daysBadge = `<span class="deadline-tag today">🔥 今日が締め切り！</span>`;
        } else {
            daysBadge = `<span class="deadline-tag upcoming">⏳ あと ${item.diffDays} 日</span>`;
        }
    }

    return `
        <div class="card ${isArchived ? 'card-archived' : ''}">
            <div class="card-header">
                <span class="subject-badge ${badgeClass}">${item.subject || 'その他'}</span>
                <div class="deadline-info">
                    ${daysBadge}
                    <span class="deadline">（${deadlineText}）</span>
                </div>
            </div>
            <div class="card-body">
                <div class="range">${item.range || ''}</div>
                ${item.notes ? `<p class="notes">${item.notes}</p>` : ''}
            </div>
        </div>
    `;
}

function filterBySubject(item) {
    const standardSubjects = ['国語', '数学', '社会', '理科', '英語', '技術・家庭', '音楽', '美術'];
    if (currentSubject === 'その他') {
        return !standardSubjects.includes(item.subject);
    } else if (currentSubject !== 'すべて') {
        return item.subject === currentSubject;
    }
    return true;
}

function getSubjectClass(subject) {
    switch (subject) {
        case '国語': return 'badge-japanese';
        case '数学': return 'badge-math';
        case '社会': return 'badge-social';
        case '理科': return 'badge-science';
        case '英語': return 'badge-english';
        default: return 'badge-other';
    }
}

function formatDeadline(dateStr) {
    if (!dateStr) return '未定';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // 科目ボタンの切り替え
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSubject = e.target.getAttribute('data-subject') || 'すべて';
            updateUI();
        });
    });

    // 絞り込み対象（アラート表示期間）の切り替え
    const daysSelect = document.getElementById('daysSelect') || document.querySelector('select');
    if (daysSelect) {
        daysSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val.includes('1週間')) currentAlertDays = 7;
            else if (val.includes('2週間')) currentAlertDays = 14;
            else if (val.includes('1ヶ月')) currentAlertDays = 30;
            else currentAlertDays = 999;

            updateUI();
        });
    }

    fetchHomeworkJSONP();
});
