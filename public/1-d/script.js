// 例: ドロップダウンやボタンのイベント処理部分
function renderTasks(filterSubject = 'all') {
  const container = document.getElementById('task-container');
  container.innerHTML = ''; // クリア

  // 定義されている基本教科のリスト
  const standardSubjects = ['国語', '数学', '英語', '理科', '社会'];

  // フィルタリング処理
  const filteredData = homeworkData.filter(item => {
    if (filterSubject === 'all') {
      return true; // 「すべて」の場合は全件表示
    } else if (filterSubject === 'other') {
      // 「その他」の場合は基本5教科に含まれないものを抽出
      return !standardSubjects.includes(item.subject);
    } else {
      // 個別教科（国語、数学など）の完全一致
      return item.subject === filterSubject;
    }
  });

  // カードの描画
  filteredData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'task-card';

    // 「すべて」または「その他」が選択されている時は教科ラベルを表示する
    const showSubjectTag = (filterSubject === 'all' || filterSubject === 'other');
    const subjectBadgeHTML = showSubjectTag 
      ? `<span class="subject-badge">${escapeHTML(item.subject)}</span>` 
      : '';

    card.innerHTML = `
      <div class="card-header">
        ${subjectBadgeHTML}
        <span class="deadline-badge">📅 ${escapeHTML(item.deadline || '未定')}</span>
      </div>
      <div class="card-body">
        <h3 class="task-range">${escapeHTML(item.range)}</h3>
        ${item.notes ? `<p class="task-notes">${escapeHTML(item.notes)}</p>` : ''}
      </div>
    `;

    container.appendChild(card);
  });
}

// エスクープ処理（XSS対策）
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
