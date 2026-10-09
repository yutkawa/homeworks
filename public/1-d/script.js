// あなたの GAS Web App の完全な URL
const GAS_URL = "https://script.google.com/macros/s/AKfycbwU0bU-WXlFhDOeiAooUXe6QMGCCYyyzAcK1GxYQFzjUr7v7VLEMpL_NWC822hiV2z3og/exec";

let homeworkData = [];
let currentSubject = 'すべて';

async function fetchHomework() {
    const errorElem = document.getElementById('error-message');
    try {
        const response = await fetch(GAS_URL, {
            method: "GET",
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === "error") {
            throw new Error(result.error || "GAS側でエラーが発生しました");
        }

        homeworkData = result.data || [];
        updateUI();

    } catch (error) {
        console.error("Fetch error:", error);
        if (errorElem) {
            errorElem.textContent = `⚠️ データ通信に失敗しました。(${error.message})`;
        }
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
    const container = document.getElementById('card-container');
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
    // ボタン切り替えイベント
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSubject = e.target.getAttribute('data-subject') || 'すべて';
            renderCards();
        });
    });

    fetchHomework();
});
