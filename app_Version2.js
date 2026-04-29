// ========================================
// EJAARI - COMPLETE JAVASCRIPT FILE
// With Egyptian Pound, Media Upload & Map Integration
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
let chatMessages = JSON.parse(localStorage.getItem('ejaari_chats')) || {};
let notifications = JSON.parse(localStorage.getItem('ejaari_notifications')) || [];
let currentChatProp = null;
let currentChatWith = null;

// Admin user (you - website owner)
const ADMIN_EMAIL = 'admin@ejaari.com';

// ==================== DEFAULT PROPERTIES ====================
function getDefaultProperties() {
  return [
    { id:1, title:'شقة فاخرة - حي النرجس', type:'شقة', location:'حي النرجس، القاهرة', price:5500, rooms:3, baths:2, area:120, icon:'🏢', phone:'0501234567', desc:'شقة حديثة مع جميع المرافق', media: [], userId: 'admin', createdAt: Date.now() - 86400000 },
    { id:2, title:'فيلا عصرية مع مسبح', type:'فيلا', location:'حي الملقا، الجيزة', price:18000, rooms:5, baths:4, area:400, icon:'🏡', phone:'0502345678', desc:'فيلا فاخرة في حي راقي', media: [], userId: 'admin', createdAt: Date.now() - 172800000 },
    { id:3, title:'مكتب تجاري - القاهرة الجديدة', type:'مكتب', location:'القاهرة الجديدة', price:12000, rooms:0, baths:2, area:200, icon:'🏢', phone:'0503456789', desc:'مكتب مجهز بالكامل', media: [], userId: 'admin', createdAt: Date.now() - 259200000 },
  ];
}

// ==================== STORAGE FUNCTIONS ====================
function saveProperties() {
  localStorage.setItem('ejaari_properties', JSON.stringify(properties));
  updateStats();
}

function saveChats() {
  localStorage.setItem('ejaari_chats', JSON.stringify(chatMessages));
}

function saveNotifications() {
  localStorage.setItem('ejaari_notifications', JSON.stringify(notifications));
}

function addNotification(userId, message, type = 'message', propId = null) {
  notifications.push({
    id: Date.now(),
    userId,
    message,
    type,
    propId,
    read: false,
    createdAt: Date.now()
  });
  saveNotifications();
}

function updateStats() {
  document.getElementById('stats-props').textContent = properties.length;
  const uniqueUsers = new Set(properties.map(p => p.userId)).size;
  document.getElementById('stats-users').textContent = uniqueUsers;
}

// ==================== LANGUAGE & NAVIGATION ====================
function toggleLang() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  document.documentElement.setAttribute('lang', currentLang);
  document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  document.body.setAttribute('data-lang', currentLang);
  document.getElementById('lang-label').textContent = currentLang === 'ar' ? 'EN' : 'AR';
  renderAll();
}

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const nl = document.getElementById('nav-' + page);
  if (nl) nl.classList.add('active');
  if (page === 'map') setTimeout(initMap, 100);
  if (page === 'dashboard') { if (checkAuth()) renderDashboard(); }
  if (page === 'notifications') { if (checkAuth()) renderNotifications(); }
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
    currentUser = { email, name: email.split('@')[0], type: 'landlord' };
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
  const type = document.getElementById('register-type').value;
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
  document.getElementById('auth-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-register').style.display = tab === 'register' ? 'block' : 'none';
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
  const notifBadge = document.getElementById('notif-badge');
  
  if (currentUser) {
    loginBtn.style.display = 'none';
    userSection.style.display = 'block';
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Update notification badge
    const unreadCount = notifications.filter(n => n.userId === currentUser.email && !n.read).length;
    if (unreadCount > 0) {
      notifBadge.textContent = unreadCount;
      notifBadge.style.display = 'block';
    } else {
      notifBadge.style.display = 'none';
    }
  } else {
    loginBtn.style.display = 'block';
    userSection.style.display = 'none';
  }
}

function toggleProfileMenu() {
  const menu = document.getElementById('profile-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// ==================== PROPERTY CARD RENDERING ====================
function propCard(p, isAdmin = false) {
  const t = p.title;
  const priceLabel = `${p.price.toLocaleString()} جنيه/شهر`;
  const badge = p.type;
  const loc = p.location;
  const roomsLabel = 'غرفة';
  const bathsLabel = 'حمام';
  const btnContact = 'تواصل';
  const btnDetail = 'التفاصيل';
  const roomsRow = p.rooms > 0 ? `<div class="prop-meta-item">🛏 ${p.rooms} ${roomsLabel}</div>` : '';
  
  // Use first media image if available, otherwise use icon
  const propImage = (p.media && p.media.length > 0) 
    ? `<img src="${p.media[0].data}" style="width:100%;height:100%;object-fit:cover">`
    : p.icon;
  
  const deleteBtn = isAdmin && currentUser && currentUser.email === ADMIN_EMAIL 
    ? `<button class="btn-delete-prop" onclick="deleteProperty(${p.id})" title="حذف">🗑️</button>` 
    : '';
  
  return `
    <div class="prop-card">
      <div class="prop-img" onclick="openDetail(${p.id})">
        ${propImage}
        <div class="prop-img-overlay"></div>
        <div class="prop-badge">${badge}</div>
        <div class="prop-price">${priceLabel}</div>
        ${deleteBtn}
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
        </div>
      </div>
    </div>`;
}

function renderFeatured() {
  const g = document.getElementById('featured-grid');
  if (!g) return;
  const featured = properties.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 3);
  g.innerHTML = featured.length ? featured.map(p => propCard(p, true)).join('') : '<div style="grid-column:1/-1;text-align:center;padding:40px">لا توجد عقارات حالياً</div>';
}

function renderListings(list = properties) {
  const g = document.getElementById('listings-grid');
  if (!g) return;
  const sortedList = list.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  g.innerHTML = sortedList.length ? sortedList.map(p => propCard(p, true)).join('') : '<div style="grid-column:1/-1;text-align:center;padding:40px">لا توجد عقارات مطابقة</div>';
}

function renderAll() {
  renderFeatured();
  applyFilters();
  renderDashboard();
}

// ==================== DELETE PROPERTY ====================
function deleteProperty(id) {
  if (currentUser && currentUser.email === ADMIN_EMAIL) {
    if (confirm('هل أنت متأكد من حذف هذا العقار؟')) {
      properties = properties.filter(p => p.id !== id);
      saveProperties();
      showToast('✅ تم حذف العقار');
      renderAll();
    }
  } else {
    showToast('ليس لديك صلاحية لحذف هذا العقار');
  }
}

// ==================== DASHBOARD RENDERING ====================
function renderDashboard() {
  if (!currentUser) return;
  const list = document.getElementById('dash-props-list');
  if (!list) return;
  const userProps = properties.filter(p => p.userId === currentUser.email);
  const statuses = ['active','active','active','pending','inactive'];
  document.getElementById('dash-welcome').textContent = `مرحباً ${currentUser.name}! هذا ملخص عقاراتك.`;
  document.getElementById('stat-props').textContent = userProps.length;
  document.getElementById('stat-active').textContent = Math.floor(userProps.length * 0.6);
  document.getElementById('stat-messages').textContent = Math.floor(userProps.length * 2.4);
  const revenue = userProps.reduce((sum, p) => sum + p.price, 0);
  document.getElementById('stat-revenue').textContent = revenue.toLocaleString();
  list.innerHTML = userProps.slice(0, 5).map((p, i) => {
    const t = p.title;
    const loc = p.location;
    const price = `${p.price.toLocaleString()} جنيه/شهر`;
    const s = statuses[i] || 'inactive';
    const sLabel = s === 'active' ? 'مؤجَّر' : s === 'pending' ? 'قيد الانتظار' : 'شاغر';
    return `<div class="dash-prop-row" onclick="openDetail(${p.id})">
      <div class="dash-prop-emoji">${p.icon}</div>
      <div class="dash-prop-info">
        <div class="dash-prop-name">${t} <span class="status-dot ${s}"></span></div>
        <div class="dash-prop-loc">📍 ${loc} · ${sLabel}</div>
      </div>
      <div class="dash-prop-price">${price}</div>
    </div>`;
  }).join('');
}

// ==================== NOTIFICATIONS ====================
function renderNotifications() {
  if (!currentUser) return;
  const notifList = document.getElementById('notifications-list');
  if (!notifList) return;
  
  const userNotifs = notifications
    .filter(n => n.userId === currentUser.email)
    .sort((a, b) => b.createdAt - a.createdAt);
  
  if (userNotifs.length === 0) {
    notifList.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2)">لا توجد إشعارات</div>';
    return;
  }
  
  notifList.innerHTML = userNotifs.map(n => {
    const time = new Date(n.createdAt);
    const timeStr = getTimeAgo(time);
    const readClass = n.read ? '' : 'unread';
    return `
      <div class="notification-item ${readClass}" onclick="markNotifRead(${n.id})">
        <div class="notif-icon">${getNotifIcon(n.type)}</div>
        <div class="notif-content">
          <div class="notif-message">${n.message}</div>
          <div class="notif-time">${timeStr}</div>
        </div>
        ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
      </div>`;
  }).join('');
}

function getNotifIcon(type) {
  const icons = {
    'message': '💬',
    'chat': '💬',
    'contact': '📞',
    'property': '🏠',
    'system': 'ℹ️'
  };
  return icons[type] || '📧';
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'الآن';
  if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
  return `منذ ${Math.floor(seconds / 86400)} يوم`;
}

function markNotifRead(notifId) {
  const notif = notifications.find(n => n.id === notifId);
  if (notif) {
    notif.read = true;
    saveNotifications();
    updateUserUI();
    renderNotifications();
  }
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
  // Live search feedback
}

// ==================== MEDIA UPLOAD ====================
function handleMediaUpload(event) {
  const files = event.target.files;
  uploadedMedia = [];
  const preview = document.getElementById('media-preview');
  preview.innerHTML = '';
  
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
      preview.innerHTML += html;
    };
    reader.readAsDataURL(file);
  }
}

function removeMedia(index) {
  uploadedMedia.splice(index, 1);
  const preview = document.getElementById('media-preview');
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
    document.getElementById('new-map-lat').value = e.latlng.lat;
    document.getElementById('new-map-lng').value = e.latlng.lng;
    
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

// ==================== CHAT SYSTEM ====================
function openChat(propId) {
  if (!checkAuth()) return;
  
  const prop = properties.find(p => p.id === propId);
  if (!prop) return;
  
  currentChatProp = prop;
  currentChatWith = prop.userId;
  
  const chatKey = getChatKey(currentUser.email, currentChatWith, propId);
  
  if (!chatMessages[chatKey]) {
    chatMessages[chatKey] = [];
  }
  
  document.getElementById('chat-prop-title').textContent = prop.title;
  document.getElementById('chat-prop-price').textContent = `${prop.price.toLocaleString()} جنيه/شهر`;
  document.getElementById('chat-prop-contact').textContent = prop.phone;
  document.getElementById('chat-owner-name').textContent = prop.userId;
  
  renderChatMessages(chatKey);
  openModal('chat-modal');
}

function getChatKey(user1, user2, propId) {
  const users = [user1, user2].sort();
  return `${users[0]}_${users[1]}_${propId}`;
}

function renderChatMessages(chatKey) {
  const messagesContainer = document.getElementById('chat-messages');
  const msgs = chatMessages[chatKey] || [];
  
  messagesContainer.innerHTML = msgs.map(msg => {
    const isOwn = msg.sender === currentUser.email;
    const align = isOwn ? 'own' : 'other';
    return `
      <div class="chat-message ${align}">
        <div class="chat-bubble">${escapeHtml(msg.text)}</div>
        <div class="chat-time">${getTimeAgo(new Date(msg.timestamp))}</div>
      </div>`;
  }).join('');
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  
  if (!text || !currentChatProp || !currentChatWith) {
    showToast('يرجى إدخال رسالة');
    return;
  }
  
  const chatKey = getChatKey(currentUser.email, currentChatWith, currentChatProp.id);
  
  if (!chatMessages[chatKey]) {
    chatMessages[chatKey] = [];
  }
  
  const message = {
    sender: currentUser.email,
    senderName: currentUser.name,
    text,
    timestamp: new Date().toISOString()
  };
  
  chatMessages[chatKey].push(message);
  saveChats();
  
  // Add notification to other user
  addNotification(
    currentChatWith,
    `رسالة جديدة من ${currentUser.name} بخصوص "${currentChatProp.title}"`,
    'chat',
    currentChatProp.id
  );
  
  input.value = '';
  renderChatMessages(chatKey);
  showToast('تم إرسال الرسالة ✅');
}

function openWhatsApp(phoneNumber) {
  if (!phoneNumber) {
    showToast('رقم الهاتف غير متوفر');
    return;
  }
  
  // Format phone number for WhatsApp (remove spaces and special characters)
  const cleanPhone = phoneNumber.replace(/[\D]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}`;
  window.open(whatsappUrl, '_blank');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== PROPERTY DETAILS & CONTACT ====================
function openDetail(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  const t = p.title;
  const d = p.desc;
  const priceLabel = `${p.price.toLocaleString()} جنيه/شهر`;
  const loc = `📍 ${p.location}`;
  const btnContact = 'تواصل';
  const featuresTags = (p.features || []).map(f => `<span class="feature-tag">✓ ${f}</span>`).join('');
  
  const mediaHtml = p.media && p.media.length ? p.media.map(m => 
    m.isVideo ? `<video src="${m.data}" style="width:100%;height:300px;object-fit:cover;border-radius:8px;margin:8px 0" controls></video>` :
    `<img src="${m.data}" style="width:100%;height:300px;object-fit:cover;border-radius:8px;margin:8px 0">`
  ).join('') : '';
  
  document.getElementById('detail-content').innerHTML = `
    <div class="prop-detail-header">
      <div class="prop-detail-img">
        ${(p.media && p.media.length > 0) 
          ? `<img src="${p.media[0].data}" style="width:100%;height:100%;object-fit:cover">` 
          : p.icon}
      </div>
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
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn-primary" style="flex:1" onclick="openChat(${p.id})">💬 تواصل</button>
          <button class="btn-outline" style="flex:1;padding:9px 14px" onclick="openWhatsApp('${p.phone}')">📱 واتساب</button>
        </div>
      </div>
    </div>
    ${mediaHtml}`;
  openModal('detail-modal');
}

// ==================== ADD PROPERTY ====================
function openAddProp() {
  if (!currentUser) {
    showToast('يرجى تسجيل الدخول أولاً');
    navigate('auth');
    return;
  }
  uploadedMedia = [];
  document.getElementById('media-preview').innerHTML = '';
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
  const rooms = parseInt(document.getElementById('new-rooms').value);
  const baths = parseInt(document.getElementById('new-baths').value);
  const area = parseFloat(document.getElementById('new-area').value);
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
  
  properties.push(newProp);
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
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  updateUserUI();
  updateStats();
  renderFeatured();
});