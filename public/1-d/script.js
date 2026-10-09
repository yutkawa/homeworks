const GAS_URL = "https://script.google.com/macros/s/AKfycbzURhb-wdSxzP4Ly3-3d5wg4xyTvRDs5oHB0uRRFmYt9rblNMWhI72nbAliuKiIaD3uCA/exec";

let homeworkData = [];
let currentSubject = 'すべて';

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

function parseDeadline(dateStr) {
    if (!dateStr) return null;
    
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    const parts = String(dateStr).split(/[\/\-\.]/);
    if (parts.length === 2) {
        const now = new Date();
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        d = new Date(now.getFullYear(), month, day);
        if (!isNaN(d.getTime())) return d;
    }

    return null;
}

function updateUI() {
    const updateTimeElem = document.querySelector('.update-info');
    if (updateTimeElem) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        updateTimeElem.textContent = `データ更新: ${month}/${date} ${hours}:${minutes}`;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeItems = [];
    const archivedItems = [];

    homeworkData.forEach(item => {
        const d = parseDeadline(item.deadline);
        
        if (!d) {
            activeItems.push(item);
            return;
        }

        d.setHours(0, 0, 0, 0);
        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        item.diffDays = diffDays;

        if (diffDays < 0) {
            archivedItems.push(item); // 過去の課題（アーカイブ）
        } else {
            activeItems.push(item);   // 進行中の課題
        }
    });

    renderCards(activeItems, archivedItems);
}

function renderCards(activeItems, archivedItems) {
    const container = document.getElementById('card-container') || document.querySelector('main');
    if (!container) return;

    const filteredActive = activeItems.filter(filterBySubject);
    const filteredArchived = archivedItems.filter(filterBySubject);

    let html = '';

    // 【進行中の課題】
    if (filteredActive.length > 0) {
        filteredActive.sort((a, b) => (a.diffDays ?? 999) - (b.diffDays ?? 999));
        filteredActive.forEach(item => {
            html += createCardHtml(item, false);
        });
    } else {
        html += '<div class="loading">現在、進行中の宿題はありません！🎉</div>';
    }

    // 【過去の課題 (アーカイブ)】
    if (filteredArchived.length > 0) {
        html += `
            <div style="width: 100%; margin-top: 40px; margin-bottom: 20px;">
                <h3 style="color: #7f8c8d; border-bottom: 2px dashed #bdc3c7; padding-bottom: 8px;">
                    📦 終了した課題 (アーカイブ)
                </h3>
            </div>
        `;
        filteredArchived.sort((a, b) => b.diffDays - a.diffDays);
        filteredArchived.forEach(item => {
            html += createCardHtml(item, true);
        });
    }

    container.innerHTML = html;
}

function createCardHtml(item, isArchived) {
    const deadlineText = formatDeadline(item.deadline);
    let tagHtml = '';

    if (isArchived) {
        tagHtml = `<span style="background: #a4b0be; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">期限切れ (${Math.abs(item.diffDays)}日前)</span>`;
    } else if (item.diffDays !== undefined) {
        if (item.diffDays === 0) {
            tagHtml = `<span style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">🔥 今日が締め切り！</span>`;
        } else {
            tagHtml = `<span style="background: #ffa502; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">⏳ あと ${item.diffDays} 日</span>`;
        }
    }

    return `
        <div class="card" style="${isArchived ? 'opacity: 0.6; background-color: #f8f9fa;' : ''}">
            <div class="card-header">
                <span class="subject-badge ${getSubjectClass(item.subject)}">${item.subject || 'その他'}</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    ${tagHtml}
                    <span class="deadline">⌛ 締め切り: ${deadlineText}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="range"><strong>${item.range || ''}</strong></div>
                ${item.notes ? `<p class="notes" style="margin-top: 8px; color: #555;">${item.notes}</p>` : ''}
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
    const d = parseDeadline(dateStr);
    if (!d) return dateStr || '未定';
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSubject = e.target.getAttribute('data-subject') || 'すべて';
            updateUI();
        });
    });

    fetchHomeworkJSONP();
});
