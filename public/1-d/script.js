// ボタンとして一覧にある主要な教科のリスト
const definedSubjects = [
  '国語', '数学', '社会', '理科', '英語', 
  '技術・家庭', '音楽', '美術'
];

let currentSubjectFilter = 'すべて';

// 教科切り替え関数
function filterSubject(subject) {
  currentSubjectFilter = subject;

  // アクティブボタンの見た目を切り替え
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-subject') === subject);
  });

  // 再描画
  renderHomeworkList();
}

// カード描画関数（メイン処理）
function renderHomeworkCards(dataList, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // フィルタリング処理
  const filteredData = dataList.filter(item => {
    if (currentSubjectFilter === 'すべて') {
      return true;
    } else if (currentSubjectFilter === 'その他') {
      // 一覧ボタンにない教科（保体、総合、道徳など）をまとめ対象にする
      return !definedSubjects.includes(item.subject);
    } else {
      return item.subject === currentSubjectFilter;
    }
  });

  if (filteredData.length === 0) {
    container.innerHTML = '<p class="no-data">該当する宿題はありません🎉</p>';
    return;
  }

  filteredData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'homework-card';

    // 「すべて」または「その他」が選ばれている場合は教科タグを表示する
    const showSubjectTag = (currentSubjectFilter === 'すべて' || currentSubjectFilter === 'その他');
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

// XSS対策のエスケープ処理
function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
