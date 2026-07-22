let homeworkData = [];
let targetAlertDays = 14; 

// 1. APIから宿題データを取得 (JSONP)
async function fetchHomeworkZone() {
    const jsonpUrl = "https://script.google.com/macros/s/AKfycbzCoWsfnoNW1WH75I6GXwDxEkadQD9c2rqfUwy-XU_2dMaNWVM6B5eCrwlLu_FO7aonww/exec?prefix=handleResponse";
    
    // タイムアウト監視（10秒経っても反応がなければ画面にエラーを出す）
    const timeoutId = setTimeout(() => {
        if (homeworkData.length === 0) {
            showError("GASからの応答がありません。GASのデプロイ設定（アクセスできるユーザー）が『全員』になっているか再度ご確認ください。");
        }
    }, 10000);

    const script = document.createElement('script');
    script.src = jsonpUrl;
    script.onerror = () => {
        clearTimeout(timeoutId);
        showError("スクリプトの読み込みに失敗しました（URLの形式に問題がある可能性があります）。");
    };
    document.body.appendChild(script);
}

// 2. JSONPコールバック関数 (GASからデータが届くとここが実行されます)
function handleResponse(response) {
    if (response && response.error) {
        showError("GASエラー: " + response.error);
        return;
    }
    
    homeworkData = response;
    updateLastUpdatedTime();
    renderAlertZone(homeworkData);
    renderCards(homeworkData);
}

function showError(message) {
    document.getElementById('homework-container').innerHTML = `
        <div class="error" style="color: #e11d48; padding: 2rem; background: #fff1f2; border-radius: 12px; border: 1px solid #ffe4e6; margin-top: 1rem; text-align: center;">
            <p style="font-weight: bold; margin: 0 0 0.5rem 0;">⚠️ 読み込みエラー</p>
            <span style="font-size: 0.85rem; font-weight: normal; line-height: 1.5; color: #475569;">${message}</span>
        </div>
    `;
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    document.getElementById('last-updated').textContent = timeString;
}

// 3. ⚠️ 警告ゾーンの描画
function renderAlertZone(data) {
    const alertContainer = document.getElementById('alert-container');
    const alertTitle = document.getElementById('alert-title');
    alertContainer.innerHTML = '';

    let labelText = `${targetAlertDays}日以内`;
    if (targetAlertDays === 7) labelText = "1週間以内";
    if (targetAlertDays === 14) labelText = "2週間以内";
    if (targetAlertDays === 21) labelText = "3週間以内";
    if (targetAlertDays === 30) labelText = "1ヶ月以内";
    
    alertTitle.textContent = `🔥 もうすぐしめきり！（${labelText}）`;

    const now = new Date();
    const alerts = [];

    data.forEach(item => {
        if (!item.deadline) return;
        const deadlineDate = new Date(item.deadline);
        const timeDiff = deadlineDate - now;
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff <= targetAlertDays) {
            alerts.push({ ...item, daysDiff });
        }
    });

    if (alerts.length === 0) {
        document.getElementById('alert-zone').style.display = 'none';
        return;
    }

    document.getElementById('alert-zone').style.display = 'block';
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

function changeAlertDays(days) {
    targetAlertDays = parseInt(days, 10);
    renderAlertZone(homeworkData); 
}

// 4. メイン宿題カードの描画
function renderCards(data) {
    const container = document.getElementById('homework-container');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="loading" style="color: #94a3b8; padding: 4rem 1rem;">出されている宿題はありません！🎉</div>';
        return;
    }

    const now = new Date();

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-subject-card', item.subject);

        let isUrgent = false;
        if (item.deadline) {
            const deadlineDate = new Date(item.deadline);
            const daysDiff = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
            if (daysDiff >= 0 && daysDiff <= 3) {
                isUrgent = true;
            }
        }

        const formattedDate = item.deadline ? item.deadline.replace(/^\d{4}-/, '').replace('-', '/') : '未定';

        card.innerHTML = `
            <div class="card-header" data-urgent="${isUrgent}">
                <span class="subject-badge" data-subject="${item.subject}">${item.subject}</span>
                <span class="deadline">⌛ しめきり: ${formattedDate}</span>
            </div>
            <div class="card-body">
                <p class="range">${item.range}</p>
                ${item.notes ? `<p class="notes">${item.notes}</p>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// 5. 📂 教科別フィルター機能
function filterSubject(subject) {
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-subject') === subject) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const header = document.getElementById('page-header');
    if (subject === 'すべて') {
        header.removeAttribute('data-subject');
    } else {
        header.setAttribute('data-subject', subject);
    }

    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (subject === 'すべて' || card.getAttribute('data-subject-card') === subject) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

window.onload = fetchHomeworkZone;
