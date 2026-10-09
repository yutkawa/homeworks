const GAS_URL = "https://script.google.com/macros/s/AKfycbzURhb-wdSxzP4Ly3-3d5wg4xyTvRDs5oHB0uRRFmYt9rblNMWhI72nbAliuKiIaD3uCA/exec";

let homeworkData = [];
let currentSubject = 'すべて';

// GASからのJSONPデータを受け取るコールバック関数
window.handleResponse = function(response) {
    if (!response || response.status === "error") {
        showError("エラー: " + (response ? response.error : "データ取得不能"));
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
    const updateTimeElem = document.querySelector('.update-info');
    if (updateTimeElem) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        updateTimeElem.textContent = `データ更新: ${month}/${date} ${hours}:${minutes}`;
    }

    renderCards();
}

function renderCards() {
    const container = document.getElementById('card-container') || document.querySelector('main');
    if (!container) return;

    const filtered = homeworkData.filter(item => {
        if (currentSubject === 'すべて') return true;
        return item.subject === currentSubject;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading">現在、対象の宿題はありません！🎉</div>';
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="card">
            <div class="card-header">
                <span class="subject-badge">${item.subject || 'その他'}</span>
                <span class="deadline">⏳ 締め切り: ${formatDeadline(item.deadline)}</span>
            </div>
            <div class="card-body">
                <div class="range">${item.range || ''}</div>
                ${item.notes ? `<p class="notes">${item.notes}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function formatDeadline(dateStr) {
    if (!dateStr) return '未定';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSubject = e.target.getAttribute('data-subject') || 'すべて';
            renderCards();
        });
    });

    fetchHomeworkJSONP();
});
