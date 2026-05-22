// ========================================
// EJAARI - UPDATED JAVASCRIPT
// Firebase Realtime Database Edition
// البيانات متزامنة بين جميع الأجهزة
// ========================================

// ==================== FIREBASE SETUP ====================
let db = null; // Firebase database reference

function initFirebase() {
  // التحقق من أن Firebase SDK محمّل
  if (typeof firebase === 'undefined') {
    console.warn('[EJAARI] Firebase SDK غير محمّل - سيعمل الموقع بوضع محلي');
    return false;
  }
  // التحقق من أن الإعدادات مكتملة (من firebase-config.js)
  if (typeof FIREBASE_IS_CONFIGURED !== 'undefined' && !FIREBASE_IS_CONFIGURED) {
    console.warn('[EJAARI] Firebase غير مُعدَّل بعد - يعمل بوضع localStorage. راجع firebase-config.js');
    return false;
  }
  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.database();
    console.log('[EJAARI] Firebase متصل ✅');
    return true;
  } catch (e) {
    console.error('[EJAARI] خطأ في تهيئة Firebase:', e);
    return false;
  }
}

// ==================== GLOBAL VARIABLES ====================
let currentLang = 'ar';
let currentType = 'all';
let selectedIcon = '🏢';
let selectedRole = 'tenant';
let contactProp = null;
let mapInstance = null;
let addPropMapInstance = null;
let mapMarkers = [];
let currentUser = null;
let uploadedMedia = [];
let mapCoordinates = { lat: 30.0444, lng: 31.2357 };
let properties = [];
let messages = [];
let notifications = [];
let users = [];

// ==================== DEFAULT PROPERTIES ====================
function getDefaultProperties() {
  return [
    { id:1, title:'شقة فاخرة - حي النرجس', type:'شقة', location:'حي النرجس، القاهرة', price:5500, rooms:3, baths:2, area:120, icon:'🏢', phone:'0501234567', desc:'شقة حديثة وفاخرة بمواقع ممتازة', lat:30.0444, lng:31.2357, media:[], userId:'admin@ejaari.local', createdAt: Date.now()-600000 },
    { id:2, title:'فيلا عصرية مع مسبح', type:'فيلا', location:'حي الملقا، الجيزة', price:18000, rooms:5, baths:4, area:400, icon:'🏡', phone:'0502345678', desc:'فيلا فخمة مع جميع التسهيلات', lat:30.0200, lng:31.2400, media:[], userId:'admin@ejaari.local', createdAt: Date.now()-500000 },
    { id:3, title:'مكتب تجاري - القاهرة الجديدة', type:'مكتب', location:'القاهرة الجديدة', price:12000, rooms:0, baths:2, area:200, icon:'🏢', phone:'0503456789', desc:'مكتب تجاري بموقع استراتيجي', lat:30.0100, lng:31.2300, media:[], userId:'admin@ejaari.local', createdAt: Date.now()-400000 },
  ];
}

// ==================== FIREBASE STORAGE HELPERS ====================
// كل البيانات تُحفظ على Firebase وتُقرأ منه - متزامنة بين جميع الأجهزة

function fbSet(path, value) {
  if (!db) return Promise.resolve();
  return db.ref(path).set(value).catch(e => console.error('Firebase set error:', e));
}

function fbGet(path) {
  if (!db) return Promise.resolve(null);
  return db.ref(path).get().then(snap => snap.exists() ? snap.val() : null).catch(() => null);
}

function fbListen(path, callback) {
  if (!db) return;
  db.ref(path).on('value', snap => callback(snap.exists() ? snap.val() : null));
}

// ==================== SAVE HELPERS ====================
function saveProperties() {
  if (db) {
    // نكتب كل عقار كـ node منفصل بـ id كـ key
    // هذا يضمن أن أي جهاز يضيف عقاراً لا يمسح عقارات الجهاز الآخر
    const updates = {};
    properties.forEach(p => {
      updates['ejaari/properties/' + p.id] = p;
    });
    db.ref().update(updates).catch(e => console.error('Firebase update error:', e));
  } else {
    localStorage.setItem('ejaari_properties', JSON.stringify(properties));
  }
  updateStats();
}
function saveMessages() {
  if (db) fbSet('ejaari/messages', messages);
  else localStorage.setItem('ejaari_messages', JSON.stringify(messages));
}
function saveNotifications() {
  if (db) fbSet('ejaari/notifications', notifications);
  else localStorage.setItem('ejaari_notifications', JSON.stringify(notifications));
}
function saveUsers() {
  if (db) fbSet('ejaari/users', users);
  else localStorage.setItem('ejaari_users', JSON.stringify(users));
}

// ==================== REALTIME LISTENERS ====================
// يستمع للتغييرات من الأجهزة الأخرى ويحدّث الواجهة تلقائياً
function setupRealtimeListeners() {
  // العقارات: listener على كل العقارات — يتحدث عند أي تغيير من أي جهاز
  db.ref('ejaari/properties').on('value', snap => {
    if (snap.exists()) {
      const val = snap.val();
      properties = Object.values(val).filter(p => p && p.id);
    } else {
      properties = [];
    }
    renderAll();
    updateStats();
  });
  // الرسائل: تُحدَّث فوراً ويُحدَّث chat modal لو مفتوح
  fbListen('ejaari/messages', data => {
    messages = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
    // لو نافذة الدردشة مفتوحة، حدّثها
    const chatModal = document.getElementById('chat-modal');
    if (chatModal && chatModal.classList.contains('open') && _activeChatConvId) {
      renderConversationInModal(_activeChatConvId);
    }
    // حدّث صفحة الرسائل لو مفتوحة
    if (document.getElementById('page-messages')?.classList.contains('active')) {
      renderMessagesPage();
    }
  });
  fbListen('ejaari/notifications', data => {
    notifications = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
    updateNotifBadge();
  });
  fbListen('ejaari/users', data => {
    users = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
  });
}

// ==================== INIT: تحميل البيانات من Firebase ====================
function _buildLoadingOverlay() {
  const el = document.createElement('div');
  el.id = 'app-loading-overlay';
  el.style.cssText = 'position:fixed;inset:0;background:#0c0f14;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:Tajawal,sans-serif;';
  el.innerHTML =
    '<style>' +
    '#loading-spin{width:48px;height:48px;border:3px solid rgba(201,168,76,0.2);border-top-color:#c9a84c;border-radius:50%;animation:espin 0.8s linear infinite;}' +
    '@keyframes espin{to{transform:rotate(360deg)}}' +
    '#loading-offline-note{display:none;color:#9aa3b8;font-size:13px;text-align:center;max-width:280px;line-height:1.6;padding:12px 16px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:10px;}' +
    '</style>' +
    '<div style="font-size:48px">&#x1F3E0;</div>' +
    '<div style="color:#c9a84c;font-size:22px;font-weight:700">&#x625;&#x64A;&#x62C;&#x627;&#x631;&#x64A;</div>' +
    '<div id="loading-spin"></div>' +
    '<div style="color:#9aa3b8;font-size:14px">&#x62C;&#x627;&#x631;&#x64D; &#x62A;&#x62D;&#x645;&#x64A;&#x644; &#x627;&#x644;&#x628;&#x64A;&#x627;&#x646;&#x627;&#x62A;...</div>' +
    '<div id="loading-offline-note">&#x26A0;&#xFE0F; Firebase &#x63A;&#x64A;&#x631; &#x645;&#x64F;&#x639;&#x62F;&#x64E;&#x644; &mdash; &#x627;&#x644;&#x645;&#x648;&#x642;&#x639; &#x64A;&#x639;&#x645;&#x644; &#x645;&#x62D;&#x644;&#x64A;&#x627;&#x64B;.</div>';
  document.body.appendChild(el);
  return el;
}

function showLoadingOverlay(show) {
  let el = document.getElementById('app-loading-overlay');
  if (!el && show) el = _buildLoadingOverlay();
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
}
async function initAppData() {
  // أنشئ الـ overlay مبكراً في الـ DOM قبل أي شيء
  _buildLoadingOverlay();
  showLoadingOverlay(true);

  // ضمان إخفاء الشاشة بعد 4 ثوان مهما حدث
  const safetyTimer = setTimeout(() => {
    showLoadingOverlay(false);
    const note = document.getElementById('loading-offline-note');
    if (note) note.style.display = 'block';
  }, 4000);

  try {
    // تحميل جلسة المستخدم
    try { currentUser = JSON.parse(localStorage.getItem('ejaari_user')) || null; } catch(e) {}

    // تهيئة Firebase
    const firebaseOk = initFirebase();

    if (firebaseOk) {
      try {
        const withTimeout = (p) => Promise.race([
          p,
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);

        const [fbUsers, fbProps, fbMsgs, fbNotifs] = await Promise.all([
          withTimeout(fbGet('ejaari/users')),
          withTimeout(fbGet('ejaari/properties')),
          withTimeout(fbGet('ejaari/messages')),
          withTimeout(fbGet('ejaari/notifications')),
        ]);

        const toArr = (d) => d ? Object.values(d).filter(Boolean) : [];
        users         = toArr(fbUsers);
        // العقارات: نحوّل من object (id → prop) إلى array
        properties    = fbProps ? Object.values(fbProps).filter(p => p && p.id) : getDefaultProperties();
        messages      = toArr(fbMsgs);
        notifications = toArr(fbNotifs);

        // إذا أول مرة: اكتب العقارات الافتراضية
        if (!fbProps) {
          const defProps = getDefaultProperties();
          const firstWrite = {};
          defProps.forEach(p => { firstWrite['ejaari/properties/' + p.id] = p; });
          await db.ref().update(firstWrite).catch(()=>{});
        }
        setupRealtimeListeners();
      } catch (e) {
        console.error('[EJAARI] Firebase fetch error:', e);
        _loadFromLocalStorage();
      }
    } else {
      _loadFromLocalStorage();
    }
  } catch(e) {
    console.error('[EJAARI] initAppData error:', e);
    _loadFromLocalStorage();
  }

  // أوقف الـ safety timer وأخفِ الشاشة
  clearTimeout(safetyTimer);
  showLoadingOverlay(false);

  updateUserUI();
  updateStats();
  renderFeatured();
  updateContactSection();
  const navDash = document.getElementById('nav-dashboard');
  if (navDash && (!currentUser || currentUser.email !== 'admin@ejaari.local')) {
    navDash.style.display = 'none';
  }
}
function _loadFromLocalStorage() {
  try { users         = JSON.parse(localStorage.getItem('ejaari_users'))         || []; } catch(e) {}
  try { properties    = JSON.parse(localStorage.getItem('ejaari_properties'))    || getDefaultProperties(); } catch(e) {}
  try { messages      = JSON.parse(localStorage.getItem('ejaari_messages'))      || []; } catch(e) {}
  try { notifications = JSON.parse(localStorage.getItem('ejaari_notifications')) || []; } catch(e) {}
}
function updateStats() {
  const count = properties.length;
  const elProps = document.getElementById('stats-props');
  if (elProps) elProps.textContent = count;
  // Update the label text dynamically
  const elLabel = elProps ? elProps.closest('.stat')?.querySelector('.stat-label') : null;
  if (elLabel) elLabel.textContent = count === 1 ? 'عقار مضاف' : 'عقار مضاف';
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
  if (page === 'dashboard') {
    if (!currentUser || currentUser.email !== 'admin@ejaari.local') {
      showToast('لوحة التحكم متاحة للمدير فقط');
      navigate('home');
      return;
    }
  }
  if (page === 'messages') {
    if (!currentUser) { showToast('يرجى تسجيل الدخول أولاً'); navigate('auth'); return; }
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
  if (page === 'messages') renderMessagesPage();
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

    // Show dashboard nav/menu only for admin
    const isAdmin = currentUser.email === 'admin@ejaari.local';
    if (hamDash) hamDash.style.display = isAdmin ? 'flex' : 'none';
    if (navDash) navDash.style.display = isAdmin ? 'inline-block' : 'none';
    // إظهار زر الرسائل لكل مستخدم مسجل
    const navMsgs = document.getElementById('nav-messages');
    const hamMsgs = document.getElementById('ham-messages-btn');
    if (navMsgs) navMsgs.style.display = 'inline-block';
    if (hamMsgs) hamMsgs.style.display = 'flex';
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (userSection) userSection.style.display = 'none';
    if (hamGuest) hamGuest.style.display = 'block';
    if (hamUser) hamUser.style.display = 'none';
    if (hamDash) hamDash.style.display = 'none';
    if (navDash) navDash.style.display = 'none';
    const navMsgs = document.getElementById('nav-messages');
    const hamMsgs = document.getElementById('ham-messages-btn');
    if (navMsgs) navMsgs.style.display = 'none';
    if (hamMsgs) hamMsgs.style.display = 'none';
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
  g.innerHTML = sorted.map(p => propCard(p)).join('') ||
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

  _activeChatConvId = convId;

  document.getElementById('chat-prop-title').textContent = p.title;
  document.getElementById('chat-prop-owner').textContent = owner.split('@')[0];
  document.getElementById('chat-input').value = '';
  renderConversationInModal(convId);
  document.getElementById('chat-send-btn').onclick = function() { sendMessage(convId, propId, owner, user); };
  
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
  // تحديث صفحة الرسائل لو كانت مفتوحة
  if (document.getElementById('page-messages')?.classList.contains('active')) {
    renderMessagesPage();
  }
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
  // اكتب العقار الجديد مباشرة على Firebase
  if (db) {
    db.ref('ejaari/properties/' + newProp.id).set(newProp)
      .then(() => console.log('[EJAARI] عقار أُضيف على Firebase ✅'))
      .catch(e => console.error('Firebase add prop error:', e));
  } else {
    localStorage.setItem('ejaari_properties', JSON.stringify(properties));
  }
  updateStats();
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
  if (modalId === 'chat-modal') _activeChatConvId = null;
  if (modalId === 'change-pw-modal') {
    _changePwStep = 1; _changePwOtp = null; _changePwNewPw = null;
  }
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
  // Reset all fields and steps
  ['pw-current','pw-new','pw-confirm'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const otpInput = document.getElementById('change-pw-otp-input');
  if (otpInput) otpInput.value = '';
  _changePwStep = 1;
  _changePwOtp = null;
  _changePwNewPw = null;
  const otpWrap = document.getElementById('change-pw-otp-wrap');
  if (otpWrap) otpWrap.style.display = 'none';
  const pwFields = document.getElementById('change-pw-fields');
  if (pwFields) pwFields.style.display = 'flex';

  const sub = document.getElementById('change-pw-sub');
  if (sub) sub.textContent = `سيتم إرسال رمز التحقق إلى: ${currentUser.email}`;

  openModal('change-pw-modal');
}

// حالة OTP تغيير كلمة المرور
let _changePwOtp = null;
let _changePwStep = 1; // 1=verify-current, 2=enter-otp, 3=done
let _changePwNewPw = null;

async function handleChangePw() {
  if (!currentUser) return;

  if (_changePwStep === 1) {
    // الخطوة 1: التحقق من كلمة المرور الحالية وإرسال OTP
    const current = document.getElementById('pw-current').value;
    const newPw = document.getElementById('pw-new').value;
    const confirm = document.getElementById('pw-confirm').value;

    if (!current || !newPw || !confirm) { showToast('يرجى ملء جميع الحقول'); return; }
    if (newPw !== confirm) { showToast('❌ كلمتا المرور الجديدتان غير متطابقتين'); return; }
    if (newPw.length < 6) { showToast('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

    // التحقق من كلمة المرور الحالية
    let record;
    if (currentUser.email === 'admin@ejaari.local') {
      record = users.find(u => u.email === 'admin@ejaari.local');
      const stored = record ? record.password : 'admin123';
      if (current !== stored) { showToast('❌ كلمة المرور الحالية غير صحيحة'); return; }
    } else {
      record = users.find(u => u.email === currentUser.email);
      if (!record || current !== record.password) { showToast('❌ كلمة المرور الحالية غير صحيحة'); return; }
    }

    // توليد OTP وإرساله بالإيميل
    _changePwOtp = Math.floor(100000 + Math.random() * 900000).toString();
    _changePwNewPw = newPw;

    const sendTo = currentUser.email;
    const toName = currentUser.name || currentUser.email.split('@')[0];

    const saveBtn = document.querySelector('#change-pw-modal .btn-primary');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ جارٍ الإرسال...'; }

    const sent = await sendEmailViaEmailJS({
      to_email:      sendTo,
      to_name:       toName,
      reset_code:    _changePwOtp,
      platform_name: 'إيجاري | Ejaari',
      account_email: currentUser.email
    });

    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '✅ تأكيد الرمز'; }

    if (sent) {
      showToast(`✅ تم إرسال رمز التحقق إلى ${sendTo}`);
    }
    // إذا فشل البريد، sendEmailViaEmailJS تعرض نافذة الرمز تلقائياً

    // إظهار حقل OTP في نفس الـ modal
    const otpWrap = document.getElementById('change-pw-otp-wrap');
    if (otpWrap) otpWrap.style.display = 'block';
    const pwFields = document.getElementById('change-pw-fields');
    if (pwFields) pwFields.style.display = 'none';
    _changePwStep = 2;
    return;
  }

  if (_changePwStep === 2) {
    // الخطوة 2: التحقق من OTP وحفظ كلمة المرور الجديدة
    const entered = (document.getElementById('change-pw-otp-input')?.value || '').trim();
    if (entered !== _changePwOtp) { showToast('❌ رمز التحقق غير صحيح'); return; }

    // حفظ كلمة المرور الجديدة
    if (currentUser.email === 'admin@ejaari.local') {
      const adminRecord = users.find(u => u.email === 'admin@ejaari.local');
      if (adminRecord) adminRecord.password = _changePwNewPw;
      else users.push({ email: 'admin@ejaari.local', name: 'المدير', password: _changePwNewPw, type: 'admin' });
    } else {
      const record = users.find(u => u.email === currentUser.email);
      if (record) record.password = _changePwNewPw;
    }
    saveUsers();

    _changePwOtp = null;
    _changePwNewPw = null;
    _changePwStep = 1;
    showToast('✅ تم تغيير كلمة المرور بنجاح');
    closeModal('change-pw-modal');
    // إعادة حقول الـ modal لحالتها الأصلية
    const otpWrap = document.getElementById('change-pw-otp-wrap');
    if (otpWrap) otpWrap.style.display = 'none';
    const pwFields = document.getElementById('change-pw-fields');
    if (pwFields) pwFields.style.display = 'block';
    const saveBtn = document.querySelector('#change-pw-modal .btn-primary');
    if (saveBtn) saveBtn.textContent = 'إرسال رمز التحقق';
  }
}

// ==================== EMAIL CONFIG via EmailJS ====================
//
// ✅ خطوات الإعداد (مجانية — 200 بريد/شهر — تأخذ 5 دقائق فقط):
//
//  1️⃣  افتح https://www.emailjs.com وسجّل بأي بريد إلكتروني
//
//  2️⃣  من القائمة اختر  Email Services → Add New Service
//       اختر Gmail أو Outlook → اضغط Connect Account → سجّل بحسابك
//       اكتب اسم الـ Service مثلاً "ejaari_mail" ثم اضغط Create Service
//       ← احتفظ بـ Service ID  (شكله: service_xxxxxxx)
//
//  3️⃣  من القائمة اختر  Email Templates → Create New Template
//       في حقل Subject اكتب:   رمز التحقق من إيجاري — {{reset_code}}
//       في حقل Body اكتب:
//         مرحباً {{to_name}}،
//         رمز التحقق الخاص بك: {{reset_code}}
//         الرمز صالح 10 دقائق.
//         — فريق إيجاري
//       في حقل To Email (في Settings tab داخل Template) اكتب:  {{to_email}}
//       اضغط Save
//       ← احتفظ بـ Template ID  (شكله: template_xxxxxxx)
//
//  4️⃣  من القائمة اختر  Account → General → Public Key
//       ← احتفظ بـ Public Key
//
//  5️⃣  ضع القيم الثلاثة في المتغيرات أدناه واحفظ الملف
// ==================================================================

const EMAILJS_SERVICE_ID  = 'Ejaari';   // ← مثال: service_abc123
const EMAILJS_TEMPLATE_ID = 'template_2ugwfmo';  // ← مثال: template_xyz789
const EMAILJS_PUBLIC_KEY  = 'q_yte1XPrORYI1UPw';   // ← مثال: xK9_AbCdEfGhIjKl

// هل EmailJS مضبوط؟ يُتحقق تلقائياً
const EMAILJS_CONFIGURED = (
  EMAILJS_SERVICE_ID  !== 'YOUR_SERVICE_ID'  &&
  EMAILJS_TEMPLATE_ID !== 'YOUR_TEMPLATE_ID' &&
  EMAILJS_PUBLIC_KEY  !== 'YOUR_PUBLIC_KEY'
);

// تهيئة EmailJS (تُستدعى مرة واحدة)
let _ejsReady = false;
function _ensureEmailJS() {
  if (_ejsReady) return true;
  if (typeof emailjs === 'undefined') return false;
  if (EMAILJS_CONFIGURED) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    _ejsReady = true;
  }
  return _ejsReady;
}

/**
 * إرسال رمز التحقق عبر EmailJS مباشرةً إلى بريد المستخدم.
 * إذا لم يكن EmailJS مضبوطاً يعرض نافذة واضحة بالرمز بدلاً من رسالة خطأ.
 */
async function sendEmailViaEmailJS(templateParams) {
  const { to_email, to_name, reset_code, platform_name } = templateParams;

  // ── إذا EmailJS مضبوط: أرسل بريد حقيقي ──────────────────────────
  if (EMAILJS_CONFIGURED && _ensureEmailJS()) {
    try {
      const resp = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email:      to_email,
          to_name:       to_name,
          reset_code:    reset_code,
          platform_name: platform_name || 'إيجاري | Ejaari'
        }
      );
      if (resp.status === 200) {
        console.log('[Email] ✅ بريد أُرسل إلى', to_email);
        return true;
      }
      console.warn('[Email] EmailJS resp:', resp);
    } catch (err) {
      console.error('[Email] EmailJS error:', err);
    }
  }

  // ── Fallback: نافذة واضحة تعرض الرمز مباشرة على الشاشة ──────────
  _showOtpDialog(reset_code, to_email);
  return false;
}

/**
 * نافذة احتياطية — تعرض الرمز بشكل واضح كامل حتى لو فشل البريد
 */
function _showOtpDialog(code, targetEmail) {
  const old = document.getElementById('_otp_dialog');
  if (old) old.remove();

  const box = document.createElement('div');
  box.id = '_otp_dialog';
  box.style.cssText = [
    'position:fixed','inset:0','z-index:999999',
    'background:rgba(0,0,0,0.88)','backdrop-filter:blur(10px)',
    'display:flex','align-items:center','justify-content:center','padding:20px'
  ].join(';');

  box.innerHTML = `
    <div style="
      background:#1e2535;border:1px solid rgba(201,168,76,0.5);
      border-radius:20px;padding:32px 28px;max-width:360px;width:100%;
      text-align:center;font-family:Tajawal,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.7)
    ">
      <div style="font-size:44px;margin-bottom:12px">🔐</div>
      <div style="font-size:19px;font-weight:800;color:#e8eaf0;margin-bottom:10px">رمز التحقق الخاص بك</div>
      <div style="font-size:13px;color:#9aa3b8;margin-bottom:22px;line-height:1.7">
        ${EMAILJS_CONFIGURED
          ? 'تعذّر إرسال البريد — استخدم هذا الرمز مباشرةً:'
          : 'خدمة البريد غير مفعّلة — استخدم هذا الرمز مباشرةً:'}
      </div>
      <div style="
        background:#0c0f14;border:2px solid #c9a84c;border-radius:16px;
        padding:20px 10px;font-size:38px;font-weight:900;color:#c9a84c;
        letter-spacing:12px;margin-bottom:16px;user-select:all;cursor:text;
        font-family:'Outfit',monospace
      ">${code}</div>
      <div style="font-size:12px;color:#6b7490;margin-bottom:24px">
        كان سيُرسل إلى: <span style="color:#c9a84c">${targetEmail}</span>
      </div>
      <button
        onclick="document.getElementById('_otp_dialog').remove()"
        style="
          background:#c9a84c;color:#0c0f14;border:none;border-radius:12px;
          padding:13px 36px;font-size:15px;font-weight:800;cursor:pointer;
          font-family:Tajawal,sans-serif;transition:background 0.2s;width:100%
        "
        onmouseover="this.style.background='#e8c46a'"
        onmouseout="this.style.background='#c9a84c'"
      >✅ حسناً — سأستخدم هذا الرمز</button>
    </div>`;

  document.body.appendChild(box);
}

// ==================== FORGOT PASSWORD ====================
let _resetCode = null;
let _resetEmail = null;

function openForgotPw() {
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

async function sendResetCode() {
  const emailInput = document.getElementById('forgot-email');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  if (!email) { showToast('يرجى إدخال البريد الإلكتروني'); return; }

  const isAdmin = email === 'admin@ejaari.local';
  const record  = users.find(u => u.email === email);
  if (!isAdmin && !record) {
    showToast('❌ هذا البريد غير مسجل على المنصة');
    return;
  }

  // Generate 6-digit code
  _resetCode  = Math.floor(100000 + Math.random() * 900000).toString();
  _resetEmail = email;

  // Admin email → أرسل على البريد الحقيقي، أي مستخدم آخر → أرسل على بريده
  const sendTo   = email;  // دائماً إيميل الشخص الطالب نفسه
  const toName   = isAdmin ? 'مدير المنصة' : (record ? record.name : email.split('@')[0]);

  // إظهار حالة الإرسال
  const sendBtn = document.querySelector('#forgot-step-1 .btn-primary');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳ جارٍ الإرسال...'; }

  const sent = await sendEmailViaEmailJS({
    to_email:      sendTo,
    to_name:       toName,
    reset_code:    _resetCode,
    platform_name: 'إيجاري | Ejaari',
    account_email: email
  });

  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '📨 إرسال رمز التحقق'; }

  if (sent) {
    showToast(`✅ تم إرسال رمز التحقق إلى ${sendTo}`);
  }
  // إذا فشل البريد، sendEmailViaEmailJS تعرض نافذة الرمز تلقائياً

  // الانتقال للخطوة 2
  document.getElementById('forgot-step-1').style.display = 'none';
  document.getElementById('forgot-step-2').style.display = 'block';
  const noteEl = document.getElementById('forgot-email-sent-note');
  if (noteEl) noteEl.textContent = `✉️ تم إرسال رمز التحقق إلى ${sendTo}`;
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

  // Regular chat notification → open conversation from messages page
  if (n.convId) {
    closeModal('notif-modal');
    setTimeout(() => {
      navigate('messages');
      setTimeout(() => openConvFromList(n.convId, n.propId || null), 150);
    }, 150);
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


// ==================== MESSAGES PAGE ====================
let _activeChatConvId = null;

function renderMessagesPage() {
  if (!currentUser) return;
  const list = document.getElementById('messages-list');
  if (!list) return;

  // اجمع كل المحادثات التي يشارك فيها المستخدم الحالي
  const myEmail = currentUser.email;
  const convMap = {};

  messages.forEach(m => {
    if (m.from !== myEmail && m.to !== myEmail) return;
    const key = m.convId;
    if (!convMap[key] || m.ts > convMap[key].ts) {
      convMap[key] = m;
    }
  });

  const convs = Object.values(convMap).sort((a, b) => b.ts - a.ts);

  if (!convs.length) {
    list.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--text3)">
        <div style="font-size:48px;margin-bottom:16px">💬</div>
        <div>لا توجد محادثات بعد</div>
        <div style="font-size:13px;margin-top:8px">ابدأ بالتواصل مع أحد المؤجرين</div>
      </div>`;
    return;
  }

  list.innerHTML = convs.map(m => {
    const isMe = m.from === myEmail;
    const otherEmail = isMe ? m.to : m.from;
    const otherUser = users.find(u => u.email === otherEmail);
    const otherName = otherUser ? otherUser.name : otherEmail.split('@')[0];
    const otherInitial = otherName.charAt(0).toUpperCase();

    // العنوان: اسم العقار إن وجد
    let propTitle = '';
    if (m.propId) {
      const prop = properties.find(p => p.id === m.propId);
      if (prop) propTitle = prop.title;
    } else if (m.isContact) {
      propTitle = 'تواصل مع المنصة';
    }

    // عدد الرسائل غير المقروءة في هذه المحادثة
    const unread = notifications.filter(n =>
      n.to === myEmail && !n.read && n.convId === m.convId
    ).length;

    const previewText = (m.text || '').slice(0, 65) + ((m.text || '').length > 65 ? '...' : '');

    return `
      <div onclick="openConvFromList('${m.convId}', ${m.propId || 'null'})"
        style="display:flex;align-items:center;gap:14px;padding:16px 20px;
               background:var(--card);border:1px solid var(--border2);border-radius:16px;
               cursor:pointer;transition:all 0.2s;${unread ? 'border-color:var(--gold);' : ''}"
        onmouseover="this.style.background='var(--card2)'"
        onmouseout="this.style.background='var(--card)'">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--gold);
                    display:flex;align-items:center;justify-content:center;
                    font-weight:700;font-size:18px;color:var(--bg);flex-shrink:0">
          ${otherInitial}
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div style="font-weight:700;font-size:15px">${otherName}</div>
            <div style="font-size:12px;color:var(--text3);flex-shrink:0">${timeAgo(m.ts)}</div>
          </div>
          ${propTitle ? `<div style="font-size:12px;color:var(--gold);margin-bottom:3px">🏠 ${propTitle}</div>` : ''}
          <div style="font-size:13px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${isMe ? '<span style="color:var(--text3)">أنت: </span>' : ''}${escapeHtml(previewText)}
          </div>
        </div>
        ${unread ? `<div style="width:10px;height:10px;border-radius:50%;background:var(--gold);flex-shrink:0"></div>` : ''}
      </div>`;
  }).join('');
}

function openConvFromList(convId, propId) {
  if (!propId) {
    // محادثة تواصل مع المنصة
    openUserContactThread(convId);
    return;
  }
  // محادثة عقار
  const p = properties.find(x => x.id === propId);
  if (!p) { showToast('العقار غير موجود'); return; }

  _activeChatConvId = convId;
  contactProp = p;

  const parts = convId.split('::');
  const owner = parts[1] || p.userId;
  const user  = parts[2] || currentUser.email;

  document.getElementById('chat-prop-title').textContent = p.title;
  document.getElementById('chat-prop-owner').textContent = owner.split('@')[0];
  document.getElementById('chat-input').value = '';
  renderConversationInModal(convId);
  document.getElementById('chat-send-btn').onclick = function() {
    sendMessage(convId, propId, owner, user);
  };
  openModal('chat-modal');
  scrollChatToBottom();
}

// ==================== END MESSAGES PAGE ====================
// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  initAppData();
});
