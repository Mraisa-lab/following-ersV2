const state = {
  followers: [],
  following: [],
  pendingRequests: [],
  activeTab: 'notFollowBack',
  searchTerm: '',
  sort: 'az',
  limit: 'all',
  loading: false,
  lastSaved: null,
};

const history = {
  undo: [],
  redo: [],
};

const refs = {
  dropZone: document.getElementById('dropZone'),
  fileFollowing: document.getElementById('fileFollowing'),
  fileFollowers: document.getElementById('fileFollowers'),
  filePendingRequests: document.getElementById('filePendingRequests'),
  progressFill: document.getElementById('progressFill'),
  progressLabel: document.getElementById('progressLabel'),
  followersCount: document.getElementById('followersCount'),
  followingCount: document.getElementById('followingCount'),
  notFollowBackCount: document.getElementById('notFollowBackCount'),
  dontFollowCount: document.getElementById('dontFollowCount'),
  pendingRequestsCount: document.getElementById('pendingRequestsCount'),
  pendingStatCard: document.getElementById('pendingStatCard'),
  pendingTab: document.getElementById('pendingTab'),
  tabContent: document.getElementById('tabContent'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  limitSelect: document.getElementById('limitSelect'),
  exportCsvButton: document.getElementById('exportCsvButton'),
  exportTxtButton: document.getElementById('exportTxtButton'),
  clearButton: document.getElementById('clearButton'),
  downloadLastButton: document.getElementById('downloadLastButton'),
  installButton: document.getElementById('installButton'),
  undoButton: document.getElementById('undoButton'),
  redoButton: document.getElementById('redoButton'),
  themeToggle: document.getElementById('themeToggle'),
  errorMessage: document.getElementById('errorMessage'),
};

const LOCAL_STORAGE_KEY = 'ig-backcheck-last-data';
const THEME_STORAGE_KEY = 'ig-backcheck-theme';

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme === 'light' ? 'light' : savedTheme === 'auto' ? (prefersDark ? 'dark' : 'light') : 'dark';
  
  applyTheme(theme);
  
  if (refs.themeToggle) {
    refs.themeToggle.addEventListener('click', toggleTheme);
    updateThemeToggleUI();
  }
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light-mode');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    updateThemeColor('#f5f8ff');
  } else {
    document.documentElement.classList.remove('light-mode');
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    updateThemeColor('#09101a');
  }
  updateThemeToggleUI();
}

function updateThemeColor(color) {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', color);
  }
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light-mode');
  applyTheme(isLight ? 'dark' : 'light');
}

function updateThemeToggleUI() {
  if (!refs.themeToggle) return;
  const isLight = document.documentElement.classList.contains('light-mode');
  refs.themeToggle.innerHTML = `<span>${isLight ? '🌙' : '☀️'}</span>`;
  refs.themeToggle.title = isLight ? 'Beralih ke Dark Mode' : 'Beralih ke Light Mode';
}

function initialize() {
  initializeTheme();
  bindEvents();
  loadSavedData();
  render();
}

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (refs.installButton) refs.installButton.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  if (refs.installButton) refs.installButton.classList.add('hidden');
  showTemporaryMessage('Aplikasi berhasil diinstal.');
});

function handleInstallClick() {
  // iOS Safari doesn't support beforeinstallprompt; show instructions instead
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent);
  if (isIOS) {
    showTemporaryMessage('Di iOS: tekan tombol Bagikan → "Add to Home Screen" untuk menambahkan aplikasi.');
    return;
  }

  if (!deferredPrompt) {
    showTemporaryMessage('Install tidak tersedia. Pastikan mengakses lewat HTTP/HTTPS.');
    return;
  }

  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      showTemporaryMessage('Pengguna menerima instalasi.');
    } else {
      showTemporaryMessage('Pengguna menolak instalasi.');
    }
    deferredPrompt = null;
    if (refs.installButton) refs.installButton.classList.add('hidden');
  });
}

function bindEvents() {
  refs.dropZone.addEventListener('click', () => refs.fileFollowing.click());
  refs.dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    refs.dropZone.classList.add('dragover');
  });
  refs.dropZone.addEventListener('dragleave', () => refs.dropZone.classList.remove('dragover'));
  refs.dropZone.addEventListener('drop', handleDrop);

  refs.fileFollowing.addEventListener('change', handleFollowingFiles);
  refs.fileFollowers.addEventListener('change', handleFollowerFiles);
  if (refs.filePendingRequests) {
    refs.filePendingRequests.addEventListener('change', handlePendingRequestFiles);
  }
  refs.searchInput.addEventListener('input', () => {
    state.searchTerm = refs.searchInput.value.trim().toLowerCase();
    render();
  });
  refs.sortSelect.addEventListener('change', () => {
    state.sort = refs.sortSelect.value;
    render();
  });
  refs.limitSelect.addEventListener('change', () => {
    state.limit = refs.limitSelect.value;
    render();
  });
  refs.exportCsvButton.addEventListener('click', exportCurrentView.bind(null, 'csv'));
  refs.exportTxtButton.addEventListener('click', exportCurrentView.bind(null, 'txt'));
  refs.clearButton.addEventListener('click', clearData);
  refs.downloadLastButton.addEventListener('click', loadSavedData);
  if (refs.installButton) refs.installButton.addEventListener('click', handleInstallClick);
  refs.undoButton.addEventListener('click', undo);
  refs.redoButton.addEventListener('click', redo);

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

function handleDrop(event) {
  event.preventDefault();
  refs.dropZone.classList.remove('dragover');
  const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type === 'application/json' || file.name.toLowerCase().endsWith('.json'));
  if (!files.length) {
    showError('Hanya file JSON yang didukung. Silakan unggah file Instagram export JSON.');
    return;
  }
  processFiles(files);
}

function handleFollowingFiles(event) {
  const file = event.target.files[0];
  if (!file) return;
  processFiles([file]);
  event.target.value = '';
}

function handleFollowerFiles(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.name.toLowerCase().endsWith('.json'));
  if (!files.length) {
    showError('Pilih file JSON followers yang valid.');
    return;
  }
  processFiles(files);
  event.target.value = '';
}

function handlePendingRequestFiles(event) {
  const file = event.target.files[0];
  if (!file) return;
  processPendingRequestFile(file);
  event.target.value = '';
}

function isPendingRequestFile(filename, result) {
  const nameLower = filename.toLowerCase();
  return nameLower.includes('pending') || nameLower.includes('request');
}

async function processFiles(files) {
  setError('');
  setLoading(true);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  let loadedBytes = 0;
  const allFollowers = new Set(state.followers.map((item) => item.username.toLowerCase()));
  const allFollowing = new Set(state.following.map((item) => item.username.toLowerCase()));

  for (const file of files) {
    try {
      const result = await readJsonFile(file, (progress) => {
        loadedBytes += progress;
        updateProgress(loadedBytes / totalBytes);
      });
      const parsed = parseInstagramJson(result, file.name);
      if (isFollowingFile(file.name, result)) {
        parsed.forEach((item) => allFollowing.add(item.username.toLowerCase()));
      } else {
        parsed.forEach((item) => allFollowers.add(item.username.toLowerCase()));
      }
    } catch (error) {
      showError(error.message);
      setLoading(false);
      return;
    }
  }

  state.followers = Array.from(allFollowers).map((username) => ({ username }));
  state.following = Array.from(allFollowing).map((username) => ({ username }));
  history.undo = [];
  history.redo = [];
  updateHistoryButtons();
  saveLastData();
  setLoading(false);
  render();
  updatePendingVisibility();
}

async function processPendingRequestFile(file) {
  setError('');
  setLoading(true);
  try {
    const result = await readJsonFile(file);
    const parsed = parsePendingRequestsJson(result, file.name);
    state.pendingRequests = parsed.map((item) => ({ username: item.username }));
    updatePendingVisibility();
    saveLastData();
    render();
    showTemporaryMessage(`Berhasil memuat ${state.pendingRequests.length} pending request(s).`);
  } catch (error) {
    showError(error.message);
  }
  setLoading(false);
}

function parsePendingRequestsJson(data, filename) {
  if (!data) throw new Error(`File ${filename} kosong atau tidak valid.`);

  // Try different possible structures for pending follow requests
  let rawEntries = [];
  
  if (Array.isArray(data)) {
    rawEntries = data;
  } else if (data?.outgoing_requests && Array.isArray(data.outgoing_requests)) {
    rawEntries = data.outgoing_requests;
  } else if (data?.relationships_outgoing_requests && Array.isArray(data.relationships_outgoing_requests)) {
    rawEntries = data.relationships_outgoing_requests;
  } else if (data?.pending_follow_requests && Array.isArray(data.pending_follow_requests)) {
    rawEntries = data.pending_follow_requests;
  } else if (data?.profiles && Array.isArray(data.profiles)) {
    rawEntries = data.profiles;
  } else {
    throw new Error(`Tidak dapat menemukan daftar pending requests dalam file ${filename}. Pastikan file berisi daftar akun yang di-request.`);
  }

  // Debug: Log raw data count
  console.log(`[Pending Requests] Raw data count: ${rawEntries.length} entries`);

  // Robust username extraction function
  const getUsername = (item) => {
    // Handle simple string entries
    if (typeof item === 'string') {
      return item.trim() || null;
    }
    
    // Handle object entries with label_values
    const labels = item?.label_values ?? [];
    
    const found = labels.find(
      (x) =>
        x?.label === "Nama pengguna" ||
        x?.label === "Username" ||
        x?.label === "User name"
    );
    
    return found?.value ?? null;
  };

  // Extract usernames and filter
  const rawUsernames = rawEntries.map(getUsername);
  
  // Filter: remove null/empty usernames, ensure clean array
  const result = rawUsernames
    .filter((u) => typeof u === "string" && u.trim().length > 0)
    .map((u) => ({ username: u.trim().toLowerCase() }));

  // Debug: Log final results
  console.log(`[Pending Requests] Parsed usernames: ${result.length}`);
  if (result.length > 0) {
    const sampleUsernames = result.slice(0, 5).map(p => p.username);
    console.log(`[Pending Requests] First 5 usernames:`, sampleUsernames);
  }

  if (!result.length) {
    throw new Error(`Tidak ada username valid yang ditemukan dalam file ${filename}. Periksa format file.`);
  }

  return result;
}

function updatePendingVisibility() {
  const hasPending = state.pendingRequests.length > 0;
  if (refs.pendingStatCard) {
    refs.pendingStatCard.style.display = hasPending ? '' : 'none';
  }
  if (refs.pendingTab) {
    refs.pendingTab.style.display = hasPending ? '' : 'none';
  }
}

function readJsonFile(file, progressCallback) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        progressCallback(event.loaded);
      }
    };
    reader.onload = () => {
      try {
        const result = JSON.parse(reader.result);
        resolve(result);
      } catch {
        reject(new Error(`Format JSON tidak valid di file ${file.name}.`));
      }
    };
    reader.onerror = () => reject(new Error(`Gagal membaca file ${file.name}.`));
    reader.readAsText(file);
  });
}

function isFollowingFile(filename, result) {
  const nameLower = filename.toLowerCase();
  if (nameLower.includes('following')) return true;
  if (nameLower.includes('followers')) return false;
  if (nameLower.includes('pending')) return false;
  if (Array.isArray(result) && result.length && typeof result[0] === 'object') {
    const first = result[0];
    if ('following' in first || 'is_private' in first || 'string_list_data' in first) {
      return nameLower.includes('following') || !nameLower.includes('followers');
    }
  }
  return false;
}

function parseInstagramJson(data, filename) {
  if (!data) throw new Error(`File ${filename} kosong atau tidak valid.`);

  const entries = Array.isArray(data) ? data : data?.relationships_following || data?.relationships_followers || data?.profiles || data?.outgoing_requests || [];
  if (!Array.isArray(entries)) {
    throw new Error(`Tidak dapat menemukan daftar akun dalam file ${filename}. Pastikan ini adalah ekspor Instagram yang benar.`);
  }

  const parsed = entries
    .map((entry) => {
      if (typeof entry === 'string') {
        return { username: entry.trim() };
      }
      const username = extractUsername(entry);
      return username ? { username } : null;
    })
    .filter(Boolean)
    .map((item) => ({ username: item.username.trim().toLowerCase() }))
    .filter((item) => item.username);

  if (!parsed.length) {
    throw new Error(`Tidak ada username valid yang ditemukan dalam file ${filename}. Periksa format file.`);
  }

  return parsed;
}

function extractUsername(item) {
  if (!item) return null;
  const candidates = [];
  if (typeof item.username === 'string') candidates.push(item.username);
  if (typeof item.name === 'string') candidates.push(item.name);
  if (typeof item.title === 'string') candidates.push(item.title);
  if (typeof item.value === 'string') candidates.push(item.value);
  if (typeof item.href === 'string') candidates.push(item.href);

  if (Array.isArray(item.string_list_data)) {
    item.string_list_data.forEach((entry) => {
      if (!entry) return;
      if (typeof entry.value === 'string') candidates.push(entry.value);
      if (typeof entry.href === 'string') candidates.push(entry.href);
      if (typeof entry.title === 'string') candidates.push(entry.title);
    });
  }

  if (Array.isArray(item.data)) {
    item.data.forEach((entry) => {
      if (!entry) return;
      if (typeof entry.value === 'string') candidates.push(entry.value);
      if (typeof entry.href === 'string') candidates.push(entry.href);
      if (typeof entry.title === 'string') candidates.push(entry.title);
    });
  }

  const found = candidates.find((value) => typeof value === 'string' && value.trim());
  if (!found) return null;

  const trimmed = found.trim();
  const usernameFromHref = parseUsernameFromHref(trimmed);
  if (usernameFromHref) return usernameFromHref;

  return trimmed.replace(/^@/, '').trim();
}

function parseUsernameFromHref(value) {
  const hrefMatch = value.match(/instagram\.com\/(?:_u\/)?([^/?#]+)/i);
  if (hrefMatch && hrefMatch[1]) {
    return hrefMatch[1].replace(/^@/, '').trim();
  }
  return null;
}

function updateProgress(ratio) {
  const percent = Math.min(100, Math.round((ratio || 0) * 100));
  refs.progressFill.style.width = `${percent}%`;
  refs.progressLabel.textContent = percent >= 100 ? 'Menyelesaikan pembacaan...' : `Membaca file... ${percent}%`;
}

function setLoading(active) {
  state.loading = active;
  if (!active) {
    refs.progressFill.style.width = '0';
    refs.progressLabel.textContent = 'Menunggu file...';
  }
}

function render() {
  const followersSet = new Set(state.followers.map((item) => item.username));
  const followingSet = new Set(state.following.map((item) => item.username));
  const notFollowBack = Array.from(followingSet).filter((name) => !followersSet.has(name));
  const dontFollowBack = Array.from(followersSet).filter((name) => !followingSet.has(name));
  const mutual = Array.from(followingSet).filter((name) => followersSet.has(name));
  const pendingRequestsSet = new Set(state.pendingRequests.map((item) => item.username.toLowerCase()));
  // Pending: users we've requested but who haven't accepted yet (not in followers)
  const pending = Array.from(pendingRequestsSet).filter((name) => !followersSet.has(name));

  refs.followersCount.textContent = state.followers.length.toLocaleString('id-ID');
  refs.followingCount.textContent = state.following.length.toLocaleString('id-ID');
  refs.notFollowBackCount.textContent = notFollowBack.length.toLocaleString('id-ID');
  refs.dontFollowCount.textContent = dontFollowBack.length.toLocaleString('id-ID');
  if (refs.pendingRequestsCount) {
    refs.pendingRequestsCount.textContent = pending.length.toLocaleString('id-ID');
  }

  const tabData = {
    notFollowBack,
    dontFollowBack,
    mutual,
    pending,
  }[state.activeTab];

  const filtered = tabData
    .filter((username) => username.includes(state.searchTerm))
    .sort((a, b) => {
      if (state.sort === 'za') return b.localeCompare(a);
      return a.localeCompare(b);
    });

  const limited = state.limit === 'all' ? filtered : filtered.slice(0, Number(state.limit));
  const isPendingTab = state.activeTab === 'pending';
  refs.tabContent.innerHTML = limited.length ? limited.map((username) => renderListItem(username, isPendingTab)).join('') : '<div class="empty-state">Tidak ada hasil. Pastikan file terunggah dan pencarian tidak terlalu spesifik.</div>';
  updateTabButtons();
}

function renderListItem(username, showRequestedStatus = false) {
  const initials = username.slice(0, 2).toUpperCase();
  const statusBadge = showRequestedStatus ? '<span class="status-badge">Requested</span>' : '';
  return `
    <div class="list-item">
      <div class="avatar" aria-hidden="true">${initials}</div>
      <div class="list-content">
        <strong><a href="https://www.instagram.com/${encodeURIComponent(username)}/" target="_blank" rel="noopener noreferrer">${username}</a></strong>
        ${statusBadge}
      </div>
      <div class="item-actions">
        <button class="button button-instagram" data-action="open-instagram" data-username="${username}" title="Buka di Instagram App">📱 Instagram</button>
        <button class="button button-secondary" data-action="copy" data-username="${username}">Copy</button>
        <button class="button button-ghost" data-action="delete" data-username="${username}">Delete</button>
      </div>
    </div>
  `;
}

function updateTabButtons() {
  document.querySelectorAll('.tab').forEach((tab) => {
    const active = tab.dataset.tab === state.activeTab;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  Array.from(document.querySelectorAll('[data-action="copy"]')).forEach((button) => {
    button.addEventListener('click', () => copyUsername(button.dataset.username));
  });

  Array.from(document.querySelectorAll('[data-action="delete"]')).forEach((button) => {
    button.addEventListener('click', () => deleteUsername(button.dataset.username));
  });

  Array.from(document.querySelectorAll('[data-action="open-instagram"]')).forEach((button) => {
    button.addEventListener('click', () => openInstagram(button.dataset.username));
  });
}

function switchTab(tabName) {
  state.activeTab = tabName;
  render();
}

function copyUsername(username) {
  navigator.clipboard.writeText(username).then(() => {
    showTemporaryMessage(`Username ${username} disalin ke clipboard.`);
  }).catch(() => {
    showError('Gagal menyalin ke clipboard.');
  });
}

function openInstagram(username) {
  // Try to open Instagram app first using custom protocol
  const appUrl = `instagram://user?username=${encodeURIComponent(username)}`;
  const webUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  
  // Open with a small delay to check if app opened
  const timeout = setTimeout(() => {
    // Fallback to web if app doesn't open
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    showTemporaryMessage(`Membuka profil ${username} di web browser.`);
  }, 500);

  // Try to open app
  window.location = appUrl;
  
  // Clear timeout if app actually opened (user leaves the page)
  window.addEventListener('pagehide', () => clearTimeout(timeout), { once: true });
}

function undo() {
  if (history.undo.length === 0) return;

  const previousState = history.undo.pop();
  const currentState = {
    followers: state.followers.map((item) => ({ ...item })),
    following: state.following.map((item) => ({ ...item })),
  };

  state.followers = previousState.followers;
  state.following = previousState.following;
  history.redo.push(currentState);

  updateHistoryButtons();
  saveLastData();
  showTemporaryMessage(`Dibatalkan: ${previousState.username} dikembalikan.`);
  render();
}

function redo() {
  if (history.redo.length === 0) return;

  const nextState = history.redo.pop();
  const currentState = {
    followers: state.followers.map((item) => ({ ...item })),
    following: state.following.map((item) => ({ ...item })),
  };

  state.followers = nextState.followers;
  state.following = nextState.following;
  history.undo.push(currentState);

  updateHistoryButtons();
  saveLastData();
  showTemporaryMessage(`Diulang: penghapusan dijalankan kembali.`);
  render();
}

function updateHistoryButtons() {
  refs.undoButton.disabled = history.undo.length === 0;
  refs.redoButton.disabled = history.redo.length === 0;
}

function deleteUsername(username) {
  const normalized = username.toLowerCase();
  const previousState = {
    followers: state.followers.map((item) => ({ ...item })),
    following: state.following.map((item) => ({ ...item })),
    username,
    tab: state.activeTab,
  };

  if (state.activeTab === 'notFollowBack') {
    state.following = state.following.filter((item) => item.username.toLowerCase() !== normalized);
  } else if (state.activeTab === 'dontFollowBack') {
    state.followers = state.followers.filter((item) => item.username.toLowerCase() !== normalized);
  } else if (state.activeTab === 'pending') {
    state.pendingRequests = state.pendingRequests.filter((item) => item.username.toLowerCase() !== normalized);
    updatePendingVisibility();
  } else {
    state.followers = state.followers.filter((item) => item.username.toLowerCase() !== normalized);
    state.following = state.following.filter((item) => item.username.toLowerCase() !== normalized);
  }

  history.undo.push(previousState);
  history.redo = [];
  updateHistoryButtons();
  saveLastData();
  showTemporaryMessage(`Username ${username} dihapus dari daftar.`);
  render();
}

function exportCurrentView(format) {
  const followersSet = new Set(state.followers.map((item) => item.username));
  const followingSet = new Set(state.following.map((item) => item.username));
  const pendingRequestsSet = new Set(state.pendingRequests.map((item) => item.username.toLowerCase()));
  let list = [];

  if (state.activeTab === 'notFollowBack') {
    list = Array.from(followingSet).filter((name) => !followersSet.has(name));
  } else if (state.activeTab === 'dontFollowBack') {
    list = Array.from(followersSet).filter((name) => !followingSet.has(name));
  } else if (state.activeTab === 'pending') {
    list = Array.from(pendingRequestsSet).filter((name) => !followersSet.has(name));
  } else {
    list = Array.from(followingSet).filter((name) => followersSet.has(name));
  }

  list = list.filter((username) => username.includes(state.searchTerm));
  if (state.sort === 'za') list.sort((a, b) => b.localeCompare(a)); else list.sort((a, b) => a.localeCompare(b));
  if (state.limit !== 'all') list = list.slice(0, Number(state.limit));

  if (!list.length) {
    showError('Tidak ada data untuk diekspor pada tab saat ini.');
    return;
  }

  if (format === 'csv') {
    const csvContent = ['username,profile_url', ...list.map((username) => `${escapeCsv(username)},https://www.instagram.com/${encodeURIComponent(username)}/`)].join('\n');
    downloadFile(csvContent, 'instagram-backcheck.csv', 'text/csv');
  } else {
    const txtContent = list.map((username) => `https://www.instagram.com/${username}/`).join('\n');
    downloadFile(txtContent, 'instagram-backcheck.txt', 'text/plain');
  }
}

function escapeCsv(value) {
  const safe = `${value}`.replace(/"/g, '""');
  return `"${safe}"`;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function showError(message) {
  refs.errorMessage.textContent = message;
  refs.errorMessage.classList.toggle('hidden', !message);
}

function setError(message) {
  if (!message) {
    refs.errorMessage.classList.add('hidden');
    refs.errorMessage.textContent = '';
    return;
  }
  showError(message);
}

function showTemporaryMessage(message) {
  const current = refs.errorMessage.textContent;
  showError(message);
  setTimeout(() => {
    if (refs.errorMessage.textContent === message) {
      setError(current || '');
    }
  }, 2200);
}

function saveLastData() {
  const payload = {
    followers: state.followers,
    following: state.following,
    pendingRequests: state.pendingRequests,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  state.lastSaved = payload.savedAt;
}

function loadSavedData() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      showTemporaryMessage('Tidak ada data terakhir yang tersimpan.');
      return;
    }
    const payload = JSON.parse(raw);
    state.followers = payload.followers || [];
    state.following = payload.following || [];
    state.pendingRequests = payload.pendingRequests || [];
    state.lastSaved = payload.savedAt;
    history.undo = [];
    history.redo = [];
    updateHistoryButtons();
    updatePendingVisibility();
    setError('Data terakhir dimuat dari localStorage.');
    render();
  } catch (error) {
    showError('Gagal memuat data terakhir dari localStorage.');
  }
}

function clearData() {
  state.followers = [];
  state.following = [];
  state.pendingRequests = [];
  history.undo = [];
  history.redo = [];
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  state.searchTerm = '';
  refs.searchInput.value = '';
  state.sort = 'az';
  refs.sortSelect.value = 'az';
  state.limit = 'all';
  refs.limitSelect.value = 'all';
  updateHistoryButtons();
  updatePendingVisibility();
  setError('Data telah dibersihkan. Unggah ulang file untuk memulai lagi.');
  render();
}

initialize();