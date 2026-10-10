const GAS_URL = "https://script.google.com/macros/s/AKfycby18TPbxyra6qOSUWj00xeoOaBPgc1tSuPzm72FFDrsm-l5r-5p13shRa01ddboJ4nxEA/exec";

let homeworkData = [];
let currentSubject = 'すべて';
let searchQuery = '';

window.handleResponse = function(response) {
    if (!response || response.status === "error") {
        showError("データ取得エラー: " + (response ? response.error : "応答なし"));
        return;
    }

    homeworkData = response.data || [];
    // 各データに一意のIDを付与
    homeworkData.forEach((item, index) => {
        item.id = `${item.subject}_${item.deadline}_${index}`;
    });
    updateUI();
};

function fetchHomeworkJSONP() {
    const script = document.createElement('script');
    script.src = `${GAS_URL}?callback=handleResponse`;
    script.onerror = () => {
        showError("データ通信に失敗しました。");
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

// 完了済みIDの取得・保存 (localStorage)
function getCompletedIds() {
    try {
        return JSON.parse(localStorage.getItem('completed_homeworks') || '[]');
    } catch {
        return [];
    }
}

function toggleComplete(id) {
    let completed = getCompletedIds();
    if (completed.includes(id)) {
        completed = completed.filter(item => item !== id);
    } else {
        completed.push(id);
    }
    localStorage.setItem('completed_homeworks', JSON.stringify(completed));
    updateUI();
}

function updateUI() {
    const updateTimeElem = document.getElementById('last-updated') || document.querySelector('.update-info');
    if (updateTimeElem) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        if (updateTimeElem.id === 'last-updated') {
            updateTimeElem.textContent = `${month}/${date} ${hours}:${minutes}`;
        } else {
            updateTimeElem.textContent = `データ更新: ${month}/${date} ${hours}:${minutes}`;
        }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeItems = [];
    const archivedItems = [];
    const completedIds = getCompletedIds();

    homeworkData.forEach(item => {
        const d = parseDeadline(item.deadline);
        
        if (!d) {
            item.diffDays = 999;
            if (completedIds.includes(item.id)) {
                archivedItems.push(item);
            } else {
                activeItems.push(item);
            }
            return;
        }

        d.setHours(0, 0, 0, 0);
        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        item.diffDays = diffDays;

        // 期限切れ、または完了チェックされているものはアーカイブへ
        if (completedIds.includes(item.id) || diffDays < 0) {
            archivedItems.push(item); 
        } else {
            activeItems.push(item);   
        }
    });

    renderCards(activeItems, archivedItems);
}

function renderCards(activeItems, archivedItems) {
    const container = document.getElementById('homework-container') || document.querySelector('main');
    if (!container) return;

    const completedIds = getCompletedIds();

    // 科目フィルター ＆ キーワード検索の適用
    const filteredActive = activeItems.filter(item => filterBySubject(item) && filterBySearch(item));
    const filteredArchived = archivedItems.filter(item => filterBySubject(item) && filterBySearch(item));

    let html = '';

    // 【進行中の課題】
    if (filteredActive.length > 0) {
        filteredActive.sort((a, b) => (a.diffDays ?? 999) - (b.diffDays ?? 999));
        filteredActive.forEach(item => {
            html += createCardHtml(item, false, completedIds.includes(item.id));
        });
    } else {
        html += '<div class="loading">期限前の宿題はありません</div>';
    }

    // 【過去の課題 (アーカイブ) ＆ 完了済み】
    if (filteredArchived.length > 0) {
        html += `
            <div style="width: 100%; margin-top: 40px; margin-bottom: 20px;">
                <h3 style="color: #7f8c8d; border-bottom: 2px dashed #bdc3c7; padding-bottom: 8px;">
                    終了した課題 (アーカイブ・完了済)
                </h3>
            </div>
        `;
        filteredArchived.sort((a, b) => (b.diffDays ?? 0) - (a.diffDays ?? 0));
        filteredArchived.forEach(item => {
            html += createCardHtml(item, true, completedIds.includes(item.id));
        });
    }

    container.innerHTML = html;
}

function createCardHtml(item, isArchived, isCompleted) {
    const deadlineText = formatDeadline(item.deadline);
    let tagHtml = '';

    if (isCompleted) {
        tagHtml = `<span style="background: #2ed573; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">完了済み</span>`;
    } else if (isArchived) {
        tagHtml = `<span style="background: #a4b0be; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">期限切れ (${Math.abs(item.diffDays)}日前)</span>`;
    } else if (item.diffDays !== undefined) {
        if (item.diffDays === 0) {
            tagHtml = `<span style="background: #ff4757; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">今日が締め切り</span>`;
        } else {
            tagHtml = `<span style="background: #ffa502; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">あと ${item.diffDays} 日</span>`;
        }
    }

    return `
        <div class="card ${isArchived || isCompleted ? 'card-archived' : ''}" style="${isArchived || isCompleted ? 'opacity: 0.6;' : ''}">
            <div class="card-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" ${isCompleted ? 'checked' : ''} onclick="toggleComplete('${item.id}')" style="width: 18px; height: 18px; cursor: pointer;" title="完了にする">
                    <span class="subject-badge ${getSubjectClass(item.subject)}">${item.subject || 'その他'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    ${tagHtml}
                    <span class="deadline">締め切り: ${deadlineText}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="range"><strong>${item.range || ''}</strong></div>
                ${item.notes ? `<p class="notes" style="margin-top: 8px;">${item.notes}</p>` : ''}
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

function filterBySearch(item) {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const range = (item.range || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    const subject = (item.subject || '').toLowerCase();
    return range.includes(q) || notes.includes(q) || subject.includes(q);
}

function filterSubject(subject) {
    currentSubject = subject;
    document.querySelectorAll('.nav-btn').forEach(b => {
        if (b.getAttribute('data-subject') === subject) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    updateUI();
}

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

function formatDeadline(dateStr) {
    const d = parseDeadline(dateStr);
    if (!d) return dateStr || '未定';
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // ダークモードの復元
    if (localStorage.getItem('dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('dark-mode-btn');
        if (btn) btn.textContent = '☀️';
    }

    // ダークモードボタンのイベント
    const darkModeBtn = document.getElementById('dark-mode-btn');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('dark_mode', isDark);
            darkModeBtn.textContent = isDark ? '☀️' : '🌙';
        });
    }

    // キーワード検索のイベント
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            updateUI();
        });
    }

    fetchHomeworkJSONP();
});
