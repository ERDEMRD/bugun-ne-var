// ==========================================
// BUGÜN NE VAR? - Günlük Görev Hatırlatıcı
// ==========================================

// Veri yönetimi
function getTasks() {
  return JSON.parse(localStorage.getItem('dayim_tasks') || '[]');
}

function saveTasks(tasks) {
  localStorage.setItem('dayim_tasks', JSON.stringify(tasks));
  autoSync();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Tarih yönetimi
let currentViewDate = new Date();

function formatDateTR(date) {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function toDateStr(date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function isToday(dateStr) {
  return dateStr === toDateStr(new Date());
}

// Günlük görünümü değiştir
function changeDay(offset) {
  currentViewDate.setDate(currentViewDate.getDate() + offset);
  render();
}

function goToday() {
  currentViewDate = new Date();
  render();
}

// ==========================================
// ANA RENDER
// ==========================================
function render() {
  const dateStr = toDateStr(currentViewDate);
  const today = toDateStr(new Date());
  const allTasks = getTasks();

  // Tekrarlayan görevleri oluştur
  const tasksForDay = getTasksForDate(allTasks, dateStr);

  // Saate göre sırala
  tasksForDay.sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));

  // Tarih göster
  const dateEl = document.getElementById('today-date');
  if (dateStr === today) {
    dateEl.textContent = '📅 ' + formatDateTR(currentViewDate);
  } else {
    dateEl.textContent = '📅 ' + formatDateTR(currentViewDate);
    dateEl.style.color = '#f39c12';
  }
  if (dateStr === today) dateEl.style.color = '#e94560';

  // Bugüne dön butonu
  document.getElementById('date-nav').style.display = dateStr === today ? 'none' : 'block';

  // Özet kartı
  const incomplete = tasksForDay.filter(t => !t.done);
  document.getElementById('summary-count').textContent = incomplete.length;

  if (dateStr === today) {
    document.getElementById('summary-text').textContent = 'görevin var bugün';
  } else {
    document.getElementById('summary-text').textContent = 'görev var';
  }

  const nextTaskEl = document.getElementById('next-task');
  if (incomplete.length > 0) {
    const now = new Date();
    const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const upcoming = incomplete.find(t => (t.time || '23:59') >= currentTime);
    if (upcoming && dateStr === today) {
      nextTaskEl.style.display = 'block';
      nextTaskEl.textContent = `⏰ Sıradaki: ${upcoming.time || ''} ${upcoming.title}`;
    } else {
      nextTaskEl.style.display = 'none';
    }
  } else {
    nextTaskEl.style.display = 'none';
  }

  // Görev listesi
  const listEl = document.getElementById('task-list');
  const emptyEl = document.getElementById('empty-state');

  if (tasksForDay.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
  } else {
    emptyEl.style.display = 'none';
    listEl.innerHTML = tasksForDay.map(task => renderTaskCard(task, dateStr)).join('');
  }
}

function getTasksForDate(allTasks, dateStr) {
  const result = [];
  const targetDate = new Date(dateStr + 'T00:00:00');

  allTasks.forEach(task => {
    // Tekrarsız görev
    if (task.repeat === 'none' || !task.repeat) {
      if (task.date === dateStr) {
        result.push({ ...task });
      }
      return;
    }

    // Tekrarlayan görev
    const taskDate = new Date(task.date + 'T00:00:00');
    if (targetDate < taskDate) return; // Görev henüz başlamamış

    let matches = false;
    if (task.repeat === 'daily') {
      matches = true;
    } else if (task.repeat === 'weekly') {
      matches = taskDate.getDay() === targetDate.getDay();
    } else if (task.repeat === 'monthly') {
      matches = taskDate.getDate() === targetDate.getDate();
    }

    if (matches) {
      // Tekrarlayan görevlerin tamamlanma durumu tarih bazlı
      const doneKey = `done_${task.id}_${dateStr}`;
      const isDone = localStorage.getItem(doneKey) === 'true';
      result.push({ ...task, done: isDone, _dateKey: dateStr });
    }
  });

  return result;
}

function renderTaskCard(task, dateStr) {
  const doneClass = task.done ? 'completed' : '';
  const btnText = task.done ? 'Geri Al' : '✅ Tamamlandı';
  const btnClass = task.done ? 'btn-complete undo' : 'btn-complete';

  let metaHtml = '';
  if (task.person) metaHtml += `<span>👤 ${esc(task.person)}</span>`;
  if (task.amount) metaHtml += `<span>💰 ${esc(task.amount)}</span>`;
  if (task.repeat && task.repeat !== 'none') {
    const labels = { daily: '🔄 Her gün', weekly: '🔄 Her hafta', monthly: '🔄 Her ay' };
    metaHtml += `<span>${labels[task.repeat] || ''}</span>`;
  }

  return `
    <div class="task-card ${doneClass}">
      <div class="task-time">${task.time ? '🕐 ' + task.time : '📌 Gün içi'}</div>
      <div class="task-title">${esc(task.title)}</div>
      ${metaHtml ? `<div class="task-meta">${metaHtml}</div>` : ''}
      ${task.note ? `<div class="task-note">📝 ${esc(task.note)}</div>` : ''}
      <div class="task-actions">
        <button class="${btnClass}" onclick="toggleDone('${task.id}', '${dateStr}')">${btnText}</button>
        <button class="btn-postpone" onclick="postponeTask('${task.id}', '${dateStr}')">⏩ Ertele</button>
        <button class="btn-edit-task" onclick="showEditForm('${task.id}')">✏️ Düzenle</button>
      </div>
    </div>
  `;
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ==========================================
// GÖREV İŞLEMLERİ
// ==========================================

function toggleDone(id, dateStr) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (task.repeat && task.repeat !== 'none') {
    // Tekrarlayan görev: tarih bazlı done
    const doneKey = `done_${id}_${dateStr}`;
    const current = localStorage.getItem(doneKey) === 'true';
    localStorage.setItem(doneKey, (!current).toString());
  } else {
    task.done = !task.done;
    saveTasks(tasks);
  }

  showToast(task.done !== false ? '✅ Tamamlandı!' : '↩️ Geri alındı');
  render();
}

function postponeTask(id, dateStr) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (task.repeat && task.repeat !== 'none') {
    // Tekrarlayan görev ertelenmez, bugünü tamamla
    const doneKey = `done_${id}_${dateStr}`;
    localStorage.setItem(doneKey, 'true');
    showToast('⏩ Bugünkü tamamlandı olarak işaretlendi');
  } else {
    // Tarihi yarına al
    const d = new Date(task.date + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    task.date = toDateStr(d);
    saveTasks(tasks);
    showToast('⏩ Yarına ertelendi');
  }
  render();
}

// ==========================================
// EKLEME FORMU
// ==========================================

function showAddForm() {
  document.getElementById('input-title').value = '';
  document.getElementById('input-date').value = toDateStr(currentViewDate);
  document.getElementById('input-time').value = '09:00';
  document.getElementById('input-note').value = '';
  document.getElementById('input-person').value = '';
  document.getElementById('input-amount').value = '';
  document.getElementById('input-repeat').value = 'none';
  document.getElementById('input-reminder').value = 'both';
  document.getElementById('add-form').style.display = 'flex';
  document.getElementById('input-title').focus();
}

function hideAddForm() {
  document.getElementById('add-form').style.display = 'none';
}

function saveTask() {
  const title = document.getElementById('input-title').value.trim();
  const date = document.getElementById('input-date').value;

  if (!title) {
    showToast('⚠️ İş adı yazmalısın!');
    return;
  }
  if (!date) {
    showToast('⚠️ Tarih seçmelisin!');
    return;
  }

  const task = {
    id: generateId(),
    title: title,
    date: date,
    time: document.getElementById('input-time').value || '',
    note: document.getElementById('input-note').value.trim(),
    person: document.getElementById('input-person').value.trim(),
    amount: document.getElementById('input-amount').value.trim(),
    repeat: document.getElementById('input-repeat').value,
    reminder: document.getElementById('input-reminder').value,
    done: false,
    createdAt: new Date().toISOString()
  };

  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);

  hideAddForm();
  showToast('✅ Görev eklendi!');
  render();

  // Bildirim zamanlayıcı
  scheduleNotification(task);
}

// ==========================================
// DÜZENLEME FORMU
// ==========================================

function showEditForm(id) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById('edit-id').value = task.id;
  document.getElementById('edit-title').value = task.title;
  document.getElementById('edit-date').value = task.date;
  document.getElementById('edit-time').value = task.time || '';
  document.getElementById('edit-note').value = task.note || '';
  document.getElementById('edit-person').value = task.person || '';
  document.getElementById('edit-amount').value = task.amount || '';
  document.getElementById('edit-repeat').value = task.repeat || 'none';
  document.getElementById('edit-reminder').value = task.reminder || 'attime';
  document.getElementById('edit-form').style.display = 'flex';
}

function hideEditForm() {
  document.getElementById('edit-form').style.display = 'none';
}

function updateTask() {
  const id = document.getElementById('edit-id').value;
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;

  const title = document.getElementById('edit-title').value.trim();
  const date = document.getElementById('edit-date').value;

  if (!title || !date) {
    showToast('⚠️ İş adı ve tarih gerekli!');
    return;
  }

  tasks[idx] = {
    ...tasks[idx],
    title: title,
    date: date,
    time: document.getElementById('edit-time').value || '',
    note: document.getElementById('edit-note').value.trim(),
    person: document.getElementById('edit-person').value.trim(),
    amount: document.getElementById('edit-amount').value.trim(),
    repeat: document.getElementById('edit-repeat').value,
    reminder: document.getElementById('edit-reminder').value
  };

  saveTasks(tasks);
  hideEditForm();
  showToast('✅ Görev güncellendi!');
  render();
}

function deleteTask() {
  const id = document.getElementById('edit-id').value;
  if (!confirm('Bu görevi silmek istediğine emin misin?')) return;

  const tasks = getTasks().filter(t => t.id !== id);
  saveTasks(tasks);
  hideEditForm();
  showToast('🗑 Görev silindi');
  render();
}

// ==========================================
// BİLDİRİMLER
// ==========================================

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'dayim-' + Date.now()
      });
    } catch (e) {
      // Mobilde service worker gerekebilir
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'notification',
          title: title,
          body: body
        });
      }
    }
  }
}

function scheduleNotification(task) {
  if (!task.time || !task.date) return;
  if (task.reminder === 'none') return;

  const taskDateTime = new Date(task.date + 'T' + task.time + ':00');
  const now = new Date();

  // Saatinde bildirim
  if (task.reminder === 'attime' || task.reminder === 'both') {
    const delay = taskDateTime.getTime() - now.getTime();
    if (delay > 0) {
      setTimeout(() => {
        sendNotification('⏰ Şimdi!', `${task.title}${task.person ? ' - ' + task.person : ''}`);
      }, delay);
    }
  }

  // 1 saat önce bildirim
  if (task.reminder === '1hour' || task.reminder === 'both') {
    const delay = taskDateTime.getTime() - now.getTime() - 3600000;
    if (delay > 0) {
      setTimeout(() => {
        sendNotification('⏰ 1 saat sonra', `${task.title}${task.person ? ' - ' + task.person : ''}`);
      }, delay);
    }
  }
}

// Sayfa yüklendiğinde bugünkü görevler için bildirim kur
function scheduleAllNotifications() {
  const tasks = getTasks();
  const today = toDateStr(new Date());
  const todayTasks = getTasksForDate(tasks, today);

  todayTasks.forEach(task => {
    if (!task.done) {
      scheduleNotification(task);
    }
  });
}

// Sabah bildirimi - her dakika kontrol
function checkMorningSummary() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Sabah 9:00 toplu bildirim
  if (hour === 9 && minute === 0) {
    const tasks = getTasks();
    const today = toDateStr(new Date());
    const todayTasks = getTasksForDate(tasks, today).filter(t => !t.done);

    if (todayTasks.length > 0) {
      sendNotification(
        `📋 Bugün ${todayTasks.length} görevin var!`,
        todayTasks.map(t => `${t.time || '??:??'} ${t.title}`).join(', ')
      );
    }
  }
}

// ==========================================
// WHATSAPP GÖNDERİMİ
// ==========================================

function sendWhatsAppSummary() {
  const dateStr = toDateStr(currentViewDate);
  const allTasks = getTasks();
  const tasksForDay = getTasksForDate(allTasks, dateStr);
  tasksForDay.sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));

  if (tasksForDay.length === 0) {
    showToast('📭 Bu gün görev yok');
    return;
  }

  let msg = `📋 *${formatDateTR(currentViewDate)}*\n\n`;
  msg += `Toplam: ${tasksForDay.length} görev\n\n`;

  tasksForDay.forEach((t, i) => {
    const status = t.done ? '✅' : '⬜';
    msg += `${status} ${t.time || '--:--'} — ${t.title}`;
    if (t.person) msg += ` (${t.person})`;
    if (t.amount) msg += ` [${t.amount}]`;
    msg += '\n';
    if (t.note) msg += `   📝 ${t.note}\n`;
  });

  msg += '\n📲 Bugün Ne Var? uygulamasından gönderildi';

  // WhatsApp'ta kendi kendine mesaj
  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

// ==========================================
// YARDIMCI
// ==========================================

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ==========================================
// GOOGLE SHEETS SYNC
// ==========================================

function getSheetsUrl() {
  return localStorage.getItem('dayim_sheets_url') || '';
}

function saveSheetsUrl(url) {
  localStorage.setItem('dayim_sheets_url', url);
}

function updateSyncStatus(text, color) {
  const el = document.getElementById('sync-status');
  if (el) {
    el.textContent = text;
    el.style.color = color || '#888';
  }
}

async function syncToCloud() {
  const url = getSheetsUrl();
  if (!url) {
    showToast('⚠️ Önce Google Sheets URL ayarla!');
    return;
  }

  updateSyncStatus('☁️ Yedekleniyor...', '#f39c12');
  const tasks = getTasks();

  try {
    const response = await fetch(url + '?action=save&data=' + encodeURIComponent(JSON.stringify(tasks)));
    const result = await response.json();
    if (result.status === 'ok') {
      localStorage.setItem('dayim_last_sync', new Date().toISOString());
      updateSyncStatus('✅ Yedeklendi: ' + new Date().toLocaleTimeString('tr-TR'), '#4ecca3');
      showToast('☁️ Google Sheets\'e yedeklendi!');
    } else {
      throw new Error('Sync failed');
    }
  } catch (e) {
    updateSyncStatus('❌ Yedekleme hatası', '#e74c3c');
    showToast('❌ Yedekleme başarısız!');
  }
}

async function syncFromCloud() {
  const url = getSheetsUrl();
  if (!url) {
    showToast('⚠️ Önce Google Sheets URL ayarla!');
    return;
  }

  if (!confirm('Buluttaki veriler telefonun üzerine yazılacak. Emin misin?')) return;

  updateSyncStatus('📥 Geri yükleniyor...', '#f39c12');

  try {
    const response = await fetch(url + '?action=load');
    const result = await response.json();
    if (result.status === 'ok' && result.data) {
      const tasks = JSON.parse(result.data);
      saveTasks(tasks);
      updateSyncStatus('✅ Geri yüklendi: ' + new Date().toLocaleTimeString('tr-TR'), '#4ecca3');
      showToast('📥 Veriler geri yüklendi!');
      render();
    } else {
      throw new Error('Load failed');
    }
  } catch (e) {
    updateSyncStatus('❌ Geri yükleme hatası', '#e74c3c');
    showToast('❌ Geri yükleme başarısız!');
  }
}

// Her görev değişikliğinde otomatik yedekle
function autoSync() {
  const url = getSheetsUrl();
  if (!url) return;

  // 30 saniye debounce
  clearTimeout(window._syncTimer);
  window._syncTimer = setTimeout(() => {
    syncToCloud();
  }, 30000);
}

// Ayarlar
function showSettings() {
  document.getElementById('input-sheets-url').value = getSheetsUrl();
  document.getElementById('settings-form').style.display = 'flex';
}

function hideSettings() {
  document.getElementById('settings-form').style.display = 'none';
}

function saveSettings() {
  const url = document.getElementById('input-sheets-url').value.trim();
  saveSheetsUrl(url);
  hideSettings();
  if (url) {
    updateSyncStatus('☁️ Yedekleme: Bağlı', '#4ecca3');
    showToast('✅ Google Sheets bağlandı!');
    syncToCloud();
  } else {
    updateSyncStatus('☁️ Yedekleme: Bağlı değil', '#888');
    showToast('Google Sheets bağlantısı kaldırıldı');
  }
}

// JSON Dışa/İçe Aktarma
function exportData() {
  const tasks = getTasks();
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bugun-ne-var-yedek-' + toDateStr(new Date()) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Yedek dosyası indirildi!');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm('Mevcut veriler silinip dosyadaki veriler yüklenecek. Emin misin?')) {
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const tasks = JSON.parse(e.target.result);
      if (Array.isArray(tasks)) {
        saveTasks(tasks);
        showToast('📥 Veriler yüklendi!');
        render();
      } else {
        showToast('⚠️ Geçersiz dosya formatı!');
      }
    } catch (err) {
      showToast('⚠️ Dosya okunamadı!');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ==========================================
// SERVICE WORKER
// ==========================================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ==========================================
// BAŞLAT
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermission();
  render();
  scheduleAllNotifications();

  // Sync durumu göster
  if (getSheetsUrl()) {
    const lastSync = localStorage.getItem('dayim_last_sync');
    if (lastSync) {
      updateSyncStatus('☁️ Son yedek: ' + new Date(lastSync).toLocaleString('tr-TR'), '#4ecca3');
    } else {
      updateSyncStatus('☁️ Yedekleme: Bağlı', '#4ecca3');
    }
  }

  // Her dakika kontrol
  setInterval(() => {
    checkMorningSummary();
    // Eğer bugünü gösteriyorsak yenile
    if (toDateStr(currentViewDate) === toDateStr(new Date())) {
      render();
    }
  }, 60000);
});

// Sayfa görünür olunca yenile (telefondan geri dönünce)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    render();
    scheduleAllNotifications();
  }
});
