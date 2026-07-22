// 3. メインの宿題カード描画
function renderCards(data) {
    const mainContainer = document.querySelector('main');
    if (!mainContainer) return;

    // ヘッダー行（見出し）を除外するフィルタリング
    // 「教科」という文字そのものや、全て空欄の行を除外します
    const validData = data.filter(item => {
        if (!item || !item.subject) return false;
        const subj = String(item.subject).trim();
        return subj !== '' && subj !== '教科' && subj !== 'undefined';
    });

    if (validData.length === 0) {
        mainContainer.innerHTML = '<div class="loading">現在、出されている宿題はありません！🎉</div>';
        return;
    }

    let html = '';
    validData.forEach(item => {
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

// 4. 警告ゾーン（締め切り間近）の描画
function renderAlertZone(data) {
    const alertZone = document.querySelector('.alert-zone');
    if (!alertZone) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ヘッダー行を除外しつつ緊急度を判定
    const urgentItems = data.filter(item => {
        if (!item || !item.subject || !item.deadline) return false;
        const subj = String(item.subject).trim();
        if (subj === '教科' || subj === '') return false;

        const deadlineDate = new Date(item.deadline);
        if (isNaN(deadlineDate.getTime())) return false; // 無効な日付（「締め切り」などの文字列）を弾く

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
