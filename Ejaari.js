// ========================================
// EJAARI - COMPLETE JAVASCRIPT FILE
// Updated: Photo display, auto-listing, admin remove, WhatsApp, in-site chat & notifications
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

// Chat & Notifications State
let currentChatPropId = null;
let currentChatWith = null;

// Website owner email (hardcoded for admin privileges)
// To log in as admin: use email admin@ejaari.com with any password
const WEBSITE_OWNER_EMAIL = 'admin@ejaari.com';

// ==================== DEFAULT PROPERTIES ====================
function getDefaultProperties() {
  return [
    { id:1, title:'شقة فاخرة - حي النرجس', type:'شقة', location:'حي النرجس، القاهرة', price:5500, rooms:3, baths:2, area:120, icon:'🏢', phone:'201001234567', desc:'شقة حديثة وفاخرة بمواقع ممتازة', lat:30.0444, lng:31.2357, media:[], createdAt: Date.now()-5000, userId:'landlord1@ejaari.com' },
    { id:2, title:'فيلا عصرية مع مسبح', type:'فيلا', location:'حي الملقا، الجيزة', price:18000, rooms:5, baths:4, area:400, icon:'🏡', phone:'201002345678', desc:'فيلا فخمة مع جميع التسهيلات', lat:30.0200, lng:31.2400, media:[], createdAt: Date.now()-10000, userId:'landlord2@ejaari.com' },
    { id:3, title:'مكتب تجاري - القاهرة الجديدة', type:'مكتب', location:'القاهرة الجديدة', price:12000, rooms:0, baths:2, area:200, icon:'🏢', phone:'201003456789', desc:'مكتب تجاري بموقع استراتيجي', lat:30.0100, lng:31.2300, media:[], createdAt: Date.now()-15000, userId:'landlord3@ejaari.com' },
    { id:4, title:'شقة مفروشة - حي السليمانية', type:'شقة', location:'حي السليمانية، الإسكندرية', price:4200, rooms:2, baths:1, area:90, icon:'🏠', phone:'201004567890', desc:'شقة صغيرة مفروشة بالكامل', lat:31.2156, lng:29.9500, media:[], createdAt: Date.now()-20000, userId:'landlord4@ejaari.com' },
    { id:5, title:'محل تجاري - شارع النيل', type:'محل', location:'شارع النيل، الجيزة', price:8500, rooms:0, baths:1, area:80, icon:'🏪', phone:'201005678901', desc:'محل تجاري في موقع حيوي', lat:30.0150, lng:31.2350, media:[], createdAt: Date.now()-25000, userId:'landlord5@ejaari.com' },
    { id:6, title:'فيلا مع ملحق - الهرم', type:'فيلا', location:'حي الهرم، الجيزة', price:14000, rooms:4, baths:3, area:350, icon:'🏡', phone:'201006789012', desc:'فيلا برقبة بطن البقرة', lat:30.0080, lng:31.2320, media:[], createdAt: Date.now()-30000, userId:'landlord6@ejaari.com' },
  ];
}

// ==================== STORAGE FUNCTIONS ====================
function saveProperties() {
  localStorage.setItem('ejaari_properties', JSON.stringify(properties));
  updateStats();
}

function saveChats() {
  const chats = JSON.parse(localStorage.getItem('ejaari_chats')) || {};
  // chats saved per call, no global variable needed
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
  if (page === 'listings') renderListings(properties);
  if (page === 'home') renderFeatured();
  if (page === 'notifications') { if (checkAuth()) renderNotificationsPage(); }
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

function isWebsiteOwner() {
  return currentUser && currentUser.email === WEBSITE_OWNER_EMAIL;
}

function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (email && password) {
    const users = JSON.parse(localStorage.getItem('ejaari_users')) || [];
    const stored = users.find(u => u.email === email);
    const type = email === WEBSITE_OWNER_EMAIL ? 'admin' : (stored ? stored.type : 'landlord');
    const name = stored ? stored.name : (email === WEBSITE_OWNER_EMAIL ? 'مدير الموقع' : email.split('@')[0]);
    const phone = stored ? stored.phone : '';

    currentUser = { email, name, type, phone };
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
  const phone = document.getElementById('register-phone').value;
  const type = document.getElementById('register-type').value;
  if (name && email) {
    currentUser = { email, name, type, phone };
    localStorage.setItem('ejaari_user', JSON.stringify(currentUser));
    const users = JSON.parse(localStorage.getItem('ejaari_users')) || [];
    if (!users.find(u => u.email === email)) users.push(currentUser);
    localStorage.setItem('ejaari_users', JSON.stringify(users));
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
  const notifBtn = document.getElementById('notif-btn');
  if (currentUser) {
    loginBtn.style.display = 'none';
    userSection.style.display = 'block';
    if (notifBtn) notifBtn.style.display = 'flex';
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    updateNotifBadge();
  } else {
    loginBtn.style.display = 'block';
    userSection.style.display = 'none';
    if (notifBtn) notifBtn.style.display = 'none';
  }
}

function toggleProfileMenu() {
  const menu = document.getElementById('profile-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// ==================== PROPERTY IMAGE DISPLAY ====================
function getPropImageHtml(p, height) {
  if (p.media && p.media.length > 0 && !p.media[0].isVideo) {
    return <img src="${p.media[0].data}" style="width:100%;height:${height};object-fit:cover;display:block;border-radius:0" alt="${p.title}">;
  } else if (p.media && p.media.length > 0 && p.media[0].isVideo) {
    return <video src="${p.media[0].data}" style="width:100%;height:${height};object-fit:cover;display:block" muted></video>;
  } else {
    return <span style="font-size:64px">${p.icon}</span>;
  }
}

// ==================== PROPERTY CARD RENDERING ====================
function propCard(p) {
  const priceLabel = ${p.price.toLocaleString()} جنيه/شهر;
  const roomsRow = p.rooms > 0 ? <div class="prop-meta-item">🛏️ ${p.rooms} غرفة</div> : '';
  const adminRemoveBtn = isWebsiteOwner()
    ? <button class="btn-sm btn-sm-danger" onclick="event.stopPropagation();removeProperty(${p.id})">🗑️ حذف</button>
    : '';

  return `
    <div class="prop-card" id="prop-card-${p.id}">
      <div class="prop-img" onclick="openDetail(${p.id})" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${getPropImageHtml(p, '200px')}
        <div class="prop-img-overlay"></div>
        <div class="prop-badge">${p.type}</div>
        <div class="prop-price">${priceLabel}</div>
      </div>
      <div class="prop-body">
        <div class="prop-title" onclick="openDetail(${p.id})" style="cursor:pointer">${p.title}</div>
        <div class="prop-location">📍 ${p.location}</div>
        <div class="prop-meta">
          ${roomsRow}
          <div class="prop-meta-item">🚿 ${p.baths}</div>
          <div class="prop-meta-item">📐 ${p.area} م²</div>
        </div>
        <div class="prop-actions">
          ${adminRemoveBtn}
          <button class="btn-sm btn-sm-whatsapp" onclick="openWhatsApp(${p.id})">💬 واتساب</button>
          <button class="btn-sm btn-sm-outline" onclick="openChat(${p.id})">🗨️ محادثة</button>
          <button class="btn-sm btn-sm-primary" onclick="openDetail(${p.id})">التفاصيل</button>
        </div>
      </div>
    </div>`;
}

function renderFeatured() {
  const g = document.getElementById('featured-grid');
  if (!g) return;
  // Sort by createdAt descending - show most recently added
  const sorted = [...properties].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const featured = sorted.slice(0, 3);
  g.innerHTML = featured.length
    ? featured.map(p => propCard(p)).join('')
    : '<div style="grid-column:1/-1;text-align:center;padding:40px">لا توجد عقارات حالياً</div>';
}

function renderListings(list) {
  if (!list) list = properties;
  const g = document.getElementById('listings-grid');
  if (!g) return;
  g.innerHTML = list.length
    ? list.map(p => propCard(p)).join('')
    : '<div style="grid-column:1/-1;text-align:center;padding:40px">لا توجد عقارات مطابقة</div>';
}

function renderAll() {
  renderFeatured();
  applyFilters();
  renderDashboard();
}

// ==================== ADMIN REMOVE PROPERTY ====================
function removeProperty(id) {
  if (!isWebsiteOwner()) {
    showToast('غير مصرح لك بهذا الإجراء');
    return;
  }
  if (!confirm('هل أنت متأكد من حذف هذا العقار؟')) return;
  properties = properties.filter(p => p.id !== id);
  saveProperties();
  showToast('✅ تم حذف العقار بنجاح');
  renderAll();
}

// ==================== DASHBOARD RENDERING ====================
function renderDashboard() {
  if (!currentUser) return;
  const list = document.getElementById('dash-props-list');
  if (!list) return;
  const userProps = isWebsiteOwner()
    ? properties
    : properties.filter(p => p.userId === currentUser.email);
  const statuses = ['active','active','active','pending','inactive'];
  document.getElementById('dash-welcome').textContent = مرحباً ${currentUser.name}! هذا ملخص عقاراتك.;
  document.getElementById('stat-props').textContent = userProps.length;
  document.getElementById('stat-active').textContent = Math.floor(userProps.length * 0.6);
  document.getElementById('stat-messages').textContent = getUnreadCount();
  const revenue = userProps.reduce((sum, p) => sum + p.price, 0);
  document.getElementById('stat-revenue').textContent = revenue.toLocaleString();

  list.innerHTML = userProps.slice(0, 5).map((p, i) => {
    const s = statuses[i] || 'inactive';
    const sLabel = s === 'active' ? 'مؤجَّر' : s === 'pending' ? 'قيد الانتظار' : 'شاغر';
    const thumbHtml = p.media && p.media.length > 0 && !p.media[0].isVideo
      ? <img src="${p.media[0].data}" style="width:44px;height:44px;object-fit:cover;border-radius:10px">
      : p.icon;
    const removeBtn = isWebsiteOwner()
      ? <button class="btn-sm btn-sm-danger" style="width:auto;padding:5px 10px;font-size:11px;flex-shrink:0" onclick="event.stopPropagation();removeProperty(${p.id})">🗑️</button>
      : '';
    return `<div class="dash-prop-row" onclick="openDetail(${p.id})">
      <div class="dash-prop-emoji" style="overflow:hidden;border-radius:10px">${thumbHtml}</div>
      <div class="dash-prop-info">
        <div class="dash-prop-name">${p.title} <span class="status-dot ${s}"></span></div>
        <div class="dash-prop-loc">📍 ${p.location} · ${sLabel}</div>
      </div>
      <div class="dash-prop-price">${p.price.toLocaleString()} جنيه</div>
      ${removeBtn}
    </div>`;
  }).join('');

  renderDashboardInbox();
}

function renderDashboardInbox() {
  const inbox = document.getElementById('dash-inbox');
  if (!inbox || !currentUser) return;
  const convos = getMyConversations();
  if (convos.length === 0) {
    inbox.innerHTML = '<div style="text-align:center;color:var(--text3);padding:20px;font-size:13px">لا توجد رسائل بعد</div>';
    return;
  }
  inbox.innerHTML = convos.slice(0, 5).map(c => {
    const lastMsg = c.messages[c.messages.length - 1];
    const isUnread = lastMsg && lastMsg.sender !== currentUser.email && !lastMsg.read;
    const prop = properties.find(p => p.id === c.propId);
    return `<div class="inbox-item" onclick="openChat(${c.propId}, '${c.otherUser}')">
      <div class="inbox-avatar">👤</div>
      <div style="flex:1;min-width:0">
        <div class="inbox-name">${c.otherUserName}</div>
        <div class="inbox-msg">${prop ? prop.title : 'عقار'}: ${lastMsg ? lastMsg.text : ''}</div>
        <div class="inbox-time">${lastMsg ? timeAgo(lastMsg.time) : ''}</div>
      </div>
      ${isUnread ? '<div class="unread-dot"></div>' : ''}
    </div>`;
  }).join('');
}

function getMyConversations() {
  if (!currentUser) return [];
  const chatsData = JSON.parse(localStorage.getItem('ejaari_chats')) || {};
  const convos = [];
  for (const key in chatsData) {
    const parts = key.split('::');
    if (parts.length < 3) continue;
    const propId = parseInt(parts[0]);
    const user1 = parts[1];
    const user2 = parts[2];
    if (user1 === currentUser.email || user2 === currentUser.email) {
      const otherUser = user1 === currentUser.email ? user2 : user1;
      const users = JSON.parse(localStorage.getItem('ejaari_users')) || [];
      const otherUserObj = users.find(u => u.email === otherUser);
      convos.push({
        key, propId, otherUser,
        otherUserName: otherUserObj ? otherUserObj.name : otherUser.split('@')[0],
        messages: chatsData[key] || []
      });
    }
  }
  return convos.sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1];
    const bLast = b.messages[b.messages.length - 1];
    return (bLast ? bLast.time : 0) - (aLast ? aLast.time : 0);
  });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'الآن';
  if (diff < 3600000) return منذ ${Math.floor(diff/60000)} دقيقة;
  if (diff < 86400000) return منذ ${Math.floor(diff/3600000)} ساعة;
  return منذ ${Math.floor(diff/86400000)} يوم;
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
  
  if (location) list = list.filter(p => p.location.toLowerCase().includes(location) || p.title.toLowerCase().includes(location));
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

function liveSearch(q) {}

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
          ${isVideo ? <video src="${e.target.result}" style="width:100%;height:100%;object-fit:cover"></video> : <img src="${e.target.result}">}
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
      ${m.isVideo ? <video src="${m.data}" style="width:100%;height:100%;object-fit:cover"></video> : <img src="${m.data}">}
      <button class="remove-media" onclick="removeMedia(${i})">✕</button>
    </div>`).join('');
}

// ==================== MAP FUNCTIONS ====================
function initAddPropMap() {
  const mapElement = document.getElementById('add-prop-map');
  if (!mapElement) return;
  if (addPropMapInstance) addPropMapInstance.remove();
  
  addPropMapInstance = L.map('add-prop-map').setView([mapCoordinates.lat, mapCoordinates.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19
  }).addTo(addPropMapInstance);
  
  addPropMapInstance.on('click', function(e) {
    mapCoordinates = { lat: e.latlng.lat, lng: e.latlng.lng };
    document.getElementById('new-map-lat').value = e.latlng.lat;
    document.getElementById('new-map-lng').value = e.latlng.lng;
    document.getElementById('add-prop-map').innerHTML = '';
    initAddPropMap();
    L.marker([e.latlng.lat, e.latlng.lng]).addTo(addPropMapInstance).bindPopup('الموقع المختار');
    showToast('✅ تم تحديد الموقع بنجاح');
  });
}

function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;
  if (mapInstance) mapInstance.remove();
  
  mapInstance = L.map('map').setView([30.0444, 31.2357], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19
  }).addTo(mapInstance);
  
  properties.forEach(prop => {
    if (prop.lat && prop.lng) {
      L.marker([prop.lat, prop.lng]).addTo(mapInstance)
        .bindPopup(<b>${prop.title}</b><br>${prop.price} جنيه);
    }
  });
}

// ==================== PROPERTY DETAILS ====================
function openDetail(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  const priceLabel = ${p.price.toLocaleString()} جنيه/شهر;
  const featuresTags = (p.features || []).map(f => <span class="feature-tag">✓ ${f}</span>).join('');

  let mediaGallery = '';
  if (p.media && p.media.length > 0) {
    mediaGallery = <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-top:16px"> +
      p.media.map(m => m.isVideo
        ? <video src="${m.data}" style="width:100%;height:160px;object-fit:cover;border-radius:10px" controls></video>
        : <img src="${m.data}" style="width:100%;height:160px;object-fit:cover;border-radius:10px">
      ).join('') + </div>;
  }

  const heroImg = p.media && p.media.length > 0 && !p.media[0].isVideo
    ? <img src="${p.media[0].data}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius)">
    : <span style="font-size:96px">${p.icon}</span>;

  const adminRemove = isWebsiteOwner()
    ? <button class="btn-outline" style="border-color:var(--red);color:var(--red);margin-top:10px;width:100%" onclick="removeProperty(${p.id});closeModal('detail-modal')">🗑️ حذف العقار (مدير الموقع)</button>
    : '';

  document.getElementById('detail-content').innerHTML = `
    <div class="prop-detail-header">
      <div class="prop-detail-img" style="overflow:hidden">${heroImg}</div>
      <div class="prop-detail-info">
        <div class="prop-detail-title">${p.title}</div>
        <div class="prop-detail-price">${priceLabel}</div>
        <div class="prop-detail-loc">📍 ${p.location}</div>
        <div class="prop-detail-meta">
          ${p.rooms > 0 ? <div class="detail-meta-item"><div class="detail-meta-val">${p.rooms}</div><div class="detail-meta-lbl">غرف</div></div> : ''}
          <div class="detail-meta-item"><div class="detail-meta-val">${p.baths}</div><div class="detail-meta-lbl">حمامات</div></div>
          <div class="detail-meta-item"><div class="detail-meta-val">${p.area}</div><div class="detail-meta-lbl">م²</div></div>
        </div>
        <p style="font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:16px">${p.desc}</p>
        <div class="prop-features">${featuresTags}</div>
        <button class="btn-sm btn-sm-whatsapp" style="width:100%;padding:12px;margin-top:16px;border-radius:10px;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="openWhatsApp(${p.id})">💬 تواصل عبر واتساب</button>
        <button class="btn-primary" style="margin-top:10px;width:100%" onclick="closeModal('detail-modal');openChat(${p.id})">🗨️ محادثة داخل الموقع</button>
        ${adminRemove}
      </div>
    </div>
    ${mediaGallery}`;
  openModal('detail-modal');
}

// ==================== WHATSAPP CONTACT ====================
function openWhatsApp(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  if (!p.phone) {
    showToast('رقم الواتساب غير متوفر لهذا العقار');
    return;
  }
  let phone = p.phone.replace(/[\s\+\-\(\)]/g, '');
  if (phone.startsWith('0')) phone = '20' + phone.substring(1);
  const msg = encodeURIComponent(مرحباً، أنا مهتم بالعقار: ${p.title} - ${p.location} - السعر: ${p.price.toLocaleString()} جنيه/شهر);
  window.open(https://wa.me/${phone}?text=${msg}, '_blank');
}

// ==================== IN-SITE CHAT ====================
function getChatKey(propId, user1, user2) {
  const sorted = [user1, user2].sort();
  return ${propId}::${sorted[0]}::${sorted[1]};
}

function openChat(propId, withUser) {
  if (!currentUser) {
    showToast('يرجى تسجيل الدخول للمحادثة');
    navigate('auth');
    return;
  }
  const p = properties.find(x => x.id === propId);
  if (!p) { showToast('العقار غير موجود'); return; }

  if (!withUser) {
    if (p.userId === currentUser.email) {
      showToast('هذا عقارك! لا يمكنك مراسلة نفسك');
      return;
    }
    withUser = p.userId || 'landlord@ejaari.com';
  }

  currentChatPropId = propId;
  currentChatWith = withUser;

  const users = JSON.parse(localStorage.getItem('ejaari_users')) || [];
  const otherUserObj = users.find(u => u.email === withUser);
  const otherName = otherUserObj ? otherUserObj.name : withUser.split('@')[0];

  const chatKey = getChatKey(propId, currentUser.email, withUser);
  const chatsData = JSON.parse(localStorage.getItem('ejaari_chats')) || {};
  const messages = chatsData[chatKey] || [];

  // Mark as read
  if (chatsData[chatKey]) {
    chatsData[chatKey] = chatsData[chatKey].map(m => ({ ...m, read: true }));
    localStorage.setItem('ejaari_chats', JSON.stringify(chatsData));
    updateNotifBadge();
  }

  document.getElementById('chat-modal-title').textContent = محادثة — ${p.title};
  document.getElementById('chat-modal-subtitle').textContent = مع: ${otherName};
  renderChatMessages(messages);
  openModal('chat-modal');
  setTimeout(() => {
    const box = document.getElementById('chat-messages');
    if (box) box.scrollTop = box.scrollHeight;
    document.getElementById('chat-input')?.focus();
  }, 150);
}

function renderChatMessages(messages) {
  const box = document.getElementById('chat-messages');
  if (!box || !currentUser) return;
  if (messages.length === 0) {
    box.innerHTML = '<div style="text-align:center;color:var(--text3);padding:40px;font-size:13px">ابدأ المحادثة الآن 👋</div>';
    return;
  }
  box.innerHTML = messages.map(m => {
    const isMine = m.sender === currentUser.email;
    return `<div class="chat-msg ${isMine ? 'mine' : 'theirs'}">
      <div class="chat-bubble">${m.text}</div>
      <div class="chat-time">${timeAgo(m.time)}</div>
    </div>`;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

function sendChatMessage() {
  if (!currentUser || !currentChatPropId || !currentChatWith) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const chatKey = getChatKey(currentChatPropId, currentUser.email, currentChatWith);
  const chatsData = JSON.parse(localStorage.getItem('ejaari_chats')) || {};
  if (!chatsData[chatKey]) chatsData[chatKey] = [];

  const msg = { sender: currentUser.email, senderName: currentUser.name, text, time: Date.now(), read: false };
  chatsData[chatKey].push(msg);
  localStorage.setItem('ejaari_chats', JSON.stringify(chatsData));
  input.value = '';

  // Send notification to recipient
  addNotification(currentChatWith, {
    type: 'message',
    from: currentUser.email,
    fromName: currentUser.name,
    propId: currentChatPropId,
    text
  });

  renderChatMessages(chatsData[chatKey]);
}

// ==================== NOTIFICATIONS ====================
function addNotification(toUser, notifData) {
  const all = JSON.parse(localStorage.getItem('ejaari_notifications')) || {};
  if (!all[toUser]) all[toUser] = [];
  all[toUser].unshift({ ...notifData, id: Date.now() + Math.random(), time: Date.now(), read: false });
  localStorage.setItem('ejaari_notifications', JSON.stringify(all));
  updateNotifBadge();
}

function getMyNotifications() {
  if (!currentUser) return [];
  const all = JSON.parse(localStorage.getItem('ejaari_notifications')) || {};
  return all[currentUser.email] || [];
}

function getUnreadCount() {
  return getMyNotifications().filter(n => !n.read).length;
}

function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const count = getUnreadCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function renderNotificationsPage() {
  if (!currentUser) return;
  const container = document.getElementById('notif-list');
  if (!container) return;
  const notifs = getMyNotifications();

  // Mark all as read
  const all = JSON.parse(localStorage.getItem('ejaari_notifications')) || {};
  if (all[currentUser.email]) {
    all[currentUser.email] = all[currentUser.email].map(n => ({ ...n, read: true }));
    localStorage.setItem('ejaari_notifications', JSON.stringify(all));
  }
  updateNotifBadge();

  if (notifs.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:80px 24px;color:var(--text3)">
      <div style="font-size:56px;margin-bottom:16px">🔔</div>
      <div style="font-size:16px;font-weight:700;color:var(--text2);margin-bottom:8px">لا توجد إشعارات حتى الآن</div>
      <div style="font-size:13px">ستصلك إشعارات عند وجود رسائل جديدة</div>
    </div>`;
    return;
  }

  container.innerHTML = notifs.map(n => {
    const prop = properties.find(p => p.id === n.propId);
    return `<div class="notif-item ${n.read ? '' : 'unread'}" onclick="openChat(${n.propId}, '${n.from}')">
      <div class="notif-icon">💬</div>
      <div class="notif-body">
        <div class="notif-title">${n.fromName} أرسل رسالة جديدة</div>
        <div class="notif-msg">"${n.text}"</div>
        <div class="notif-prop">📍 ${prop ? prop.title : 'عقار'}</div>
        <div class="notif-time">${timeAgo(n.time)}</div>
      </div>
      ${!n.read ? '<div class="unread-dot"></div>' : ''}
    </div>`;
  }).join('');
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
  if (!currentUser) { showToast('يرجى تسجيل الدخول'); return; }
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
    media: [...uploadedMedia]
  };
  
  // Unshift so it appears first (most recent)
  properties.unshift(newProp);
  saveProperties();
  showToast('✅ تم إضافة العقار — ظهر في الرئيسية والعقارات!');
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
  if (modal) { modal.classList.add('open'); modal.style.display = 'flex'; }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  updateUserUI();
  updateStats();
  renderFeatured();
  updateNotifBadge();

  // Chat input Enter key
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        overlay.style.display = 'none';
      }
    });
  });
});