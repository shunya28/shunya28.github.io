async function loadSongs() {
  const paths = await (await fetch('music-metadata/index.json')).json();
  const songs = await Promise.all(paths.map(p => fetch(p).then(r => r.json())));
  return songs;
}

function renderList(songs) {
  const $list = document.getElementById('list');
  $list.innerHTML = songs.map(s => `
    <article class="song">
      <h3>${s.title}</h3>
      <audio controls src="${s.audio_url}"></audio>
      <p>ID: ${s.id}</p>
      <p>Composed: ${s.release_date ?? '—'}</p>
      <p>Tags: ${(s.tags||[]).map(t=>`<span class="tag">${t}</span>`).join(' ') || '—'}</p>
    </article>
  `).join('');
}

function uniqueTags(songs) {
  return Array.from(new Set(songs.flatMap(s => s.tags || []))).sort();
}

function getSelectedTags() {
  return Array.from(document.querySelectorAll('#tag-filters input[type=checkbox]:checked'))
    .map(i => i.value);
}

function applyFilter(allSongs) {
  const selected = getSelectedTags();
  const andMode = document.getElementById('and-mode').checked;
  if (selected.length === 0) return allSongs;

  return allSongs.filter(s => {
    const stags = new Set(s.tags || []);
    if (andMode) {
      // すべて含む（AND）
      return selected.every(t => stags.has(t));
    } else {
      // いずれか含む（OR）
      return selected.some(t => stags.has(t));
    }
  });
}

function updateURL(selectedTags, andMode) {
  const params = new URLSearchParams();
  if (selectedTags.length) params.set('tags', selectedTags.join(','));
  if (andMode) params.set('mode', 'and');
  history.replaceState(null, '', `?${params.toString()}`);
}

function restoreFromURL() {
  const url = new URL(location.href);
  const tags = (url.searchParams.get('tags') || '').split(',').filter(Boolean);
  const andMode = url.searchParams.get('mode') === 'and';
  return { tags, andMode };
}

(async () => {
  const allSongs = await loadSongs();

  // タグUI生成
  const tags = uniqueTags(allSongs);
  const $filters = document.getElementById('tag-filters');
  $filters.innerHTML = tags.map(t => `
    <label class="chip"><input type="checkbox" value="${t}">${t}</label>
  `).join('');

  // URLから状態復元
  const { tags: initial, andMode } = restoreFromURL();
  initial.forEach(t => {
    const box = $filters.querySelector(`input[value="${t}"]`);
    if (box) box.checked = true;
  });
  document.getElementById('and-mode').checked = andMode;

  // 初回描画
  renderList(applyFilter(allSongs));

  // 変更時に反映
  $filters.addEventListener('change', () => {
    const filtered = applyFilter(allSongs);
    renderList(filtered);
    updateURL(getSelectedTags(), document.getElementById('and-mode').checked);
  });
  document.getElementById('and-mode').addEventListener('change', () => {
    const filtered = applyFilter(allSongs);
    renderList(filtered);
    updateURL(getSelectedTags(), document.getElementById('and-mode').checked);
  });
})();
