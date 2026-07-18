let homeworkData = [];

// APIからデータを取得
async function fetchHomeworkZone() {
    const jsonpUrl = "https://script.google.com/macros/s/AKfycbygGsnA6-vE9R-v2Vn6_0mB3H2WpM9OQ4_3u_q5x8g/exec?prefix=handleResponse";
    
    const script = document.createElement('script');
    script.src = jsonpUrl;
    document.body.appendChild(script);
}

// JSONPのコールバック関数
function handleResponse(response) {
    if (response && response.error) {
        showError(response.error);
        return;
    }
    homeworkData = response;
    updateLastUpdatedTime();
    renderAlertZone(homeworkData);
    renderCards(homeworkData);
}

function showError(message) {
    document.getElementById('homework-container').innerHTML = `<div class="error">データがよみこめませんでした。: ${message}</div>`;
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    document.getElementById('last-updated').textContent = timeString;
}

// ⚠️ 2週間前警告ゾーンの描画
function renderAlertZone(data) {
    const alertContainer = document.getElementById('alert-container');
    alertContainer.innerHTML = '';

    const now = new Date();
    const alerts = [];

    data.forEach(item => {
        if (!item.deadline) return;
        const deadlineDate = new Date(item.deadline);
        const timeDiff = deadlineDate - now;
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff <= 14) {
            alerts.push({ ...item, daysDiff });
        }
    });

    if (alerts.length === 0) {
        document.getElementById('alert-zone').style.display = 'none';
        return;
    }

    document.getElementById('alert-zone').style.display = 'block';
    
    // 締切が近い順に並び替え
    alerts.sort((a, b) => a.daysDiff - b.daysDiff);

    alerts.forEach(item => {
        const card = document.createElement('div');
        card.className = 'alert-card';
        card.innerHTML = `
            <span class="alert-badge" data-subject="${item.subject}">${item.subject}</span>
            <div class="alert-range">${item.range}</div>
            <span class="alert-days">あと ${item.daysDiff} 日</span>
        `;
        alertContainer.appendChild(card);
    });
}

// 宿題カードの描画
function renderCards(data) {
    const container = document.getElementById('homework-container');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<div class="loading">だされている宿題はありません！</div>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-subject-card', item.subject);

        const formattedDate = item.deadline ? item.deadline.replace(/^\d{4}-/, '').replace('-', '/') : '未定';

        card.innerHTML = `
            <div class="card-header">
                <span class="subject-badge" data-subject="${item.subject}">${item.subject}</span>
                <span class="deadline">しめきり: ${formattedDate}</span>
            </div>
            <div class="card-body">
                <p class="range">${item.range}</p>
                ${item.notes ? `<p class="notes">${item.notes}</p>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// 📂 教科別フィルター機能
function filterSubject(subject) {
    // ボタンのactiveクラスの切り替え
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-subject') === subject) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // ✨ ヘッダーの色を切り替え（「すべて」の時は属性を消去して初期カラーにフワッと戻す）
    const header = document.querySelector('header');
    if (subject === 'すべて') {
        header.removeAttribute('data-subject');
    } else {
        header.setAttribute('data-subject', subject);
    }

    // 宿題カードの表示・非表示
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (subject === 'すべて' || card.getAttribute('data-subject-card') === subject) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// 画面読み込み時に実行
window.onload = fetchHomeworkZone;
