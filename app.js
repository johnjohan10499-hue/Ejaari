// ========================================
// EJAARI - UPDATED JAVASCRIPT
// All 5 requirements implemented:
// 1. Role selection (مؤجر/مستأجر) on signup
// 2. Password validation on login
// 3. Dashboard visible only to admin@ejaari.local
// 4. Property photo uploaded by owner only, no duplicate lower photo
// 5. Hamburger menu with notification badge + InDrive-style chat
// ========================================

// ==================== GLOBAL VARIABLES ====================
let currentLang = 'ar';
let currentType = 'all';
let selectedIcon = '🏢';
let selectedRole = 'tenant'; // for registration
let contactProp = null;
let mapInstance = null;
let addPropMapInstance = null;
let mapMarkers = [];
let currentUser = JSON.parse(localStorage.getItem('ejaari_user')) || null;
let uploadedMedia = [];
let mapCoordinates = { lat: 30.0444, lng: 31.2357 };
let properties = JSON.parse(localStorage.getItem('ejaari_properties')) || getDefaultProperties();
let messages = JSON.parse(localStorage.getItem('ejaari_messages')) || [];
let notifications = JSON.parse(localStorage.getItem('ejaari_notifications')) || [];
// users store: { email, password, name, type, phone }
let users = JSON.parse(localStorage.getItem('ejaari_users')) || [];

// ==================== DEFAULT PROPERTIES ====================
function getDefaultProperties() {
  return [
    { id:1, title:'شقة فاخرة - حي النرجس', type:'شقة', location:'حي النرجس، القاهرة', price:5500, rooms:3, baths:2, area:120, icon:'🏢', phone:'0501234567', desc:'شقة حديثة وفاخرة بمواقع ممتازة', lat:30.0444, lng:31.2357, media:[], userId:'admin@ejaari.local', createdAt: Date.now()-600000 },
    { id:2, title:'فيلا عصرية مع مسبح', type:'فيلا', location:'حي الملقا، الجيزة', price:18000, rooms:5, baths:4, area:400, icon:'🏡', phone:'0502345678', desc:'فيلا فخمة مع جميع التسهيلات', lat:30.0200, lng:31.2400, media:[], userId:'admin@ejaari.local', createdAt: Date.now()-500000 },
    { id:3, title:'مكتب تجاري - القاهرة الجديدة', type:'مكتب', location:'القاهرة الجديدة', price:12000, rooms:0, baths:2, area:200, icon:'🏢', phone:'0503456789', desc:'مكتب تجاري بموقع استراتيجي', lat:30.0100, lng:31.2300, media:[], userId:'admin@ejaari.local', createdAt: Date.now()-400000 },
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
function saveUsers() {
  localStorage.setItem('ejaari_users', JSON.stringify(users));
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
  // REQ #3: Only admin can access dashboard
  if (page === 'dashboard') {
    if (!currentUser || currentUser.email !== 'admin@ejaari.local') {
      showToast('لوحة التحكم متاحة للمدير فقط');
      navigate('home');
      return;
    }
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const nl = document.getElementById('nav-' + page);
  if (nl) nl.classList.add('active');
  if (page === 'map') setTimeout(initMap, 100);
  if (page === 'dashboard') { renderDashboard(); }
  if (page === 'listings') renderListings(properties);
  if (page === 'home') renderFeatured();
  window.scrollTo(0, 0);
  closeHamburger();
}

// ==================== HAMBURGER MENU ====================
function toggleHamburger() {
  const menu = document.getElementById('hamburger-menu');
  if (!menu) return;
  menu.classList.toggle('open');
}

function closeHamburger() {
  const menu = document.getElementById('hamburger-menu');
  if (menu) menu.classList.remove('open');
}

// Close hamburger on click outside
document.addEventListener('click', function(e) {
  const btn = document.getElementById('hamburger-btn');
  const menu = document.getElementById('hamburger-menu');
  if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove('open');
  }
});

// ==================== AUTHENTICATION ====================
function checkAuth() {
  if (!currentUser) {
    showToast('يرجى تسجيل الدخول أولاً');
    navigate('auth');
    return false;
  }
  return true;
}

// REQ #2: Validate password against stored user record
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('يرجى ملء جميع الحقول');
    return;
  }

  // Admin shortcut (no registration needed for admin)
  if (email === 'admin@ejaari.local') {
    // Admin password defaults to 'admin123' if not registered
    const adminRecord = users.find(u => u.email === 'admin@ejaari.local');
    const adminPass = adminRecord ? adminRecord.password : 'admin123';
    if (password !== adminPass) {
      showToast('❌ كلمة المرور غير صحيحة');
      return;
    }
    currentUser = { email, name: 'المدير', type: 'admin' };
    localStorage.setItem('ejaari_user', JSON.stringify(currentUser));
    showToast('مرحباً أيها المدير ✅');
    updateUserUI();
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    navigate('home');
    return;
  }

  // Find registered user
  const record = users.find(u => u.email === email);
  if (!record) {
    showToast('❌ البريد الإلكتروني غير مسجل، يرجى إنشاء حساب');
    return;
  }
  if (record.password !== password) {
    showToast('❌ كلمة المرور غير صحيحة');
    return;
  }

  currentUser = { email: record.email, name: record.name, type: record.type };
  localStorage.setItem('ejaari_user', JSON.stringify(currentUser));
  showToast('تم تسجيل الدخول بنجاح ✅');
  updateUserUI();
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  navigate('home');
}

// REQ #1: Role selection on signup; REQ #2: Save password
function handleRegister() {
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const phone = document.getElementById('register-phone').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;
  const type = selectedRole; // from role chooser

  if (!name || !email || !password) {
    showToast('يرجى ملء جميع الحقول');
    return;
  }
  if (password !== passwordConfirm) {
    showToast('❌ كلمتا المرور غير متطابقتين');
    return;
  }
  if (password.length < 6) {
    showToast('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    return;
  }
  if (email === 'admin@ejaari.local') {
    showToast('❌ لا يمكن التسجيل بهذا البريد');
    return;
  }
  if (users.find(u => u.email === email)) {
    showToast('❌ هذا البريد مسجل بالفعل');
    return;
  }

  const newUser = { email, name, phone, password, type };
  users.push(newUser);
  saveUsers();

  currentUser = { email, name, type };
  localStorage.setItem('ejaari_user', JSON.stringify(currentUser));
  showToast('تم إنشاء الحساب بنجاح 🎉');
  updateUserUI();

  // Reset form
  document.getElementById('register-name').value = '';
  document.getElementById('register-email').value = '';
  document.getElementById('register-phone').value = '';
  document.getElementById('register-password').value = '';
  document.getElementById('register-password-confirm').value = '';
  selectedRole = 'tenant';
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  const tenantBtn = document.getElementById('role-btn-tenant');
  if (tenantBtn) tenantBtn.classList.add('selected');

  navigate('home');
}

// REQ #1: Role selection button handler
function selectRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById('role-btn-' + role);
  if (btn) btn.classList.add('selected');
}

function authTab(tab, btn) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const loginEl = document.getElementById('auth-login');
  const regEl = document.getElementById('auth-register');
  if (loginEl) loginEl.style.display = tab === 'login' ? 'block' : 'none';
  if (regEl) regEl.style.display = tab === 'register' ? 'block' : 'none';
}

function authTabSwitch(tab) {
  const loginBtn = document.getElementById('tab-login');
  const regBtn = document.getElementById('tab-register');
  if (tab === 'register') {
    if (regBtn) { regBtn.classList.add('active'); loginBtn && loginBtn.classList.remove('active'); }
    document.getElementById('auth-login').style.display = 'none';
    document.getElementById('auth-register').style.display = 'block';
  } else {
    if (loginBtn) { loginBtn.classList.add('active'); regBtn && regBtn.classList.remove('active'); }
    document.getElementById('auth-login').style.display = 'block';
    document.getElementById('auth-register').style.display = 'none';
  }
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
  const hamGuest = document.getElementById('ham-guest-items');
  const hamUser = document.getElementById('ham-user-items');
  const hamDash = document.getElementById('ham-dashboard-btn');
  const navDash = document.getElementById('nav-dashboard');

  if (currentUser) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userSection) userSection.style.display = 'flex';
    const nameEl = document.getElementById('user-name');
    const avatar = document.getElementById('user-avatar');
    const hamAvatar = document.getElementById('ham-avatar');
    const hamUsername = document.getElementById('ham-username');
    const hamRoleLabel = document.getElementById('ham-role-label');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (avatar) avatar.textContent = currentUser.name.charAt(0).toUpperCase();
    if (hamAvatar) hamAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
    if (hamUsername) hamUsername.textContent = currentUser.name;
    if (hamRoleLabel) {
      const roleMap = { admin: 'مدير النظام', landlord: 'مؤجر', tenant: 'مستأجر' };
      hamRoleLabel.textContent = roleMap[currentUser.type] || currentUser.type;
    }
    if (hamGuest) hamGuest.style.display = 'none';
    if (hamUser) hamUser.style.display = 'block';

    // REQ #3: Show dashboard nav/menu only for admin
    const isAdmin = currentUser.email === 'admin@ejaari.local';
    if (hamDash) hamDash.style.display = isAdmin ? 'flex' : 'none';
    if (navDash) navDash.style.display = isAdmin ? 'inline-block' : 'none';
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (userSection) userSection.style.display = 'none';
    if (hamGuest) hamGuest.style.display = 'block';
    if (hamUser) hamUser.style.display = 'none';
    if (hamDash) hamDash.style.display = 'none';
    if (navDash) navDash.style.display = 'none';
  }
  renderAll();
  updateNotifBadge();
}

function toggleProfileMenu() {
  const menu = document.getElementById('profile-menu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// ==================== PROPERTY CARD RENDERING ====================
// REQ #4: Thumbnail from owner-uploaded media only
function getThumbnailHtml(p, size) {
  if (p.media && p.media.length) {
    const m = p.media[0];
    if (!m.isVideo) {
      return `<img src="${m.data}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;display:block">`;
    } else {
      return `<video src="${m.data}" style="width:100%;height:100%;object-fit:cover;display:block" muted></video>`;
    }
  }
  return `<div style="font-size:${size === 0 ? '28px' : '56px'};line-height:1">${p.icon}</div>`;
}

function getStatusBadgeHtml(p) {
  const isRented = p.status === 'rented';
  return `<span class="prop-status-badge ${isRented ? 'rented' : 'available'}">${isRented ? '🔴 تم التأجير' : '🟢 متاح'}</span>`;
}

function togglePropStatus(id, event) {
  if (event) event.stopPropagation();
  if (!currentUser) return;
  const p = properties.find(x => x.id === id);
  if (!p || p.userId !== currentUser.email) return;
  p.status = (p.status === 'rented') ? 'available' : 'rented';
  saveProperties();
  renderAll();
  showToast(p.status === 'rented' ? '🔴 تم التأجير' : '🟢 متاح');
}

function propCard(p) {
  const priceLabel = `${p.price.toLocaleString()} جنيه/شهر`;
  const roomsRow = p.rooms > 0 ? `<div class="prop-meta-item">🛏 ${p.rooms} غرفة</div>` : '';
  const deleteBtn = (currentUser && currentUser.email === 'admin@ejaari.local')
    ? `<button class="btn-sm btn-sm-danger" onclick="removeProperty(${p.id}, event)">حذف</button>` : '';
  const isOwner = currentUser && currentUser.email === p.userId;
  const isRented = p.status === 'rented';

  // Status display: toggle for owner, badge for everyone else
  let statusHtml = '';
  if (isOwner) {
    statusHtml = `<div class="status-toggle-wrap" onclick="event.stopPropagation()" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border2)">
      <label class="status-toggle" title="${isRented ? 'اضغط لتغيير إلى متاح' : 'اضغط لتغيير إلى مؤجَّر'}">
        <input type="checkbox" ${isRented ? 'checked' : ''} onchange="togglePropStatus(${p.id}, event)">
        <span class="status-track"><span class="status-thumb"></span></span>
      </label>
      ${getStatusBadgeHtml(p)}
    </div>`;
  } else {
    statusHtml = `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border2)">${getStatusBadgeHtml(p)}</div>`;
  }

  return `
    <div class="prop-card">
      <div class="prop-img" onclick="openDetail(${p.id})" style="cursor:pointer">
        ${getThumbnailHtml(p, 1)}
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
          ${p.floor ? `<div class="prop-meta-item">🏢 الدور: ${p.floor}</div>` : ''}
        </div>
        ${statusHtml}
        <div class="prop-actions">
          <button class="btn-sm btn-sm-outline" onclick="openChat(${p.id})">💬 دردشة</button>
          <button class="btn-sm btn-sm-primary" onclick="openDetail(${p.id})">التفاصيل</button>
          ${deleteBtn}
        </div>
      </div>
    </div>`;
}

function renderFeatured() {
  const g = document.getElementById('featured-grid');
  if (!g) return;
  const sorted = [...properties].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  g.innerHTML = sorted.slice(0, 3).map(p => propCard(p)).join('') ||
    '<div style="grid-column:1/-1;text-align:center;padding:40px">لا توجد عقارات حالياً</div>';
}

function renderListings(list = properties) {
  const g = document.getElementById('listings-grid');
  if (!g) return;
  const sorted = [...list].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  g.innerHTML = sorted.length ? sorted.map(p => propCard(p)).join('') :
    '<div style="grid-column:1/-1;text-align:center;padding:40px">لا توجد عقارات مطابقة</div>';
}

function renderAll() {
  renderFeatured();
  applyFilters();
  if (currentUser && currentUser.email === 'admin@ejaari.local') renderDashboard();
}

// ==================== DASHBOARD RENDERING (ADMIN ONLY) ====================
function renderDashboard() {
  if (!currentUser || currentUser.email !== 'admin@ejaari.local') return;
  const list = document.getElementById('dash-props-list');
  if (!list) return;
  const userProps = [...properties];
  const welcome = document.getElementById('dash-welcome');
  if (welcome) welcome.textContent = `مرحباً ${currentUser.name}! لوحة تحكم المدير.`;
  const statProps = document.getElementById('stat-props');
  if (statProps) statProps.textContent = userProps.length;
  const statActive = document.getElementById('stat-active');
  if (statActive) statActive.textContent = Math.floor(userProps.length * 0.6);
  // Count actual unread messages for admin
  const adminUnread = notifications.filter(n => n.to === currentUser.email && !n.read).length;
  const statMessages = document.getElementById('stat-messages');
  if (statMessages) statMessages.textContent = adminUnread;
  const revenue = userProps.reduce((sum, p) => sum + p.price, 0);
  const statRevenue = document.getElementById('stat-revenue');
  if (statRevenue) statRevenue.textContent = revenue.toLocaleString();
  const statuses = ['active','active','active','pending','inactive'];
  list.innerHTML = userProps.slice(0, 5).map((p, i) => {
    const s = statuses[i] || 'inactive';
    const sLabel = s === 'active' ? 'مؤجَّر' : s === 'pending' ? 'قيد الانتظار' : 'شاغر';
    return `<div class="dash-prop-row" onclick="openDetail(${p.id})">
      <div class="dash-prop-emoji">${getThumbnailHtml(p, 0)}</div>
      <div class="dash-prop-info">
        <div class="dash-prop-name">${p.title} <span class="status-dot ${s}"></span></div>
        <div class="dash-prop-loc">📍 ${p.location} · ${sLabel}</div>
      </div>
      <div class="dash-prop-price">${p.price.toLocaleString()} ج/شهر</div>
      <button class="btn-sm btn-sm-danger" style="flex:0;padding:6px 10px" onclick="removeProperty(${p.id}, event)">حذف</button>
    </div>`;
  }).join('');

  // Render real inbox from messages
  const dashInbox = document.getElementById('dash-inbox-list');
  if (dashInbox) {
    const adminEmail = currentUser.email;
    const myConvs = [...messages].filter(m => m.to === adminEmail).sort((a,b) => b.ts - a.ts);
    if (myConvs.length) {
      const seen = new Set();
      const unique = myConvs.filter(m => { if (seen.has(m.from)) return false; seen.add(m.from); return true; });
      dashInbox.innerHTML = unique.slice(0,5).map(m => `
        <div class="inbox-item" onclick="openChatByConvId('${m.convId}')">
          <div class="inbox-avatar">👤</div>
          <div style="flex:1">
            <div class="inbox-name">${m.from}</div>
            <div class="inbox-msg">${escapeHtml(m.text)}</div>
            <div class="inbox-time">${timeAgo(m.ts)}</div>
          </div>
          <div class="unread-dot"></div>
        </div>`).join('');
    } else {
      dashInbox.innerHTML = '<div style="padding:16px;color:var(--text3);text-align:center;font-size:13px">لا توجد رسائل بعد</div>';
    }
  }
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h/24)} يوم`;
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

// ==================== MEDIA UPLOAD (Owner only) ====================
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
      if (preview) {
        const thumb = document.createElement('div');
        thumb.className = 'media-thumb';
        const idx = uploadedMedia.length - 1;
        thumb.innerHTML = (isVideo
          ? `<video src="${e.target.result}" style="width:100%;height:100%;object-fit:cover"></video>`
          : `<img src="${e.target.result}">`) +
          `<button class="remove-media" onclick="removeMedia(${idx})">✕</button>`;
        preview.appendChild(thumb);
      }
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
  if (addPropMapInstance) { addPropMapInstance.remove(); addPropMapInstance = null; }
  addPropMapInstance = L.map('add-prop-map').setView([mapCoordinates.lat, mapCoordinates.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(addPropMapInstance);
  addPropMapInstance.on('click', function(e) {
    mapCoordinates = { lat: e.latlng.lat, lng: e.latlng.lng };
    document.getElementById('new-map-lat').value = e.latlng.lat;
    document.getElementById('new-map-lng').value = e.latlng.lng;
    addPropMapInstance.eachLayer(l => { if (l instanceof L.Marker) l.remove(); });
    L.marker([e.latlng.lat, e.latlng.lng]).addTo(addPropMapInstance).bindPopup('الموقع المختار').openPopup();
    showToast('✅ تم تحديد الموقع');
  });
}

function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }
  mapInstance = L.map('map').setView([30.0444, 31.2357], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(mapInstance);
  properties.forEach(prop => {
    if (prop.lat && prop.lng) {
      L.marker([prop.lat, prop.lng]).addTo(mapInstance).bindPopup(`<b>${prop.title}</b><br>${prop.price} جنيه`);
    }
  });
}

// ==================== PROPERTY DETAILS ====================
function openDetail(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  const priceLabel = `${p.price.toLocaleString()} جنيه/شهر`;

  // Amenities tags
  const amenityEmoji = { 'مصعد':'🛗', 'حراسة':'🛡️', 'مفروش':'🛋️', 'بلاط':'🟫', 'تكييف':'❄️' };
  const amenitiesTags = (p.amenities || []).map(f =>
    `<span class="feature-tag">${amenityEmoji[f] || '✨'} ${f}</span>`).join('');
  const metersTags = (p.meters || []).map(m => {
    const e = m === 'عداد كهرباء' ? '⚡' : m === 'عداد مياه' ? '💧' : '🔥';
    return `<span class="feature-tag">${e} ${m}</span>`;
  }).join('');

  // Media gallery
  const mediaGallery = (p.media && p.media.length > 1)
    ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-top:16px">' +
      p.media.slice(1).map(m => m.isVideo
        ? `<video src="${m.data}" controls style="width:100%;height:120px;object-fit:cover;border-radius:10px"></video>`
        : `<img src="${m.data}" style="width:100%;height:120px;object-fit:cover;border-radius:10px">`
      ).join('') + '</div>'
    : '';

  const isOwner = currentUser && currentUser.email === p.userId;
  const isRented = p.status === 'rented';

  let statusSection = '';
  if (isOwner) {
    statusSection = `<div class="status-toggle-wrap" style="margin-bottom:16px">
      <span style="font-size:13px;color:var(--text2)">حالة العقار:</span>
      <label class="status-toggle">
        <input type="checkbox" ${isRented ? 'checked' : ''} onchange="togglePropStatus(${p.id}, event)">
        <span class="status-track"><span class="status-thumb"></span></span>
      </label>
      ${getStatusBadgeHtml(p)}
    </div>`;
  } else {
    statusSection = `<div style="margin-bottom:16px">${getStatusBadgeHtml(p)}</div>`;
  }

  document.getElementById('detail-content').innerHTML = `
    <div class="prop-detail-header">
      <div class="prop-detail-img">${getThumbnailHtml(p, 2)}</div>
      <div class="prop-detail-info">
        <div class="prop-detail-title">${p.title}</div>
        <div class="prop-detail-price">${priceLabel}</div>
        <div class="prop-detail-loc">📍 ${p.location}</div>
        ${statusSection}
        <div class="prop-detail-meta">
          ${p.rooms > 0 ? `<div class="detail-meta-item"><div class="detail-meta-val">${p.rooms}</div><div class="detail-meta-lbl">غرف</div></div>` : ''}
          <div class="detail-meta-item"><div class="detail-meta-val">${p.baths}</div><div class="detail-meta-lbl">حمامات</div></div>
          <div class="detail-meta-item"><div class="detail-meta-val">${p.area}</div><div class="detail-meta-lbl">م²</div></div>
          ${p.floor ? `<div class="detail-meta-item"><div class="detail-meta-val">${p.floor}</div><div class="detail-meta-lbl">الدور</div></div>` : ''}
          ${p.rentalCount !== undefined ? `<div class="detail-meta-item"><div class="detail-meta-val">${p.rentalCount}</div><div class="detail-meta-lbl">مرات التأجير</div></div>` : ''}
        </div>
        <p style="font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:12px">${p.desc}</p>
        ${amenitiesTags ? `<div class="prop-features" style="margin-bottom:10px">${amenitiesTags}</div>` : ''}
        ${metersTags ? `<div class="prop-features">${metersTags}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn-primary" style="flex:1" onclick="openChat(${p.id})">💬 دردشة</button>
          <button class="btn-outline" style="flex:1" onclick="openWhatsApp(${p.id})">📱 واتساب</button>
        </div>
      </div>
    </div>
    ${mediaGallery}`;
  openModal('detail-modal');
}

function openWhatsApp(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  let phone = (p.phone || '').replace(/\D/g,'');
  if (!phone) { showToast('لا يوجد رقم واتساب'); return; }
  if (phone.startsWith('0')) phone = '20' + phone.slice(1);
  window.open(`https://wa.me/${phone}`, '_blank');
}

// ==================== CHAT (InDrive-style, REQ #5) ====================
function openChat(propId) {
  if (!checkAuth()) return;
  const p = properties.find(x => x.id === propId);
  if (!p) return;
  
  // Prevent owner from chatting with themselves
  if (currentUser.email === p.userId) {
    showToast('لا يمكنك الدردشة مع نفسك');
    return;
  }
  
  contactProp = p;
  const owner = p.userId;
  const user = currentUser.email;
  const convId = `prop_${propId}::${owner}::${user}`;

  document.getElementById('chat-prop-title').textContent = p.title;
  document.getElementById('chat-prop-owner').textContent = owner.split('@')[0];
  document.getElementById('chat-input').value = '';
  renderConversationInModal(convId);
  document.getElementById('chat-send-btn').onclick = function() { sendMessage(convId, propId, owner, user); };
  
  // Close detail modal if open
  closeModal('detail-modal');
  openModal('chat-modal');
  scrollChatToBottom();
}

function openChatByConvId(convId) {
  // Parse convId format: prop_ID::owner::user
  const parts = convId.split('::');
  if (parts.length < 3) return;
  const propIdStr = parts[0].replace('prop_', '');
  const propId = parseInt(propIdStr);
  openChat(propId);
}

function renderConversationInModal(convId) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const conv = messages.filter(m => m.convId === convId).sort((a,b) => a.ts - b.ts);
  if (!conv.length) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">ابدأ المحادثة مع المؤجر 👋</div>';
    return;
  }
  container.innerHTML = conv.map(m => {
    const me = currentUser && m.from === currentUser.email;
    return `<div class="chat-msg ${me ? 'me' : 'them'}">
      <div>${escapeHtml(m.text)}</div>
      <div class="chat-msg-ts">${timeAgo(m.ts)}</div>
    </div>`;
  }).join('');
  scrollChatToBottom();
}

function scrollChatToBottom() {
  setTimeout(() => {
    const c = document.getElementById('chat-messages');
    if (c) c.scrollTop = c.scrollHeight;
  }, 50);
}

function sendMessage(convId, propId, owner, user) {
  const input = document.getElementById('chat-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const from = currentUser.email;
  const to = (from === owner) ? user : owner;
  const msg = { convId, propId, from, to, text, ts: Date.now() };
  messages.push(msg);
  saveMessages();

  // REQ #5: Notification to recipient — "someone is trying to reach you"
  const propObj = properties.find(x => x.id === propId);
  const propTitle = propObj ? propObj.title : '';
  const notif = {
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    to,
    text: `📨 ${from.split('@')[0]} يحاول التواصل معك بشأن "${propTitle}"`,
    read: false,
    ts: Date.now(),
    convId,
    propId
  };
  notifications.push(notif);
  saveNotifications();
  updateNotifBadge();

  renderConversationInModal(convId);
  if (input) input.value = '';
  showToast('✅ تم إرسال الرسالة');
}

// ==================== NOTIFICATIONS UI (REQ #5) ====================
function updateNotifBadge() {
  if (!currentUser) {
    const nb = document.getElementById('notif-badge');
    const hc = document.getElementById('ham-notif-count');
    if (nb) { nb.textContent = ''; nb.classList.remove('visible'); }
    if (hc) hc.style.display = 'none';
    return;
  }
  const unread = notifications.filter(n => n.to === currentUser.email && !n.read).length;
  const nb = document.getElementById('notif-badge');
  const hc = document.getElementById('ham-notif-count');
  if (nb) {
    if (unread > 0) { nb.textContent = unread > 9 ? '9+' : unread; nb.classList.add('visible'); }
    else { nb.textContent = ''; nb.classList.remove('visible'); }
  }
  if (hc) {
    if (unread > 0) { hc.textContent = unread; hc.style.display = 'inline-block'; }
    else { hc.style.display = 'none'; }
  }
}

function openNotifications() {
  if (!checkAuth()) return;
  const list = document.getElementById('notif-list');
  if (!list) return;
  const myNotifs = notifications.filter(n => n.to === currentUser.email).sort((a,b) => b.ts - a.ts);
  if (!myNotifs.length) {
    list.innerHTML = '<div class="notif-empty">🔔<br>لا توجد إشعارات</div>';
  } else {
    list.innerHTML = myNotifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="openNotifAction('${n.id}')">
        <div class="notif-dot ${n.read ? 'read' : ''}"></div>
        <div>
          <div class="notif-item-text">${n.text}</div>
          <div class="notif-item-time">${timeAgo(n.ts)}</div>
        </div>
      </div>`).join('');
  }
  openModal('notif-modal');
}

function openNotifAction(id) {
  const n = notifications.find(x => x.id === id);
  if (!n) return;
  n.read = true;
  saveNotifications();
  updateNotifBadge();
  openNotifications(); // refresh
  // If notification has a linked conversation, open chat
  if (n.convId && n.propId) {
    closeModal('notif-modal');
    setTimeout(() => openChat(n.propId), 200);
  }
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

function toggleOtherFeature(cb) {
  const box = document.getElementById('other-feature-box');
  if (box) box.style.display = cb.checked ? 'block' : 'none';
  if (!cb.checked) {
    const inp = document.getElementById('new-other-feature');
    if (inp) inp.value = '';
  }
}

function addProperty() {
  if (!currentUser) { showToast('يرجى تسجيل الدخول'); return; }
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
  const floor = document.getElementById('new-floor').value;
  const rentalCount = parseInt(document.getElementById('new-rental-count').value) || 0;

  if (!title || !location || !price || isNaN(price)) { showToast('يرجى ملء الحقول المطلوبة'); return; }

  // Collect amenities
  const amenities = [];
  if (document.getElementById('feat-elevator').checked) amenities.push('مصعد');
  if (document.getElementById('feat-security').checked) amenities.push('حراسة');
  if (document.getElementById('feat-furnished').checked) amenities.push('مفروش');
  if (document.getElementById('feat-tiles').checked) amenities.push('بلاط');
  if (document.getElementById('feat-ac').checked) amenities.push('تكييف');
  if (document.getElementById('feat-other').checked) {
    const otherVal = (document.getElementById('new-other-feature').value || '').trim();
    if (otherVal) amenities.push(otherVal);
  }

  // Collect meters
  const meters = [];
  if (document.getElementById('meter-electric').checked) meters.push('عداد كهرباء');
  if (document.getElementById('meter-water').checked) meters.push('عداد مياه');
  if (document.getElementById('meter-gas').checked) meters.push('عداد غاز');

  const newProp = {
    id: Math.max(...properties.map(p => p.id), 0) + 1,
    title, type, location, price, rooms, baths, area,
    icon: selectedIcon, phone, desc,
    userId: currentUser.email,
    createdAt: Date.now(),
    lat, lng,
    media: uploadedMedia,
    floor,
    rentalCount,
    amenities,
    meters,
    status: 'available' // default status: متاح
  };

  properties.unshift(newProp);
  saveProperties();
  showToast('✅ تم إضافة العقار بنجاح');
  closeModal('add-prop-modal');
  uploadedMedia = [];
  // Reset form fields
  ['new-title','new-location','new-price','new-desc','new-rental-count','new-other-feature'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['feat-elevator','feat-security','feat-furnished','feat-tiles','feat-ac','feat-other',
   'meter-electric','meter-water','meter-gas'].forEach(id => {
    const el = document.getElementById(id); if (el) el.checked = false;
  });
  const ob = document.getElementById('other-feature-box');
  if (ob) ob.style.display = 'none';
  renderAll();
}

// ==================== REMOVE PROPERTY (ADMIN ONLY) ====================
function removeProperty(id, event) {
  if (event) event.stopPropagation();
  if (!currentUser || currentUser.email !== 'admin@ejaari.local') { showToast('غير مصرح'); return; }
  if (!confirm('هل أنت متأكد من حذف هذا العقار؟')) return;
  properties = properties.filter(p => p.id !== id);
  saveProperties();
  showToast('تم حذف العقار');
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

// Close modal on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    e.target.style.display = 'none';
  }
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) { alert(msg); return; }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function(m) {
    return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[m];
  });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  updateUserUI();
  updateStats();
  renderFeatured();

  // Ensure admin nav hidden on load if not admin
  const navDash = document.getElementById('nav-dashboard');
  if (navDash && (!currentUser || currentUser.email !== 'admin@ejaari.local')) {
    navDash.style.display = 'none';
  }
});
