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
  updateContactSection();
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

function propCard(p) {
  const priceLabel = `${p.price.toLocaleString()} جنيه/شهر`;
  const roomsRow = p.rooms > 0 ? `<div class="prop-meta-item">🛏 ${p.rooms} غرفة</div>` : '';
  const floorRow = (p.floor !== undefined && p.floor !== null && p.floor !== '')
    ? `<div class="prop-meta-item">🏗️ ${p.floor == 0 ? 'أرضي' : 'دور ' + p.floor}</div>` : '';
  const deleteBtn = (currentUser && currentUser.email === 'admin@ejaari.local')
    ? `<button class="btn-sm btn-sm-danger" onclick="removeProperty(${p.id}, event)">حذف</button>` : '';

  // Status badge — always visible
  const isRented = p.status === 'rented';
  const statusBadge = `<span class="status-badge ${isRented ? 'rented' : 'available'}">
    <span class="dot"></span>${isRented ? 'تم التأجير' : 'متاح'}
  </span>`;

  // Status toggle — only for the property owner
  const isOwner = currentUser && currentUser.email === p.userId;
  const toggleHtml = isOwner ? `
    <label class="toggle-switch" title="تغيير الحالة" onclick="event.stopPropagation()">
      <input type="checkbox" ${isRented ? 'checked' : ''} onchange="toggleStatus(${p.id}, this)">
      <span class="toggle-track"></span>
    </label>
    <span class="toggle-label">${isRented ? 'تأجير' : 'متاح'}</span>
  ` : '';

  return `
    <div class="prop-card">
      <div class="prop-img" onclick="openDetail(${p.id})" style="cursor:pointer">
        ${getThumbnailHtml(p, 1)}
        <div class="prop-img-overlay"></div>
        <div class="prop-badge">${p.type}</div>
        <div class="prop-price">${priceLabel}</div>
      </div>
      <div class="prop-body">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div class="prop-title" onclick="openDetail(${p.id})" style="cursor:pointer">${p.title}</div>
          ${statusBadge}
        </div>
        <div class="prop-location">📍 ${p.location}</div>
        <div class="prop-meta">
          ${roomsRow}
          ${floorRow}
          <div class="prop-meta-item">🚿 ${p.baths}</div>
          <div class="prop-meta-item">📐 ${p.area} م²</div>
        </div>
        ${isOwner ? `<div class="status-toggle-wrap">${toggleHtml}</div>` : ''}
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

  // Render real inbox from messages (property chats + contact messages)
  const dashInbox = document.getElementById('dash-inbox-list');
  if (dashInbox) {
    const adminEmail = currentUser.email;
    const myMsgs = [...messages].filter(m => m.to === adminEmail).sort((a,b) => b.ts - a.ts);
    if (myMsgs.length) {
      const seen = new Set();
      const unique = myMsgs.filter(m => { if (seen.has(m.convId)) return false; seen.add(m.convId); return true; });
      dashInbox.innerHTML = unique.slice(0,8).map(m => {
        const isContact = m.isContact;
        const label = isContact ? `📬 ${m.from}` : m.from;
        const preview = escapeHtml(m.text).slice(0, 60) + (m.text.length > 60 ? '...' : '');
        const clickFn = isContact
          ? `openAdminMsgThread('${m.convId}','${m.from}','${m.from}')`
          : `openChatByConvId('${m.convId}')`;
        return `
        <div class="inbox-item" onclick="${clickFn}">
          <div class="inbox-avatar">${isContact ? '📬' : '👤'}</div>
          <div style="flex:1">
            <div class="inbox-name">${label}</div>
            <div class="inbox-msg">${preview}</div>
            <div class="inbox-time">${timeAgo(m.ts)}</div>
          </div>
          <div class="unread-dot"></div>
        </div>`;
      }).join('');
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
// REQ #4: Only show owner-uploaded media in detail, no duplicate lower image
function openDetail(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  const priceLabel = `${p.price.toLocaleString()} جنيه/شهر`;

  // Status
  const isRented = p.status === 'rented';
  const statusBadge = `<span class="status-badge ${isRented ? 'rented' : 'available'}" style="font-size:14px;padding:6px 16px">
    <span class="dot"></span>${isRented ? 'تم التأجير' : 'متاح للإيجار'}
  </span>`;

  // Amenities (combined: features + amenities + utilities)
  const allTags = [
    ...(p.amenities || []),
    ...(p.utilities || []),
    ...(p.features || [])
  ];
  const featuresTags = allTags.map(f => `<span class="feature-tag">✓ ${f}</span>`).join('');

  // Floor & rental count meta
  const floorItem = (p.floor !== undefined && p.floor !== null && p.floor !== '')
    ? `<div class="detail-meta-item"><div class="detail-meta-val">${p.floor == 0 ? 'أرضي' : p.floor}</div><div class="detail-meta-lbl">الدور</div></div>` : '';
  const rentCountItem = p.rentCount > 0
    ? `<div class="detail-meta-item"><div class="detail-meta-val">${p.rentCount}</div><div class="detail-meta-lbl">مرات تأجير</div></div>` : '';

  // Media gallery — only from owner uploads
  const mediaGallery = (p.media && p.media.length > 1)
    ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-top:16px">' +
      p.media.slice(1).map(m => m.isVideo
        ? `<video src="${m.data}" controls style="width:100%;height:120px;object-fit:cover;border-radius:10px"></video>`
        : `<img src="${m.data}" style="width:100%;height:120px;object-fit:cover;border-radius:10px">`
      ).join('') + '</div>'
    : '';

  // Owner toggle inside detail
  const isOwner = currentUser && currentUser.email === p.userId;
  const ownerToggle = isOwner ? `
    <div style="margin-top:14px;padding:12px 14px;background:var(--bg3);border-radius:12px;display:flex;align-items:center;gap:12px">
      <span style="font-size:13px;color:var(--text2)">تغيير الحالة:</span>
      <label class="toggle-switch">
        <input type="checkbox" ${isRented ? 'checked' : ''} onchange="toggleStatus(${p.id}, this)">
        <span class="toggle-track"></span>
      </label>
      <span style="font-size:13px;color:var(--text2)">${isRented ? 'مؤجَّر' : 'متاح'}</span>
    </div>` : '';

  document.getElementById('detail-content').innerHTML = `
    <div class="prop-detail-header">
      <div class="prop-detail-img">${getThumbnailHtml(p, 2)}</div>
      <div class="prop-detail-info">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px">
          <div class="prop-detail-title" style="margin:0">${p.title}</div>
          ${statusBadge}
        </div>
        <div class="prop-detail-price">${priceLabel}</div>
        <div class="prop-detail-loc">📍 ${p.location}</div>
        <div class="prop-detail-meta">
          ${p.rooms > 0 ? `<div class="detail-meta-item"><div class="detail-meta-val">${p.rooms}</div><div class="detail-meta-lbl">غرف</div></div>` : ''}
          <div class="detail-meta-item"><div class="detail-meta-val">${p.baths}</div><div class="detail-meta-lbl">حمامات</div></div>
          <div class="detail-meta-item"><div class="detail-meta-val">${p.area}</div><div class="detail-meta-lbl">م²</div></div>
          ${floorItem}
          ${rentCountItem}
        </div>
        <p style="font-size:14px;color:var(--text2);line-height:1.7;margin-bottom:12px">${p.desc}</p>
        ${featuresTags ? `<div class="prop-features" style="margin-bottom:12px">${featuresTags}</div>` : ''}
        ${ownerToggle}
        <div style="display:flex;gap:8px;margin-top:14px">
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
  const isFirstMsg = !messages.find(m => m.convId === convId && m.from === from);

  const msg = { convId, propId, from, to, text, ts: Date.now() };
  messages.push(msg);
  saveMessages();

  // Send notification only on the very first message (chat initiation)
  if (isFirstMsg) {
    const propObj = properties.find(x => x.id === propId);
    const propTitle = propObj ? propObj.title : '';
    const notif = {
      id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
      to,
      text: `📨 ${currentUser.name || from.split('@')[0]} بدأ محادثة معك بشأن "${propTitle}"`,
      read: false,
      ts: Date.now(),
      convId,
      propId
    };
    notifications.push(notif);
    saveNotifications();
    updateNotifBadge();
  }

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
  const floor = parseInt(document.getElementById('new-floor').value) || 0;
  const rentCount = parseInt(document.getElementById('new-rentcount').value) || 0;

  if (!title || !location || !price || isNaN(price)) { showToast('يرجى ملء الحقول المطلوبة'); return; }

  // Collect amenities (req 1)
  const amenities = [];
  document.querySelectorAll('#amenities-group .check-item.checked').forEach(el => {
    const val = el.dataset.value;
    if (val === '__other__') {
      const otherText = document.getElementById('other-amenity-text').value.trim();
      if (otherText) amenities.push(otherText);
    } else {
      amenities.push(val);
    }
  });

  // Collect utilities (req 2)
  const utilities = [];
  document.querySelectorAll('#utilities-group .check-item.checked').forEach(el => {
    utilities.push(el.dataset.value);
  });

  const newProp = {
    id: Math.max(...properties.map(p => p.id), 0) + 1,
    title, type, location, price, rooms, baths, area,
    floor, rentCount,
    amenities, utilities,
    icon: selectedIcon, phone, desc,
    status: 'available', // default
    userId: currentUser.email,
    createdAt: Date.now(),
    lat, lng,
    media: uploadedMedia
  };

  properties.unshift(newProp);
  saveProperties();
  showToast('✅ تم إضافة العقار بنجاح');
  closeModal('add-prop-modal');
  uploadedMedia = [];

  // Reset form fields
  ['new-title','new-location','new-price','new-desc','new-phone','new-area'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('new-floor').value = '1';
  document.getElementById('new-rentcount').value = '0';
  // Reset checkboxes
  document.querySelectorAll('#amenities-group .check-item, #utilities-group .check-item').forEach(el => el.classList.remove('checked'));
  const otherBox = document.getElementById('other-amenity-text');
  if (otherBox) { otherBox.value = ''; otherBox.classList.remove('visible'); }
  renderAll();
}

// ==================== CHECKBOX HELPERS (Req 1 & 2) ====================
function toggleCheckItem(el) {
  const isChecked = el.classList.contains('checked');
  const exclusiveGroup = el.dataset.exclusive;

  // If part of an exclusive group (بلاط / مفروش), uncheck siblings first
  if (exclusiveGroup) {
    const parent = el.closest('.check-group');
    if (parent) {
      parent.querySelectorAll(`[data-exclusive="${exclusiveGroup}"]`).forEach(sibling => {
        sibling.classList.remove('checked');
      });
    }
    // If was already checked, clicking again unchecks it
    if (!isChecked) el.classList.add('checked');
  } else {
    el.classList.toggle('checked');
  }
}

function toggleOtherBox() {
  const toggle = document.getElementById('other-amenity-toggle');
  const box = document.getElementById('other-amenity-text');
  if (!toggle || !box) return;
  if (toggle.classList.contains('checked')) {
    box.classList.add('visible');
    setTimeout(() => box.focus(), 50);
  } else {
    box.classList.remove('visible');
    box.value = '';
  }
}

// ==================== NUMBER STEPPER (Req 3 & 4) ====================
function stepNum(inputId, delta) {
  const el = document.getElementById(inputId);
  if (!el) return;
  const min = parseInt(el.min) || 0;
  let val = parseInt(el.value) || 0;
  val = Math.max(min, val + delta);
  el.value = val;
}

// ==================== STATUS TOGGLE (Req 5) ====================
function toggleStatus(propId, checkbox) {
  const p = properties.find(x => x.id === propId);
  if (!p) return;
  if (!currentUser || currentUser.email !== p.userId) {
    showToast('فقط صاحب العقار يمكنه تغيير الحالة');
    checkbox.checked = !checkbox.checked;
    return;
  }
  p.status = checkbox.checked ? 'rented' : 'available';
  saveProperties();
  showToast(p.status === 'rented' ? '🔴 تم تحديث الحالة: تم التأجير' : '🟢 تم تحديث الحالة: متاح');
  renderAll();
  // Re-open detail to refresh the toggle label if modal is open
  const detailModal = document.getElementById('detail-modal');
  if (detailModal && detailModal.classList.contains('open')) {
    openDetail(propId);
  }
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

// ==================== PASSWORD SHOW/HIDE ====================
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁';
}

// ==================== CHANGE PASSWORD ====================
function openChangePw() {
  if (!currentUser) { showToast('يرجى تسجيل الدخول'); return; }
  ['pw-current','pw-new','pw-confirm'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const sub = document.getElementById('change-pw-sub');
  if (sub) {
    sub.textContent = currentUser.email === 'admin@ejaari.local'
      ? 'سيتم إرسال تأكيد التغيير إلى: johnjohan@gmail.com'
      : 'أدخل كلمة المرور الحالية ثم الجديدة';
  }
  openModal('change-pw-modal');
}

function handleChangePw() {
  if (!currentUser) return;
  const current = document.getElementById('pw-current').value;
  const newPw = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;

  if (!current || !newPw || !confirm) { showToast('يرجى ملء جميع الحقول'); return; }
  if (newPw !== confirm) { showToast('❌ كلمتا المرور الجديدتان غير متطابقتين'); return; }
  if (newPw.length < 6) { showToast('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

  // Verify current password
  if (currentUser.email === 'admin@ejaari.local') {
    const adminRecord = users.find(u => u.email === 'admin@ejaari.local');
    const stored = adminRecord ? adminRecord.password : 'admin123';
    if (current !== stored) { showToast('❌ كلمة المرور الحالية غير صحيحة'); return; }
    // Update admin password
    if (adminRecord) adminRecord.password = newPw;
    else users.push({ email: 'admin@ejaari.local', name: 'المدير', password: newPw, type: 'admin' });
    saveUsers();
    // Simulate email notification
    console.log(`[EMAIL] To: johnjohan@gmail.com | Subject: تغيير كلمة مرور الأدمين | New password changed for admin@ejaari.local`);
    showToast('✅ تم تغيير كلمة المرور وإرسال تأكيد إلكتروني للمدير');
  } else {
    const record = users.find(u => u.email === currentUser.email);
    if (!record) { showToast('❌ لم يتم العثور على الحساب'); return; }
    if (current !== record.password) { showToast('❌ كلمة المرور الحالية غير صحيحة'); return; }
    record.password = newPw;
    saveUsers();
    showToast('✅ تم تغيير كلمة المرور بنجاح');
  }
  closeModal('change-pw-modal');
}

// ==================== FORGOT PASSWORD ====================
let _resetCode = null;
let _resetEmail = null;

function openForgotPw() {
  // Reset to step 1
  document.getElementById('forgot-step-1').style.display = 'block';
  document.getElementById('forgot-step-2').style.display = 'none';
  const emailInput = document.getElementById('forgot-email');
  if (emailInput) emailInput.value = '';
  _resetCode = null;
  _resetEmail = null;
  openModal('forgot-pw-modal');
}

function goBackForgot() {
  document.getElementById('forgot-step-1').style.display = 'block';
  document.getElementById('forgot-step-2').style.display = 'none';
  _resetCode = null;
}

function sendResetCode() {
  const emailInput = document.getElementById('forgot-email');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  if (!email) { showToast('يرجى إدخال البريد الإلكتروني'); return; }

  // Check if email exists
  const isAdmin = email === 'admin@ejaari.local';
  const record = users.find(u => u.email === email);
  if (!isAdmin && !record) {
    showToast('❌ هذا البريد غير مسجل على المنصة');
    return;
  }

  // Generate 6-digit code
  _resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  _resetEmail = email;

  // Determine where the email would be sent
  const sendTo = isAdmin ? 'johnjohan@gmail.com' : email;

  // Simulate sending (log to console; in production → real email API)
  console.log(`[EMAIL RESET] To: ${sendTo} | Code: ${_resetCode} | For: ${email}`);

  // Show step 2
  document.getElementById('forgot-step-1').style.display = 'none';
  document.getElementById('forgot-step-2').style.display = 'block';
  const noteEl = document.getElementById('forgot-email-sent-note');
  if (noteEl) noteEl.textContent = `✉️ تم إرسال رمز التحقق إلى ${sendTo}`;

  // Also show as toast so it's visible during development (remove in production)
  showToast(`رمز التحقق: ${_resetCode} (مرسل إلى ${sendTo})`);
}

function doResetPassword() {
  const enteredCode = (document.getElementById('forgot-code')?.value || '').trim();
  const newPw = document.getElementById('forgot-new-pw')?.value || '';
  const confirmPw = document.getElementById('forgot-confirm-pw')?.value || '';

  if (!enteredCode || !newPw || !confirmPw) { showToast('يرجى ملء جميع الحقول'); return; }
  if (enteredCode !== _resetCode) { showToast('❌ رمز التحقق غير صحيح'); return; }
  if (newPw !== confirmPw) { showToast('❌ كلمتا المرور غير متطابقتين'); return; }
  if (newPw.length < 6) { showToast('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

  // Update password
  const isAdmin = _resetEmail === 'admin@ejaari.local';
  if (isAdmin) {
    const adminRecord = users.find(u => u.email === 'admin@ejaari.local');
    if (adminRecord) adminRecord.password = newPw;
    else users.push({ email: 'admin@ejaari.local', name: 'المدير', password: newPw, type: 'admin' });
  } else {
    const record = users.find(u => u.email === _resetEmail);
    if (record) record.password = newPw;
  }
  saveUsers();

  _resetCode = null;
  _resetEmail = null;
  closeModal('forgot-pw-modal');
  showToast('✅ تم تغيير كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن');

  // Pre-fill the email in login form
  const loginEmail = document.getElementById('login-email');
  if (loginEmail && _resetEmail) loginEmail.value = _resetEmail;
}

// ==================== CONTACT PLATFORM (messaging admin) ====================
function sendContactMessage() {
  if (!currentUser) {
    showToast('يرجى تسجيل الدخول أولاً');
    navigate('auth');
    return;
  }
  const textarea = document.getElementById('contact-message');
  const text = textarea ? textarea.value.trim() : '';
  if (!text) { showToast('يرجى كتابة رسالة أولاً'); return; }

  const adminEmail = 'admin@ejaari.local';
  const convId = `contact::${currentUser.email}::${adminEmail}`;
  const msg = { convId, propId: null, from: currentUser.email, to: adminEmail, text, ts: Date.now(), isContact: true };
  messages.push(msg);
  saveMessages();

  // Notify admin
  const notif = {
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    to: adminEmail,
    text: `📬 ${currentUser.name} (${currentUser.email}) أرسل لك رسالة جديدة`,
    read: false,
    ts: Date.now(),
    convId,
    isContact: true,
    fromUser: currentUser.email,
    fromName: currentUser.name
  };
  notifications.push(notif);
  saveNotifications();
  updateNotifBadge();

  textarea.value = '';
  showToast('✅ تم إرسال رسالتك للمنصة، سنرد عليك قريباً');
}

// ==================== ADMIN REPLY TO CONTACT MESSAGES ====================
let activeContactConvId = null;
let activeContactFromEmail = null;

function openAdminMsgThread(convId, fromEmail, fromName) {
  activeContactConvId = convId;
  activeContactFromEmail = fromEmail;
  const fromEl = document.getElementById('admin-msg-from');
  const timeEl = document.getElementById('admin-msg-time');
  if (fromEl) fromEl.textContent = `💬 محادثة مع ${fromName || fromEmail}`;
  if (timeEl) timeEl.textContent = fromEmail;
  renderAdminMsgThread(convId);
  document.getElementById('admin-reply-input').value = '';
  openModal('admin-msg-modal');
}

function renderAdminMsgThread(convId) {
  const container = document.getElementById('admin-msg-thread');
  if (!container) return;
  const conv = messages.filter(m => m.convId === convId).sort((a,b) => a.ts - b.ts);
  if (!conv.length) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3)">لا توجد رسائل</div>';
    return;
  }
  container.innerHTML = conv.map(m => {
    const isAdmin = m.from === 'admin@ejaari.local';
    return `<div class="chat-msg ${isAdmin ? 'me' : 'them'}">
      <div>${escapeHtml(m.text)}</div>
      <div class="chat-msg-ts">${timeAgo(m.ts)} · ${isAdmin ? 'أنت (المدير)' : m.from}</div>
    </div>`;
  }).join('');
  setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

function sendAdminReply() {
  if (!currentUser || currentUser.email !== 'admin@ejaari.local') return;
  const input = document.getElementById('admin-reply-input');
  const text = input ? input.value.trim() : '';
  if (!text || !activeContactConvId) return;

  const msg = {
    convId: activeContactConvId, propId: null,
    from: 'admin@ejaari.local', to: activeContactFromEmail,
    text, ts: Date.now(), isContact: true
  };
  messages.push(msg);
  saveMessages();

  // Notify the user that admin replied
  const userRecord = users.find(u => u.email === activeContactFromEmail);
  const userName = userRecord ? userRecord.name : activeContactFromEmail;
  const notif = {
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    to: activeContactFromEmail,
    text: `✅ المنصة ردّت على رسالتك — اضغط لقراءة الرد`,
    read: false,
    ts: Date.now(),
    convId: activeContactConvId,
    isContactReply: true,
    fromUser: 'admin@ejaari.local'
  };
  notifications.push(notif);
  saveNotifications();
  updateNotifBadge();

  renderAdminMsgThread(activeContactConvId);
  if (input) input.value = '';
  renderDashboard();
}

// Override openNotifAction to handle contact notifications
function openNotifAction(id) {
  const n = notifications.find(x => x.id === id);
  if (!n) return;
  n.read = true;
  saveNotifications();
  updateNotifBadge();

  // Admin sees contact message → open reply modal
  if (n.isContact && currentUser && currentUser.email === 'admin@ejaari.local') {
    closeModal('notif-modal');
    const fromName = n.fromName || n.fromUser || '';
    setTimeout(() => openAdminMsgThread(n.convId, n.fromUser, fromName), 150);
    return;
  }

  // User sees admin reply → open their contact thread
  if (n.isContactReply) {
    closeModal('notif-modal');
    setTimeout(() => openUserContactThread(n.convId), 150);
    return;
  }

  // Regular chat notification → open property chat
  openNotifications(); // refresh read state
  if (n.convId && n.propId) {
    closeModal('notif-modal');
    setTimeout(() => openChat(n.propId), 200);
  }
}

function openUserContactThread(convId) {
  // Show the user their conversation with admin using chat modal
  contactProp = null;
  document.getElementById('chat-prop-title').textContent = 'رسائلك مع المنصة';
  document.getElementById('chat-prop-owner').textContent = 'admin@ejaari.local';
  document.getElementById('chat-input').value = '';
  // Render the contact conversation
  const container = document.getElementById('chat-messages');
  const conv = messages.filter(m => m.convId === convId).sort((a,b) => a.ts - b.ts);
  container.innerHTML = conv.map(m => {
    const isMe = currentUser && m.from === currentUser.email;
    return `<div class="chat-msg ${isMe ? 'me' : 'them'}">
      <div>${escapeHtml(m.text)}</div>
      <div class="chat-msg-ts">${timeAgo(m.ts)}</div>
    </div>`;
  }).join('');
  setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
  // Disable send (one-way from user side in chat modal)
  document.getElementById('chat-send-btn').onclick = function() {
    showToast('للرد على المنصة، استخدم قسم "تواصل مع المنصة" في الصفحة الرئيسية');
  };
  openModal('chat-modal');
}

// ==================== CONTACT SECTION VISIBILITY ====================
function updateContactSection() {
  const note = document.getElementById('contact-auth-note');
  const form = document.getElementById('contact-form-wrap');
  if (!note || !form) return;
  if (currentUser) {
    note.style.display = 'none';
    form.style.display = 'block';
  } else {
    note.style.display = 'block';
    form.style.display = 'none';
  }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  updateUserUI();
  updateStats();
  renderFeatured();
  updateContactSection();

  // Ensure admin nav hidden on load if not admin
  const navDash = document.getElementById('nav-dashboard');
  if (navDash && (!currentUser || currentUser.email !== 'admin@ejaari.local')) {
    navDash.style.display = 'none';
  }
});
