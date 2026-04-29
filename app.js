// ========================================
// EJAARI - MODIFIED JAVASCRIPT FILE
// Photo thumbnails, admin delete, WhatsApp, in-site chat & notifications
// ========================================

// ==================== GLOBAL VARIABLES ====================
let currentLang = 'ar';
let currentType = 'all';
let selectedIcon = '🏢';
let contactProp = null;
let mapInstance = null;
let addPropMapInstance = null;
let mapMarkers = [];
let currentUser = JSON.parse(localStorage.getItem('ejaari_user')) || null;
let uploadedMedia = [];
let mapCoordinates = { lat: 30.0444, lng: 31.2357 };
let properties = JSON.parse(localStorage.getItem('ejaari_properties')) || getDefaultProperties();
let messages = JSON.parse(localStorage.getItem('ejaari_messages')) || []; // {convId, propId, from, to, text, ts}
let notifications = JSON.parse(localStorage.getItem('ejaari_notifications')) || []; // {id, to, text, read, ts}

// ==================== DEFAULT PROPERTIES ====================
function getDefaultProperties() {
  return [
    { id:1, title:'شقة فاخرة - حي النرجس', type:'شقة', location:'حي النرجس، القاهرة', price:5500, rooms:3, baths:2, area:120, icon:'🏢', phone:'0501234567', desc:'شقة حديثة وفاخرة بمواقع ممتازة', lat:30.0444, lng:31.2357, media:[], userId:'admin', createdAt: Date.now()-600000 },
    { id:2, title:'فيلا عصرية مع مسبح', type:'فيلا', location:'حي الملقا، الجيزة', price:18000, rooms:5, baths:4, area:400, icon:'🏡', phone:'0502345678', desc:'فيلا فخمة مع جميع التسهيلات', lat:30.0200, lng:31.2400, media:[], userId:'admin', createdAt: Date.now()-500000 },
    { id:3, title:'مكتب تجاري - القاهرة الجديدة', type:'مكتب', location:'القاهرة الجديدة', price:12000, rooms:0, baths:2, area:200, icon:'🏢', phone:'0503456789', desc:'مكتب تجاري بموقع استراتيجي', lat:30.0100, lng:31.2300, media:[], userId:'admin', createdAt: Date.now()-400000 },
  ];
}

// ==================== STORAGE HELPERS ====================
function saveProperties() {
  localStorage.setItem('ejaari_properties', JSON.stringify(properties));
  updateStats();
}
function saveMessages() {
  localStorage.setItem('ejaari_messages', JSON.stringify(messages));
}
function saveNotifications() {
  localStorage.setItem('ejaari_notifications', JSON.stringify(notifications));
}
function updateStats() {
  const elProps = document.getElementById('stats-props');
  if (elProps) elProps.textContent = properties.length;
  const uniqueUsers = new Set(properties.map(p => p.userId)).size;
  const elUsers = document.getElementById('stats-users');
  if (elUsers) elUsers.textContent = uniqueUsers;
  updateNotifBadge();
}

// ==================== LANGUAGE & NAVIGATION ====================
function toggleLang() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  document.documentElement.setAttribute('lang', currentLang);
  document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  document.body.setAttribute('data-lang', currentLang);
  const lbl = document.getElementById('lang-label');
  if (lbl) lbl.textContent = currentLang === 'ar' ? 'EN' : 'AR';
  renderAll();
}

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const nl = document.getElementById('nav-' + page);
  if (nl) nl.classList.add('active');
  if (page === 'map') setTimeout(initMap, 100);
  if (page === 'dashboard') { if (checkAuth()) renderDashboard(); }
  if (page === 'listings') renderListings(properties);
  if (page === 'home') renderFeatured();
  window.scrollTo(0, 0);
}

// ==================== AUTHENTICATION ====================
function checkAuth() {
  if (!currentUser) {
    showToast('يرجى تسجيل الدخول أولاً');
    navigate('auth');
    return false;
  }
  return true;
}

function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (email && password) {
    // default to landlord unless email is admin@...
    const type = email === 'admin@ejaari.local' ? 'admin' : 'landlord';
    currentUser = { email, name: email.split('@')[0], type };
    localStorage.setItem('ejaari_user', JSON.stringify(currentUser));
    showToast('تم تسجيل الدخول بنجاح ✅');
    updateUserUI();
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    navigate('home');
  } else {
    showToast('يرجى ملء جميع الحقول');
  }
}

function handleRegister() {
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const type = document.getElementById('register-type').value || 'landlord';
  if (name && email) {
    currentUser = { email, name, type };
    localStorage.setItem('ejaari_user', JSON.stringify(currentUser));
    showToast('تم إنشاء الحساب بنجاح 🎉');
    updateUserUI();
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-phone').value = '';
    document.getElementById('register-password').value = '';
    navigate('home');
  } else {
    showToast('يرجى ملء جميع الحقول');
  }
}

function authTab(tab, btn) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const loginEl = document.getElementById('auth-login');
  const regEl = document.getElementById('auth-register');
  if (loginEl) loginEl.style.display = tab === 'login' ? 'block' : 'none';
  if (regEl) regEl.style.display = tab === 'register' ? 'block' : 'none';
}

function logout() {
  currentUser = null;
  localStorage.removeItem('ejaari_user');
  updateUserUI();
  navigate('home');
  showToast('تم تسجيل الخروج');
}

function updateUserUI() {
  const loginBtn = document.getElementById('login-btn');
  const userSection = document.getElementById('user-section');
  if (currentUser) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userSection) userSection.style.display = 'flex';
    const nameEl = document.getElementById('user-name');
    const avatar = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (avatar) avatar.textContent = currentUser.name.charAt(0).toUpperCase();
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (userSection) userSection.style.display = 'none';
  }
  renderAll();
}

function toggleProfileMenu() {
  const menu = document.getElementById('profile-menu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// ==================== PROPERTY CARD RENDERING ====================
// helper to get thumbnail (first image) or fallback icon
function getThumbnailHtml(p, size = 1) {
  if (p.media && p.media.length) {
    const m = p.media[0];
    if (!m.isVideo) {
      return `<img src="${m.data}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
    } else {
      return `<video src="${m.data}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" muted></video>`;
    }
  }
  // fallback to emoji icon
  return `<div style="font-size:${size===1?'48px':'64px'};line-height:1">${p.icon}</div>`;
}

function propCard(p) {
  const t = p.title;
  const priceLabel = `${p.price.toLocaleString()} جنيه/شهر`;
  const badge = p.type;
  const loc = p.location;
  const roomsLabel = 'غرفة';
  const btnContact = 'دردشة';
  const btnDetail = 'التفاصيل';
  const roomsRow = p.rooms > 0 ? `<div class="prop-meta-item">🛏 ${p.rooms} ${roomsLabel}</div>` : '';
  // show delete button only for admin
  const deleteBtn = (currentUser && currentUser.type === 'admin') ? `<button class="btn-sm btn-sm-danger" onclick="removeProperty(${p.id}, event)">حذف</button>` : '';
  return `
    <div class="prop-card">
      <div class="prop-img" onclick="openDetail(${p.id})" style="cursor:pointer">
        ${getThumbnailHtml(p, 1)}
        <div class="prop-img-overlay"></div>
        <div class="prop-badge">${badge}</div>
        <div class="prop-price">${priceLabel}</div>
      </div>
      <div class="prop-body">
        <div class="prop-title" onclick="openDetail(${p.id})" style="cursor:pointer">${t}</div>
        <div class="prop-location">📍 ${loc}</div>
        <div class="prop-meta">
          ${roomsRow}
          <div class="prop-meta-item">🚿 ${p.baths}</div>
          <div class="prop-meta-item">📐 ${p.area} م²</div>
        </div>
        <div class="prop-actions">
          <button class="btn-sm btn-sm-outline" onclick="openChat(${p.id})">${btnContact}</button>
          <button class="btn-sm btn-sm-primary" onclick="openDetail(${p.id})">${btnDetail}</button>
          ${deleteBtn}
        </div>
      </div>
    </div>`;
}

function renderFeatured() {
  const g = document.getElementById('featured-grid');
  if (!g) return;
  // show most recent first
  const sorted = [...properties].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  const featured = sorted.slice(0, 3);
  g.innerHTML = featured.length ? featured.map(p => propCard(p)).join('') : '<div style="grid-column:1/-1;text-align:center;padding:40px">لا توجد عقارات حالياً</div>';
}

function renderListings(list = properties) {
  const g = document.getElementById('listings-grid');
  if (!g) return;
  // ensure list is sorted by createdAt desc by default
  const sorted = [...list].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  g.innerHTML = sorted.length ? sorted.map(p => propCard(p)).join('') : '<div style="grid-column:1/-1;text-align:center;padding:40px">لا توجد عقارات مطابقة</div>';
}

function renderAll() {
  renderFeatured();
  applyFilters();
  renderDashboard();
}

// ==================== DASHBOARD RENDERING ====================
function renderDashboard() {
  if (!currentUser) return;
  const list = document.getElementById('dash-props-list');
  if (!list) return;
  const userProps = properties.filter(p => p.userId === currentUser.email || p.userId === 'admin');
  const statuses = ['active','active','active','pending','inactive'];
  const welcome = document.getElementById('dash-welcome');
  if (welcome) welcome.textContent = `مرحباً ${currentUser.name}! هذا ملخص عقاراتك.`;
  const statProps = document.getElementById('stat-props');
  if (statProps) statProps.textContent = userProps.length;
  const statActive = document.getElementById('stat-active');
  if (statActive) statActive.textContent = Math.floor(userProps.length * 0.6);
  const statMessages = document.getElementById('stat-messages');
  if (statMessages) statMessages.textContent = Math.floor(userProps.length * 2.4);
  const revenue = userProps.reduce((sum, p) => sum + p.price, 0);
  const statRevenue = document.getElementById('stat-revenue');
  if (statRevenue) statRevenue.textContent = revenue.toLocaleString();
  list.innerHTML = userProps.slice(0, 5).map((p, i) => {
    const t = p.title;
    const loc = p.location;
    const price = `${p.price.toLocaleString()} جنيه/شهر`;
    const s = statuses[i] || 'inactive';
    const sLabel = s === 'active' ? 'مؤجَّر' : s === 'pending' ? 'قيد الانتظار' : 'شاغر';
    const deleteBtn = (currentUser && currentUser.type === 'admin') ? `<button class="btn-sm btn-sm-danger" onclick="removeProperty(${p.id}, event)">حذف</button>` : '';
    return `<div class="dash-prop-row" onclick="openDetail(${p.id})">
      <div class="dash-prop-emoji">${getThumbnailHtml(p, 0)}</div>
      <div class="dash-prop-info">
        <div class="dash-prop-name">${t} <span class="status-dot ${s}"></span></div>
        <div class="dash-prop-loc">📍 ${loc} · ${sLabel}</div>
      </div>
      <div class="dash-prop-price">${price}</div>
      ${deleteBtn}
    </div>`;
  }).join('');
}

// ==================== FILTERING ====================
function filterType(type, btn) {
  currentType = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function applyFilters() {
  let list = [...properties];
  if (currentType !== 'all') list = list.filter(p => p.type === currentType);
  const location = document.getElementById('f-location')?.value.toLowerCase() || '';
  const min = parseFloat(document.getElementById('f-min')?.value) || 0;
  const max = parseFloat(document.getElementById('f-max')?.value) || Infinity;
  const rooms = document.getElementById('f-rooms')?.value;
  const sort = document.getElementById('f-sort')?.value;
  
  if (location) {
    list = list.filter(p => p.location.toLowerCase().includes(location) || p.title.toLowerCase().includes(location));
  }
  list = list.filter(p => p.price >= min && p.price <= max);
  if (rooms) {
    if (rooms === '4') list = list.filter(p => p.rooms >= 4);
    else list = list.filter(p => p.rooms === parseInt(rooms));
  }
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  renderListings(list);
}

function doSearch() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const type = document.getElementById('search-type').value;
  navigate('listings');
  setTimeout(() => {
    let list = properties.filter(p => {
      const match = p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
      const typeMatch = !type || p.type === type;
      return match && typeMatch;
    });
    renderListings(list);
  }, 100);
}

function liveSearch(q) {
  // Live search feedback (left as-is)
}

// ==================== MEDIA UPLOAD ====================
function handleMediaUpload(event) {
  const files = event.target.files;
  uploadedMedia = [];
  const preview = document.getElementById('media-preview');
  if (preview) preview.innerHTML = '';
  
  for (let file of files) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const isVideo = file.type.startsWith('video');
      uploadedMedia.push({ data: e.target.result, type: file.type, isVideo });
      const html = `
        <div class="media-thumb">
          ${isVideo ? `<video src="${e.target.result}" style="width:100%;height:100%;object-fit:cover"></video>` : `<img src="${e.target.result}">`}
          <button class="remove-media" onclick="removeMedia(${uploadedMedia.length - 1})">✕</button>
        </div>`;
      if (preview) preview.innerHTML += html;
    };
    reader.readAsDataURL(file);
  }
}

function removeMedia(index) {
  uploadedMedia.splice(index, 1);
  const preview = document.getElementById('media-preview');
  if (!preview) return;
  preview.innerHTML = uploadedMedia.map((m, i) => `
    <div class="media-thumb">
      ${m.isVideo ? `<video src="${m.data}" style="width:100%;height:100%;object-fit:cover"></video>` : `<img src="${m.data}">`}
      <button class="remove-media" onclick="removeMedia(${i})">✕</button>
    </div>`).join('');
}

// ==================== MAP FUNCTIONS ====================
function initAddPropMap() {
  const mapElement = document.getElementById('add-prop-map');
  if (!mapElement) return;
  
  if (addPropMapInstance) {
    addPropMapInstance.remove();
  }
  
  addPropMapInstance = L.map('add-prop-map').setView([mapCoordinates.lat, mapCoordinates.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(addPropMapInstance);
  
  addPropMapInstance.on('click', function(e) {
    mapCoordinates = { lat: e.latlng.lat, lng: e.latlng.lng };
    const latEl = document.getElementById('new-map-lat');
    const lngEl = document.getElementById('new-map-lng');
    if (latEl) latEl.value = e.latlng.lat;
    if (lngEl) lngEl.value = e.latlng.lng;
    
    const mapContainer = document.getElementById('add-prop-map');
    mapContainer.innerHTML = '';
    initAddPropMap();
    
    L.marker([e.latlng.lat, e.latlng.lng]).addTo(addPropMapInstance).bindPopup('الموقع المختار');
    showToast('✅ تم تحديد الموقع بنجاح');
  });
}

function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;
  
  if (mapInstance) {
    mapInstance.remove();
  }
  
  mapInstance = L.map('map').setView([30.0444, 31.2357], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapInstance);
  
  properties.forEach(prop => {
    if (prop.lat && prop.lng) {
      L.marker([prop.lat, prop.lng]).addTo(mapInstance).bindPopup(`<b>${prop.title}</b><br>${prop.price} جنيه`);
    }
  });
}

// ==================== PROPERTY DETAILS & CONTACT ====================
function openDetail(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  const t = p.title;
  const d = p.desc;
  const priceLabel = `${p.price.toLocaleString()} جنيه/شهر`;
  const loc = `📍 ${p.location}`;
  const btnChat = 'دردشة';
  const featuresTags = (p.features || []).map(f => `<span class="feature-tag">✓ ${f}</span>`).join('');
  const mediaHtml = p.media && p.media.length ? p.media.map(m => 
    m.isVideo ? `<video src="${m.data}" style="width:100%;height:200px;object-fit:cover;border-radius:8px;margin:8px 0" controls></video>` :
    `<img src="${m.data}" style="width:100%;height:200px;object-fit:cover;border-radius:8px;margin:8px 0">`
  ).join('') : '';
  
  document.getElementById('detail-content').innerHTML = `
    <div class="prop-detail-header">
      <div class="prop-detail-img">${getThumbnailHtml(p, 0)}</div>
      <div class="prop-detail-info">
        <div class="prop-detail-title">${t}</div>
        <div class="prop-detail-price">${priceLabel}</div>
        <div class="prop-detail-loc">${loc}</div>
        <div class="prop-detail-meta">
          ${p.rooms > 0 ? `<div class="detail-meta-item"><div class="detail-meta-val">${p.rooms}</div><div class="detail-meta-lbl">غرف</div></div>` : ''}
          <div class="detail-meta-item"><div class="detail-meta-val">${p.baths}</div><div class="detail-meta-lbl">حمامات</div></div>
          <div class="detail-meta-item"><div class="detail-meta-val">${p.area}</div><div class="detail-meta-lbl">م²</div></div>
        </div>
        <p style="font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:16px">${d}</p>
        <div class="prop-features">${featuresTags}</div>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn-primary" style="flex:1" onclick="openChat(${p.id})">${btnChat}</button>
          <button class="btn-outline" style="flex:1" onclick="openWhatsApp(${p.id})">WhatsApp</button>
        </div>
      </div>
    </div>
    ${mediaHtml}`;
  openModal('detail-modal');
}

function openWhatsApp(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  // normalize phone: remove non-digits, assume Egypt if starts with 0 -> +20
  let phone = (p.phone || '').replace(/\D/g,'');
  if (!phone) {
    showToast('لا يوجد رقم واتساب للمؤجر');
    return;
  }
  if (phone.startsWith('0')) phone = '20' + phone.slice(1);
  if (!phone.startsWith('+')) phone = '+' + phone;
  // open wa.me link
  const waLink = `https://wa.me/${phone.replace('+','')}`;
  window.open(waLink, '_blank');
}

function openChat(propId) {
  if (!checkAuth()) return;
  const p = properties.find(x => x.id === propId);
  if (!p) return;
  contactProp = p;
  const owner = p.userId;
  const user = currentUser.email;
  const convId = `prop_${propId}::${owner}::${user}`;
  document.getElementById('chat-prop-title').textContent = p.title;
  document.getElementById('chat-prop-owner').textContent = owner;
  document.getElementById('chat-input').value = '';
  document.getElementById('chat-messages').innerHTML = renderConversation(convId);
  document.getElementById('chat-send-btn').onclick = function() { sendMessage(convId, propId, owner, user); };
  openModal('chat-modal');
}

function renderConversation(convId) {
  const conv = messages.filter(m => m.convId === convId).sort((a,b) => a.ts - b.ts);
  if (!conv.length) return '<div style="padding:12px;color:var(--text2)">لا توجد رسائل بعد</div>';
  return conv.map(m => {
    const me = currentUser && m.from === currentUser.email;
    return `<div class="chat-msg ${me ? 'me' : 'them'}">
      <div class="chat-msg-text">${escapeHtml(m.text)}</div>
      <div class="chat-msg-ts">${new Date(m.ts).toLocaleString()}</div>
    </div>`;
  }).join('');
}

function sendMessage(convId, propId, owner, user) {
  const text = document.getElementById('chat-input').value.trim();
  if (!text) return;
  const from = currentUser.email;
  const to = (from === owner) ? user : owner;
  const msg = { convId, propId, from, to, text, ts: Date.now() };
  messages.push(msg);
  saveMessages();
  // add notification for recipient
  const notif = { id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), to, text: `رسالة جديدة من ${from}`, read: false, ts: Date.now() };
  notifications.push(notif);
  saveNotifications();
  updateNotifBadge();
  // re-render conversation
  document.getElementById('chat-messages').innerHTML = renderConversation(convId);
  document.getElementById('chat-input').value = '';
  showToast('تم إرسال الرسالة');
}

// ==================== NOTIFICATIONS UI ====================
function updateNotifBadge() {
  if (!currentUser) {
    const nb = document.getElementById('notif-badge');
    if (nb) nb.style.display = 'none';
    return;
  }
  const unread = notifications.filter(n => n.to === currentUser.email && !n.read).length;
  const nb = document.getElementById('notif-badge');
  if (nb) {
    if (unread > 0) {
      nb.style.display = 'inline-block';
      nb.textContent = unread;
    } else {
      nb.style.display = 'none';
    }
  }
}

function openNotifications() {
  if (!checkAuth()) return;
  const list = document.getElementById('notif-list');
  if (!list) return;
  const myNotifs = notifications.filter(n => n.to === currentUser.email).sort((a,b) => b.ts - a.ts);
  list.innerHTML = myNotifs.length ? myNotifs.map(n => `
    <div class="notif-row ${n.read ? 'read' : 'unread'}" onclick="openNotifAction('${n.id}')">
      <div class="notif-text">${n.text}</div>
      <div class="notif-ts">${new Date(n.ts).toLocaleString()}</div>
    </div>
  `).join('') : '<div style="padding:12px;color:var(--text2)">لا توجد إشعارات</div>';
  openModal('notif-modal');
}

function openNotifAction(id) {
  const n = notifications.find(x => x.id === id);
  if (!n) return;
  n.read = true;
  saveNotifications();
  updateNotifBadge();
  // refresh list
  openNotifications();
}

// ==================== ADD PROPERTY ====================
function openAddProp() {
  if (!currentUser) {
    showToast('يرجى تسجيل الدخول أولاً');
    navigate('auth');
    return;
  }
  uploadedMedia = [];
  const preview = document.getElementById('media-preview');
  if (preview) preview.innerHTML = '';
  openModal('add-prop-modal');
  setTimeout(() => initAddPropMap(), 100);
}

function selectIcon(el, icon) {
  document.querySelectorAll('.img-choice').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedIcon = icon;
}

function addProperty() {
  if (!currentUser) {
    showToast('يرجى تسجيل الدخول');
    return;
  }
  const title = document.getElementById('new-title').value;
  const type = document.getElementById('new-type').value;
  const location = document.getElementById('new-location').value;
  const price = parseFloat(document.getElementById('new-price').value);
  const rooms = parseInt(document.getElementById('new-rooms').value) || 0;
  const baths = parseInt(document.getElementById('new-baths').value) || 0;
  const area = parseFloat(document.getElementById('new-area').value) || 0;
  const phone = document.getElementById('new-phone').value;
  const desc = document.getElementById('new-desc').value;
  const lat = parseFloat(document.getElementById('new-map-lat').value) || 30.0444;
  const lng = parseFloat(document.getElementById('new-map-lng').value) || 31.2357;

  if (!title || !location || !price || isNaN(price)) {
    showToast('يرجى ملء الحقول المطلوبة');
    return;
  }
  
  const newProp = {
    id: Math.max(...properties.map(p => p.id), 0) + 1,
    title, type, location, price, rooms, baths, area, icon: selectedIcon, phone, desc,
    userId: currentUser.email,
    createdAt: Date.now(),
    lat, lng,
    media: uploadedMedia
  };
  
  // insert at beginning so it appears as most recent
  properties.unshift(newProp);
  saveProperties();
  showToast('✅ تم إضافة العقار بنجاح');
  closeModal('add-prop-modal');
  uploadedMedia = [];
  
  document.getElementById('new-title').value = '';
  document.getElementById('new-location').value = '';
  document.getElementById('new-price').value = '';
  document.getElementById('new-desc').value = '';
  
  renderAll();
}

// ==================== REMOVE PROPERTY (ADMIN) ====================
function removeProperty(id, event) {
  if (event) event.stopPropagation();
  if (!currentUser || currentUser.type !== 'admin') {
    showToast('غير مصرح');
    return;
  }
  if (!confirm('هل أنت متأكد من حذف هذا العقار؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
  properties = properties.filter(p => p.id !== id);
  saveProperties();
  showToast('تم حذف العقار');
  renderAll();
}

// ==================== MODAL & UI ====================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) {
    alert(msg);
    return;
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  updateUserUI();
  updateStats();
  renderFeatured();
});
