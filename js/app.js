// ═══════════════════════════════════════════════════════
// ROLLERMATCH1 — app.js
// Lógica completa: Auth, Swipe, Chats, Rutas, Matches
// ═══════════════════════════════════════════════════════

// ── ESTADO GLOBAL ───────────────────────────────────
const ADMIN_UID = 'd466APZIJEfVBSNzoYelYsxdNvl1';

const state = {
  currentUser:      null,   // datos de Firestore
  firebaseUser:     null,   // firebase auth user
  swipeQueue:       [],
  swipeIndex:       0,
  currentChatId:    null,
  currentChatUser:  null,
  chatUnsubscribe:  null,
  searchFilter:     'all',
  likesTab:         'received',
  obStep:           1,
  obTotal:          6,
  profileModalUser: null,
  pendingMatchUser: null,
  allUsers:         [],
};

// Usuarios de demo (sin Firebase configurado)
const DEMO_USERS = [
  { id:'d1', name:'Laura García',  username:'lauraroller', birthdate:'1998-03-15', location:'Las Tablas, Madrid', avatar:'👩‍🦰', bio:'Rollerskater desde los 14. Amo el derby y las rutas nocturnas 🌙', tags:['Roller Derby','Rutas nocturnas','Música'], gender:'Mujer',  lookingFor:['Todos'], intention:['Amistad','Lo que surja'], level:'Avanzado' },
  { id:'d2', name:'Marcos Fdez',   username:'mkroller',    birthdate:'1995-07-22', location:'Vallecas, Madrid',  avatar:'🧑',   bio:'Patino todos los fines de semana. Rutas largas y velocidad 💨',     tags:['Speed Skating','Maratón','Crossfit'],    gender:'Hombre', lookingFor:['Mujeres'], intention:['Relación seria'], level:'Avanzado' },
  { id:'d3', name:'Sofía M.',      username:'sofi_ruedas', birthdate:'2001-11-08', location:'Leganés, Madrid',   avatar:'👩',   bio:'Principiante con ganas de aprender. Me flipa el freestyle! 🎨',    tags:['Freestyle','Música','Arte'],            gender:'Mujer',  lookingFor:['Hombres'], intention:['Amistad'], level:'Principiante' },
  { id:'d4', name:'Diego R.',      username:'diegosk8',    birthdate:'1993-04-30', location:'Alcorcón, Madrid',  avatar:'🧔',   bio:'Organizador de rutas grupales cada fin de semana 🗺️',               tags:['Organizador','Rutas grupales','Fitness'],gender:'Hombre', lookingFor:['Todos'],   intention:['Conocer gente'], level:'Intermedio' },
  { id:'d5', name:'Ana P.',        username:'anapatin',    birthdate:'1997-09-12', location:'Hortaleza, Madrid', avatar:'👩‍🦱', bio:'Roller artístico y velocidad. Instructora certificada 🏅',         tags:['Instructora','Artístico','Velocidad'],  gender:'Mujer',  lookingFor:['Todos'],   intention:['Lo que surja'], level:'Avanzado' },
  { id:'d6', name:'Rubén V.',      username:'rubenroll',   birthdate:'2000-01-25', location:'Carabanchel, Madrid',avatar:'👦',  bio:'Nuevo en esto pero muy motivado. ¡A aprender! 🔥',                 tags:['Principiante','Urbano','Hip-hop'],       gender:'Hombre', lookingFor:['Mujeres'], intention:['Rollo puntual'], level:'Principiante' },
];

// ── HELPERS ─────────────────────────────────────────
const getAuth  = () => window.firebaseAuth;
const getDb    = () => window.firebaseDb;
const getFns   = () => window.firebaseFns || {};

const waitForFirebase = () => new Promise(r => {
  const t = setInterval(() => {
    if (window.firebaseAuth && window.firebaseFns) { clearInterval(t); r(); }
  }, 50);
  // timeout 5s — modo demo si no hay Firebase
  setTimeout(() => { clearInterval(t); r(); }, 5000);
});

function calcAge(birthdate) {
  if (!birthdate) return '?';
  const b = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

function firebaseErr(code) {
  const map = {
    'auth/user-not-found':      '⚠️ No existe una cuenta con ese correo.',
    'auth/wrong-password':      '⚠️ Contraseña incorrecta.',
    'auth/invalid-email':       '⚠️ Formato de correo no válido.',
    'auth/too-many-requests':   '⚠️ Demasiados intentos. Espera unos minutos.',
    'auth/invalid-credential':  '⚠️ Correo o contraseña incorrectos.',
    'auth/email-already-in-use':'⚠️ Ya existe una cuenta con ese correo.',
    'auth/weak-password':       '⚠️ La contraseña es demasiado débil.',
    'auth/requires-recent-login':'⚠️ Vuelve a iniciar sesión para hacer este cambio.',
  };
  return map[code] || '⚠️ Error inesperado. Inténtalo de nuevo.';
}

// ── TEMA ─────────────────────────────────────────────
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('rm1-theme', theme);
  document.getElementById('theme-dark-btn')?.classList.toggle('active', theme === 'dark');
  document.getElementById('theme-light-btn')?.classList.toggle('active', theme === 'light');
}

(function initTheme() {
  const saved = localStorage.getItem('rm1-theme') || 'dark';
  setTheme(saved);
})();

// ── TOAST ─────────────────────────────────────────────
let toastTimeout;
function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), duration);
}

// ── NAVEGACIÓN ────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; el.classList.add('active'); }
}

function showSection(id) {
  if (id !== 'sec-chat-room' && state.chatUnsubscribe) {
    state.chatUnsubscribe();
    state.chatUnsubscribe = null;
  }
  document.querySelectorAll('.app-section').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  const el = document.getElementById(id);
  if (el) { el.style.display = ''; el.classList.add('active'); el.scrollTop = 0; }

  // Actualizar nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navMap = {
    'sec-home':'nav-home','sec-swipe':'nav-swipe','sec-search':'nav-search',
    'sec-chats':'nav-chats','sec-chat-room':'nav-chats',
    'sec-match':'nav-match','sec-routes':'nav-home','sec-settings':null,
    'sec-likes':null,
  };
  const navId = navMap[id];
  if (navId) document.getElementById(navId)?.classList.add('active');

  // Inicializar sección
  const inits = {
    'sec-home':     renderHome,
    'sec-swipe':    initSwipe,
    'sec-search':   initSearch,
    'sec-likes':    renderLikes,
    'sec-chats':    renderChats,
    'sec-match':    renderMatches,
    'sec-settings': renderSettings,
    'sec-routes':   renderRoutes,
  };
  inits[id]?.();
}

// ── MODALS ────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ── EYE TOGGLE ────────────────────────────────────────
function toggleEye(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
}

// ── PASSWORD STRENGTH ─────────────────────────────────
function checkPassStrength(pass) {
  const el = document.getElementById('pass-strength');
  if (!el) return;
  let s = 0;
  if (pass.length >= 6) s++;
  if (/[A-Z]/.test(pass)) s++;
  if (/[0-9]/.test(pass)) s++;
  if (/[^A-Za-z0-9]/.test(pass)) s++;
  const L = ['', 'Débil 🔴', 'Regular 🟡', 'Buena 🟢', 'Fuerte 💪'];
  const C = ['', '#ff3e6c',  '#FFB300',    '#00e676',   '#7c3aed'];
  el.textContent = pass.length > 0 ? `Seguridad: ${L[s] || L[1]}` : '';
  el.style.color = C[s] || C[1];
}

// ── USERNAME CHECK ────────────────────────────────────
let usernameTimer;
async function checkUsername(val) {
  const status = document.getElementById('username-status');
  if (!status) return;
  val = val.trim().toLowerCase();
  const reserved = ['admin', 'rollermatch', 'support', 'help', 'test', 'root'];
  if (val.length < 3) { status.textContent = 'Mínimo 3 caracteres'; status.style.color = 'var(--text-muted)'; return; }
  if (reserved.includes(val)) { status.textContent = '✕ Nombre reservado'; status.style.color = 'var(--pink)'; return; }
  status.textContent = '⏳ Comprobando...'; status.style.color = 'var(--text-dim)';
  clearTimeout(usernameTimer);
  usernameTimer = setTimeout(async () => {
    if (!window.firebaseDb || !window.firebaseFns) {
      status.textContent = '✓ Disponible'; status.style.color = '#00e676'; return;
    }
    const { doc, getDoc } = getFns();
    try {
      const snap = await getDoc(doc(getDb(), 'usernames', val));
      status.textContent = snap.exists() ? '✕ Ya está en uso' : '✓ ¡Disponible!';
      status.style.color  = snap.exists() ? 'var(--pink)' : '#00e676';
    } catch { status.textContent = ''; }
  }, 600);
}

// ── CHIPS ─────────────────────────────────────────────
function selectChip(el, groupId) {
  document.querySelectorAll(`#${groupId} .chip`).forEach(c => c.classList.remove('selected', 'active'));
  el.classList.add('selected', 'active');
}

function toggleChip(el) {
  el.classList.toggle('selected');
  el.classList.toggle('active');
}

function getSelectedChips(groupId) {
  return [...document.querySelectorAll(`#${groupId} .chip.selected,.chip.active`)].map(c => c.textContent.trim());
}

// ── LOGIN ──────────────────────────────────────────────
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = '⚠️ Rellena todos los campos'; return; }

  const btn = document.querySelector('#login .btn-primary');
  btn.innerHTML = '<span class="loader"></span>'; btn.disabled = true;

  try {
    await waitForFirebase();
    if (!window.firebaseAuth) throw { code: 'no-firebase' };
    const { signInWithEmailAndPassword } = getFns();
    const cred = await signInWithEmailAndPassword(getAuth(), email, pass);
    state.firebaseUser = cred.user;
    const userData = await loadUserFromFirestore(cred.user.uid);
    state.currentUser = userData;
    if (!userData?.onboarded) { showScreen('onboarding'); initOnboarding(); }
    else enterApp();
  } catch (err) {
    if (err.code === 'no-firebase') {
      errEl.textContent = '⚠️ Firebase no configurado. Entra en modo demo abajo.';
    } else {
      errEl.textContent = firebaseErr(err.code);
    }
  } finally {
    btn.textContent = 'Entrar 🔥'; btn.disabled = false;
  }
}

// ── REGISTER ──────────────────────────────────────────
async function handleRegister() {
  const name      = document.getElementById('reg-name').value.trim();
  const surname   = document.getElementById('reg-surname').value.trim();
  const username  = document.getElementById('reg-username').value.trim().toLowerCase();
  const email     = document.getElementById('reg-email').value.trim();
  const phone     = document.getElementById('reg-phone').value.trim();
  const birthdate = document.getElementById('reg-birthdate').value;
  const pass      = document.getElementById('reg-pass').value;
  const pass2     = document.getElementById('reg-pass2').value;
  const genderEl  = document.querySelector('#reg-gender .chip.selected');
  const errEl     = document.getElementById('reg-error');
  errEl.textContent = '';

  // Validaciones
  if (!name || !surname || !username || !email || !birthdate || !pass) { errEl.textContent = '⚠️ Rellena todos los campos obligatorios (*)'; return; }
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) { errEl.textContent = '⚠️ Apodo: solo letras, números, _ y .'; return; }
  if (username.length < 3) { errEl.textContent = '⚠️ Apodo mínimo 3 caracteres'; return; }
  const age = calcAge(birthdate);
  if (age < 18) { errEl.textContent = '⚠️ Solo mayores de 18 años pueden registrarse'; return; }
  if (!email.includes('@')) { errEl.textContent = '⚠️ Correo electrónico no válido'; return; }
  if (pass.length < 6) { errEl.textContent = '⚠️ Contraseña mínimo 6 caracteres'; return; }
  if (!/[0-9]/.test(pass)) { errEl.textContent = '⚠️ La contraseña debe tener al menos un número'; return; }
  if (!/[^A-Za-z0-9]/.test(pass)) { errEl.textContent = '⚠️ La contraseña debe tener al menos un carácter especial'; return; }
  if (pass !== pass2) { errEl.textContent = '⚠️ Las contraseñas no coinciden'; return; }
  if (!genderEl) { errEl.textContent = '⚠️ Selecciona tu género'; return; }

  const btn = document.querySelector('#register .btn-primary');
  btn.innerHTML = '<span class="loader"></span> Creando...'; btn.disabled = true;

  try {
    await waitForFirebase();
    if (!window.firebaseAuth) throw { code: 'no-firebase' };
    const { createUserWithEmailAndPassword, doc, setDoc, getDoc, serverTimestamp } = getFns();
    const db = getDb();

    // Verificar apodo disponible
    const usernameSnap = await getDoc(doc(db, 'usernames', username));
    if (usernameSnap.exists()) { errEl.textContent = '⚠️ Ese apodo ya está en uso'; return; }

    // Crear en Auth
    const cred = await createUserWithEmailAndPassword(getAuth(), email, pass);
    state.firebaseUser = cred.user;

    const userData = {
      uid: cred.user.uid, name, surname, username,
      email, phone, birthdate, gender: genderEl.textContent.trim(),
      avatar: '🛼', bio: '', location: '', level: '',
      lookingFor: [], intention: [], tags: [],
      onboarded: false, rol: 'user', createdAt: serverTimestamp(),
    };

    // Guardar en Firestore con retry
    let tries = 0;
    while (tries < 3) {
      try {
        await setDoc(doc(db, 'usuarios', cred.user.uid), userData);
        await setDoc(doc(db, 'usernames', username), { uid: cred.user.uid });
        break;
      } catch (e) {
        tries++;
        if (tries >= 3) throw e;
        await new Promise(r => setTimeout(r, 600 * tries));
      }
    }

    state.currentUser = userData;
    showScreen('onboarding');
    initOnboarding();
  } catch (err) {
    if (err.code === 'no-firebase') {
      errEl.textContent = '⚠️ Firebase no configurado. Revisa js/app.js con tu config.';
    } else {
      errEl.textContent = firebaseErr(err.code) || err.message;
    }
  } finally {
    btn.textContent = 'Crear cuenta 🛼'; btn.disabled = false;
  }
}

// ── CARGAR USUARIO DE FIRESTORE ────────────────────────
async function loadUserFromFirestore(uid) {
  if (!window.firebaseDb || !window.firebaseFns) return null;
  try {
    const { doc, getDoc } = getFns();
    const snap = await getDoc(doc(getDb(), 'usuarios', uid));
    return snap.exists() ? { ...snap.data(), uid } : null;
  } catch { return null; }
}

// ── ONBOARDING ────────────────────────────────────────
function initOnboarding() {
  state.obStep = 1;
  renderObStep();
}

function renderObStep() {
  const { obStep, obTotal } = state;
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`ob-${obStep}`)?.classList.add('active');
  document.getElementById('ob-progress').style.width = `${(obStep / obTotal) * 100}%`;
  document.getElementById('ob-step-label').textContent = `Paso ${obStep} de ${obTotal}`;
  document.getElementById('ob-prev').style.display = obStep > 1 ? '' : 'none';
  document.getElementById('ob-next').textContent = obStep === obTotal ? 'Empezar 🛼' : 'Siguiente →';
}

function obNext() {
  if (state.obStep < state.obTotal) {
    state.obStep++;
    renderObStep();
  } else {
    finishOnboarding();
  }
}

function obPrev() {
  if (state.obStep > 1) { state.obStep--; renderObStep(); }
}

async function finishOnboarding() {
  const profile = {
    civilStatus:  getSelectedChips('ob-civil')[0] || '',
    lookingFor:   getSelectedChips('ob-looking-for'),
    intention:    getSelectedChips('ob-intention'),
    hobby:        document.getElementById('ob-hobby')?.value.trim() || '',
    food:         document.getElementById('ob-food')?.value.trim() || '',
    music:        document.getElementById('ob-music')?.value.trim() || '',
    level:        getSelectedChips('ob-level')[0]?.replace(/^[^\s]+ /, '') || '',
    bio:          document.getElementById('ob-bio')?.value.trim() || '',
    location:     document.getElementById('ob-location')?.value.trim() || '',
    onboarded:    true,
    tags:         [],
  };

  // Generar tags desde hobby, comida, música
  if (profile.hobby)  profile.tags.push(...profile.hobby.split(',').map(t => t.trim()).filter(Boolean));
  if (profile.food)   profile.tags.push(profile.food.trim());
  if (profile.music)  profile.tags.push(profile.music.trim());
  if (profile.level)  profile.tags.push(profile.level.split('—')[0].trim());

  if (state.currentUser) {
    Object.assign(state.currentUser, profile);
  }

  // Guardar en Firestore
  if (window.firebaseDb && state.firebaseUser) {
    try {
      const { doc, updateDoc } = getFns();
      await updateDoc(doc(getDb(), 'usuarios', state.firebaseUser.uid), profile);
    } catch (e) { console.warn('Onboarding save error:', e); }
  }

  enterApp();
}

// ── ENTRAR A LA APP ────────────────────────────────────
function enterApp() {
  showScreen('app');
  showSection('sec-home');
  loadAllUsers();
  listenChatBadge();
  showToast('¡Bienvenido/a a RollerMatch! 🛼', 3000);
}

// ── LOGOUT ────────────────────────────────────────────
async function handleLogout() {
  if (!confirm('¿Cerrar sesión?')) return;
  if (state.chatUnsubscribe) state.chatUnsubscribe();
  if (window.firebaseAuth && window.firebaseFns) {
    try { await getFns().signOut(getAuth()); } catch {}
  }
  state.currentUser = null; state.firebaseUser = null;
  state.swipeQueue  = []; state.allUsers = [];
  showScreen('splash');
}

// ── CARGAR TODOS LOS USUARIOS ─────────────────────────
async function loadAllUsers() {
  if (!window.firebaseDb) {
    state.allUsers = DEMO_USERS;
    renderHome();
    return;
  }
  try {
    const { collection, getDocs, query, limit } = getFns();
    const q = query(collection(getDb(), 'usuarios'), limit(100));
    const snap = await getDocs(q);
    const users = [];
    snap.forEach(d => { if (d.id !== state.currentUser?.uid) users.push({ ...d.data(), uid: d.id }); });
    state.allUsers = users.length > 0 ? users : DEMO_USERS;
  } catch { state.allUsers = DEMO_USERS; }
  renderHome();
}

// ══════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════
function renderHome() {
  const user = state.currentUser;
  const hour = new Date().getHours();
  const sal  = hour < 13 ? '¡Buenos días' : hour < 20 ? '¡Buenas tardes' : '¡Buenas noches';
  const nombre = user?.name || 'Patinador/a';
  document.getElementById('greeting-text').innerHTML = `${sal}, <span style="background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${nombre}</span>! 🛼`;

  // Mini cards
  const container = document.getElementById('mini-cards');
  if (!container) return;
  const users = state.allUsers.slice(0, 8);
  container.innerHTML = users.map(u => `
    <div class="mini-card" onclick="openProfileModal('${u.id || u.uid}')">
      <span class="mc-avatar">${u.avatar || '🛼'}</span>
      <div class="mc-name">${u.name?.split(' ')[0] || u.username}</div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════
// SWIPE
// ══════════════════════════════════════════════════════
function initSwipe() {
  const myUid = state.currentUser?.uid;
  const seen  = JSON.parse(localStorage.getItem(`rm1-seen-${myUid}`) || '[]');
  state.swipeQueue = state.allUsers.filter(u => {
    const id = u.id || u.uid;
    return id !== myUid && !seen.includes(id);
  });
  state.swipeIndex = 0;
  renderSwipeStack();
}

function renderSwipeStack() {
  const stack = document.getElementById('swipe-stack');
  const empty = document.getElementById('swipe-empty');
  if (!stack) return;

  // Limpiar cartas anteriores
  stack.querySelectorAll('.swipe-card').forEach(c => c.remove());

  if (state.swipeQueue.length === 0) {
    empty.style.display = 'flex'; return;
  }
  empty.style.display = 'none';

  // Mostrar hasta 3 cartas (la primera en top)
  const toShow = state.swipeQueue.slice(0, 3).reverse();
  toShow.forEach((user, i) => {
    const card = buildSwipeCard(user);
    if (i < toShow.length - 1) card.classList.add('card-behind');
    card.style.zIndex = i + 1;
    stack.insertBefore(card, stack.firstChild);
  });

  // Añadir drag al top card
  const topCard = stack.querySelector('.swipe-card:not(.card-behind)');
  if (topCard) addSwipeListeners(topCard);
}

function buildSwipeCard(user) {
  const card = document.createElement('div');
  card.className = 'swipe-card';
  card.dataset.uid = user.id || user.uid;
  const age = calcAge(user.birthdate);
  const tags = (user.tags || []).slice(0, 3).map(t => `<span class="swipe-tag">${t}</span>`).join('');
  card.innerHTML = `
    <div class="swipe-card-img">
      <span>${user.avatar || '🛼'}</span>
      <div class="swipe-label like">LIKE</div>
      <div class="swipe-label nope">NOPE</div>
    </div>
    <div class="swipe-card-info">
      <div class="swipe-card-name">
        ${user.name || user.username}
        <span class="age-badge">${age}</span>
      </div>
      <div class="swipe-card-loc">📍 ${user.location || 'Madrid'}</div>
      <div class="swipe-card-bio">${user.bio || 'Patinador/a apasionado/a 🛼'}</div>
      <div class="swipe-tags">${tags}</div>
    </div>
  `;
  card.addEventListener('click', e => {
    if (Math.abs(parseFloat(card.dataset.dx || 0)) < 5) openProfileModal(card.dataset.uid);
  });
  return card;
}

function addSwipeListeners(card) {
  let startX, startY, dx = 0, dy = 0, dragging = false;

  const onStart = (x, y) => { startX = x; startY = y; dragging = true; card.classList.add('dragging'); };
  const onMove  = (x, y) => {
    if (!dragging) return;
    dx = x - startX; dy = y - startY;
    card.dataset.dx = dx;
    const rot = dx * 0.08;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    const likeLabel = card.querySelector('.swipe-label.like');
    const nopeLabel = card.querySelector('.swipe-label.nope');
    if (likeLabel) likeLabel.style.opacity = Math.max(0, dx / 80);
    if (nopeLabel) nopeLabel.style.opacity = Math.max(0, -dx / 80);
    card.classList.toggle('swiping-right', dx > 40);
    card.classList.toggle('swiping-left',  dx < -40);
  };
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    card.classList.remove('dragging');
    const threshold = 100;
    if (dx > threshold) swipeCardEl(card, 'right');
    else if (dx < -threshold) swipeCardEl(card, 'left');
    else { card.style.transform = ''; card.style.transition = 'transform 0.4s'; setTimeout(() => card.style.transition = '', 400); }
    dx = 0; dy = 0;
  };

  // Mouse
  card.addEventListener('mousedown',  e => onStart(e.clientX, e.clientY));
  document.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  document.addEventListener('mouseup',   onEnd);

  // Touch
  card.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  card.addEventListener('touchmove',  e => onMove(e.touches[0].clientX, e.touches[0].clientY),  { passive: true });
  card.addEventListener('touchend',   onEnd);
}

function swipeCard(dir) {
  const stack  = document.getElementById('swipe-stack');
  const topCard = stack?.querySelector('.swipe-card:not(.card-behind)');
  if (topCard) swipeCardEl(topCard, dir);
}

function swipeCardEl(card, dir) {
  const uid = card.dataset.uid;
  const x = dir === 'right' ? 150 : -150;
  card.style.transition = 'transform 0.4s, opacity 0.4s';
  card.style.transform  = `translate(${x * 3}px, 60px) rotate(${dir === 'right' ? 30 : -30}deg)`;
  card.style.opacity    = '0';

  // Marcar como visto
  const myUid = state.currentUser?.uid;
  const seen  = JSON.parse(localStorage.getItem(`rm1-seen-${myUid}`) || '[]');
  if (!seen.includes(uid)) { seen.push(uid); localStorage.setItem(`rm1-seen-${myUid}`, JSON.stringify(seen)); }

  // Quitar de la cola
  state.swipeQueue = state.swipeQueue.filter(u => (u.id || u.uid) !== uid);

  // Guardar like en Firestore
  if (dir === 'right') recordLike(uid);

  setTimeout(() => { card.remove(); renderSwipeStack(); }, 400);
}

function superLike() {
  const stack  = document.getElementById('swipe-stack');
  const topCard = stack?.querySelector('.swipe-card:not(.card-behind)');
  if (!topCard) return;
  topCard.classList.add('swiping-super');
  setTimeout(() => swipeCardEl(topCard, 'right'), 300);
  showToast('⭐ Super Like enviado!');
}

function reloadSwipe() {
  const myUid = state.currentUser?.uid;
  localStorage.removeItem(`rm1-seen-${myUid}`);
  initSwipe();
}

// ── LIKES / MATCHES EN FIRESTORE ─────────────────────
async function recordLike(toUid) {
  if (!window.firebaseDb || !state.firebaseUser) return;
  const myUid = state.firebaseUser.uid;
  try {
    const { doc, setDoc, getDoc, serverTimestamp } = getFns();
    const db = getDb();
    // Guardar mi like
    await setDoc(doc(db, 'likes', `${myUid}_${toUid}`), { from: myUid, to: toUid, ts: serverTimestamp() });
    // Comprobar si el otro también me dio like → MATCH
    const reverseSnap = await getDoc(doc(db, 'likes', `${toUid}_${myUid}`));
    if (reverseSnap.exists()) {
      // ¡Match! Guardar en matches
      const matchId = [myUid, toUid].sort().join('_');
      await setDoc(doc(db, 'matches', matchId), {
        users: [myUid, toUid], ts: serverTimestamp(),
      });
      const matchUser = state.allUsers.find(u => (u.id || u.uid) === toUid);
      showMatchOverlay(matchUser);
    }
  } catch (e) { console.warn('Like error:', e); }
}

// ── MATCH OVERLAY ─────────────────────────────────────
function showMatchOverlay(user) {
  if (!user) return;
  state.pendingMatchUser = user;
  document.getElementById('match-name').textContent = `¡Tú y ${user.name?.split(' ')[0]} os habéis gustado!`;
  document.getElementById('match-av-them').textContent = user.avatar || '🎉';
  document.getElementById('match-av-me').textContent = state.currentUser?.avatar || '🛼';
  document.getElementById('match-overlay').style.display = 'flex';
}

function closeMatch() {
  document.getElementById('match-overlay').style.display = 'none';
  state.pendingMatchUser = null;
}

function sendMatchMessage() {
  closeMatch();
  if (state.pendingMatchUser) openChat(state.pendingMatchUser);
}

// ══════════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════════
function initSearch() {
  document.getElementById('search-input').value = '';
  renderSearchResults('');
}

function filterSearch() {
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  document.getElementById('search-clear-btn').style.display = q ? '' : 'none';
  renderSearchResults(q);
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear-btn').style.display = 'none';
  renderSearchResults('');
}

function setSearchFilter(btn, filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.searchFilter = filter;
  filterSearch();
}

function renderSearchResults(q) {
  const container = document.getElementById('search-results');
  if (!container) return;
  let users = state.allUsers;
  if (q) users = users.filter(u =>
    u.name?.toLowerCase().includes(q) ||
    u.username?.toLowerCase().includes(q) ||
    u.location?.toLowerCase().includes(q)
  );
  if (!q && users.length === 0) { container.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:2rem">Aún no hay usuarios</p>'; return; }
  container.innerHTML = users.slice(0, 30).map(u => `
    <div class="user-result-card" onclick="openProfileModal('${u.id || u.uid}')">
      <div class="avatar">${u.avatar || '🛼'}</div>
      <div class="user-result-info">
        <div class="user-result-name">${u.name || 'Usuario'}</div>
        <div class="user-result-username">@${u.username || '—'}</div>
        <div class="user-result-loc">📍 ${u.location || '—'}</div>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-dim);text-align:center;padding:2rem">Sin resultados</p>';
}

// ══════════════════════════════════════════════════════
// LIKES
// ══════════════════════════════════════════════════════
function renderLikes() {
  // Demo data
  const container = document.getElementById('likes-grid');
  if (!container) return;
  if (state.likesTab === 'received') {
    const sample = state.allUsers.slice(0, 4);
    container.innerHTML = sample.map(u => `
      <div class="like-card" onclick="openProfileModal('${u.id || u.uid}')">
        <div class="avatar">${u.avatar || '🛼'}</div>
        <div class="like-card-name">${u.name?.split(' ')[0] || '—'}</div>
        <div class="like-card-info">${calcAge(u.birthdate)} años · ${u.location?.split(',')[0] || ''}</div>
        <span class="like-card-badge">❤️</span>
      </div>
    `).join('') || '<p style="color:var(--text-dim);grid-column:1/-1;text-align:center;padding:2rem">Sin likes aún</p>';
  } else {
    container.innerHTML = '<p style="color:var(--text-dim);grid-column:1/-1;text-align:center;padding:2rem">Tus likes aparecerán aquí</p>';
  }
}

function setLikesTab(btn, tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.likesTab = tab;
  renderLikes();
}

// ══════════════════════════════════════════════════════
// MATCHES
// ══════════════════════════════════════════════════════
function renderMatches() {
  const container = document.getElementById('matches-list');
  const empty     = document.getElementById('matches-empty');
  if (!container) return;

  // En modo demo mostramos un par de matches
  const matches = state.allUsers.slice(0, 2);
  if (matches.length === 0) {
    empty.style.display = ''; container.innerHTML = ''; return;
  }
  empty.style.display = 'none';
  container.innerHTML = matches.map(u => `
    <div class="match-item" onclick="openChat(${JSON.stringify({...u,id:u.id||u.uid}).replace(/"/g,'&quot;')})">
      <div class="avatar lg">${u.avatar || '🛼'}</div>
      <div class="match-item-info">
        <div class="match-item-name">${u.name || 'Usuario'}</div>
        <div class="match-item-sub">@${u.username || '—'} · ${u.location?.split(',')[0] || ''}</div>
      </div>
      <button class="btn-sm-primary" style="flex-shrink:0" onclick="event.stopPropagation();showSection('sec-chats')">💬</button>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════
// CHATS
// ══════════════════════════════════════════════════════
function renderChats() {
  const container = document.getElementById('chats-list');
  if (!container) return;
  if (!window.firebaseDb) {
    container.innerHTML = '<div class="loading-msg">💬 Conecta Firebase para habilitar el chat en tiempo real</div>';
    return;
  }
  const myUid = state.firebaseUser?.uid;
  if (!myUid) return;
  const { collection, query, where, onSnapshot, orderBy } = getFns();
  const q = query(collection(getDb(), 'chats'), where('users', 'array-contains', myUid), orderBy('lastMsg', 'desc'));
  onSnapshot(q, snap => {
    if (snap.empty) { container.innerHTML = '<div class="loading-msg">Aún no tienes conversaciones 💬</div>'; return; }
    const items = [];
    snap.forEach(d => {
      const chat = { ...d.data(), id: d.id };
      const otherId = chat.users?.find(u => u !== myUid);
      const other   = state.allUsers.find(u => (u.id || u.uid) === otherId);
      items.push({ chat, other });
    });
    container.innerHTML = items.map(({ chat, other }) => `
      <div class="chat-item" onclick="openChatById('${chat.id}')">
        <div class="avatar">${other?.avatar || '🛼'}</div>
        <div class="chat-item-info">
          <div class="chat-item-name">${other?.name || 'Usuario'}</div>
          <div class="chat-item-preview">${chat.lastMsgText || '...'}</div>
        </div>
        <div class="chat-item-meta">
          <div class="chat-item-time">${formatTime(chat.lastMsg)}</div>
        </div>
      </div>
    `).join('');
  });
}

function openChat(user) {
  if (!user) return;
  state.currentChatUser = user;
  const myUid = state.currentUser?.uid || 'demo';
  const otherId = user.id || user.uid;
  state.currentChatId = [myUid, otherId].sort().join('_');
  document.getElementById('chatroom-name').textContent   = user.name || 'Usuario';
  document.getElementById('chatroom-avatar').textContent = user.avatar || '🛼';
  showSection('sec-chat-room');
  renderChatMessages();
}

function openChatById(chatId) {
  state.currentChatId = chatId;
  const myUid   = state.firebaseUser?.uid;
  const parts   = chatId.split('_');
  const otherId = parts.find(p => p !== myUid) || parts[1];
  const other   = state.allUsers.find(u => (u.id || u.uid) === otherId);
  state.currentChatUser = other;
  document.getElementById('chatroom-name').textContent   = other?.name || 'Usuario';
  document.getElementById('chatroom-avatar').textContent = other?.avatar || '🛼';
  showSection('sec-chat-room');
  renderChatMessages();
}

function renderChatMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  if (!window.firebaseDb) {
    container.innerHTML = '<div class="loading-msg">Firebase necesario para el chat 💬</div>'; return;
  }
  if (state.chatUnsubscribe) state.chatUnsubscribe();
  const { collection, query, orderBy, onSnapshot } = getFns();
  const q = query(collection(getDb(), 'chats', state.currentChatId, 'messages'), orderBy('ts', 'asc'));
  state.chatUnsubscribe = onSnapshot(q, snap => {
    const myUid = state.firebaseUser?.uid;
    container.innerHTML = snap.docs.map(d => {
      const msg   = d.data();
      const mine  = msg.from === myUid;
      const time  = formatTime(msg.ts);
      return `<div class="msg ${mine ? 'mine' : 'theirs'}">${msg.text}<div class="msg-time">${time}</div></div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  });
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input?.value.trim();
  if (!text) return;
  input.value = '';
  if (!window.firebaseDb) { showToast('💬 Firebase necesario para el chat'); return; }
  const myUid  = state.firebaseUser?.uid;
  const chatId = state.currentChatId;
  const { doc, setDoc, addDoc, collection, serverTimestamp } = getFns();
  const db = getDb();
  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), { from: myUid, text, ts: serverTimestamp() });
    await setDoc(doc(db, 'chats', chatId), {
      users: [myUid, state.currentChatUser?.uid || state.currentChatUser?.id],
      lastMsg: serverTimestamp(), lastMsgText: text,
    }, { merge: true });
  } catch (e) { showToast('Error al enviar mensaje'); console.error(e); }
}

function showNewChat() { openModal('modal-new-chat'); }

async function searchNewChatUser(q) {
  const container = document.getElementById('new-chat-results');
  if (!container) return;
  const results = state.allUsers.filter(u =>
    u.name?.toLowerCase().includes(q.toLowerCase()) ||
    u.username?.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10);
  container.innerHTML = results.map(u => `
    <div class="user-result-card" onclick="closeModal('modal-new-chat');openChat(${JSON.stringify({...u,id:u.id||u.uid}).replace(/"/g,'&quot;')})">
      <div class="avatar">${u.avatar || '🛼'}</div>
      <div class="user-result-info">
        <div class="user-result-name">${u.name}</div>
        <div class="user-result-username">@${u.username || '—'}</div>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-dim);text-align:center;padding:1rem">Sin resultados</p>';
}

function listenChatBadge() {
  if (!window.firebaseDb || !state.firebaseUser) return;
  // Placeholder — en producción se escucha mensajes no leídos
}

function openChatFromProfile() {
  if (state.profileModalUser) openChat(state.profileModalUser);
}

function openCurrentChatProfile() {
  if (state.currentChatUser) openProfileModal(state.currentChatUser.id || state.currentChatUser.uid);
}

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ══════════════════════════════════════════════════════
// RUTAS
// ══════════════════════════════════════════════════════
const DEMO_ROUTES = [
  { id:'r1', nombre:'Ruta Retiro → Matadero',        punto:'Puerta del Retiro, Madrid',   fecha: new Date(Date.now()+86400000*2).toISOString(), ritmo:'Medio',   desc:'Ruta urbana por el centro. Llevar agua y casco.',            autor:'Diego R.', autorUid:'d4', participantes:['d4','d1','d3'] },
  { id:'r2', nombre:'Nocturna por el Manzanares',    punto:'Puente de Segovia',            fecha: new Date(Date.now()+86400000*3).toISOString(), ritmo:'Fácil',   desc:'Ruta nocturna tranquila con luces. Nivel principiante apto.', autor:'Laura G.', autorUid:'d1', participantes:['d1'] },
  { id:'r3', nombre:'Sprint Paseo de la Castellana', punto:'Plaza de Castilla',            fecha: new Date(Date.now()+86400000*5).toISOString(), ritmo:'Difícil', desc:'Para avanzados. Alta velocidad. Obligatorio protecciones.',   autor:'Marcos F.',autorUid:'d2', participantes:['d2','d4'] },
];

// Cache local de rutas para gestionar participantes sin recargar todo
let _routesCache = [];

async function renderRoutes() {
  const container = document.getElementById('routes-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-msg">Cargando rutas... 🛼</div>';

  let routes = JSON.parse(JSON.stringify(DEMO_ROUTES)); // copia profunda demo

  if (window.firebaseDb) {
    try {
      const { collection, getDocs, orderBy, query } = getFns();
      const q = query(collection(getDb(), 'rutas'), orderBy('fecha', 'asc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        routes = snap.docs.map(d => ({
          participantes: [],
          ...d.data(),
          id: d.id,
        }));
      }
    } catch (e) { console.warn('renderRoutes error:', e); }
  }

  _routesCache = routes;
  _renderRouteCards(routes);

  document.getElementById('badge-routes').textContent = routes.length;
  document.getElementById('badge-routes').style.display = routes.length > 0 ? '' : 'none';
}

function _renderRouteCards(routes) {
  const container = document.getElementById('routes-list');
  if (!container) return;
  const myUid    = state.currentUser?.uid || state.firebaseUser?.uid || '';
  const isAdmin  = myUid === ADMIN_UID || state.currentUser?.rol === 'admin';

  container.innerHTML = routes.map(r => {
    const levelClass  = { 'Fácil':'easy', 'Medio':'medium', 'Difícil':'hard' }[r.ritmo] || 'medium';
    const fecha       = new Date(r.fecha?.seconds ? r.fecha.seconds * 1000 : r.fecha);
    const fechaStr    = fecha.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' });
    const horaStr     = fecha.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
    const participantes = Array.isArray(r.participantes) ? r.participantes : [];
    const count       = participantes.length;
    const isApuntado  = myUid && participantes.includes(myUid);
    const isOrganizador = myUid && (r.autorUid === myUid || isAdmin);

    const btnApuntarse = isApuntado
      ? `<button class="btn-route-action leave" onclick="event.stopPropagation();toggleRuta('${r.id}', false)">❌ Desapuntarse</button>`
      : `<button class="btn-route-action join"  onclick="event.stopPropagation();toggleRuta('${r.id}', true)">✅ Apuntarse</button>`;

    const btnParticipantes = isOrganizador
      ? `<button class="btn-route-action" onclick="event.stopPropagation();verParticipantes('${r.id}')">👥 ${count} participante${count !== 1 ? 's' : ''}</button>`
      : `<span class="route-count">👥 ${count} apuntado${count !== 1 ? 's' : ''}</span>`;

    const btnEditar = isOrganizador
      ? `<button class="btn-route-action" onclick="event.stopPropagation();editRoute('${r.id}')">✏️ Editar</button>`
      : '';

    return `
      <div class="route-card" id="route-card-${r.id}">
        <div class="route-card-header">
          <div class="route-card-title">${r.nombre}</div>
          <span class="route-badge ${levelClass}">${r.ritmo}</span>
        </div>
        <div class="route-card-meta">
          <span>📅 ${fechaStr} ${horaStr}</span>
          <span>📍 ${r.punto}</span>
        </div>
        <div class="route-card-desc">${r.desc || ''}</div>
        <div class="route-card-footer">
          <span class="route-author">👤 ${r.autor || 'Anónimo'}</span>
          <div class="route-actions">
            ${btnParticipantes}
            ${btnEditar}
            ${btnApuntarse}
          </div>
        </div>
      </div>
    `;
  }).join('') || '<div class="loading-msg">No hay rutas activas 🛼</div>';
}

async function toggleRuta(rutaId, apuntarse) {
  const myUid = state.currentUser?.uid || state.firebaseUser?.uid;
  if (!myUid) { showToast('⚠️ Inicia sesión para apuntarte'); return; }

  // Actualizar cache local inmediatamente (UI optimista)
  const ruta = _routesCache.find(r => r.id === rutaId);
  if (!ruta) return;
  if (!Array.isArray(ruta.participantes)) ruta.participantes = [];

  if (apuntarse) {
    if (!ruta.participantes.includes(myUid)) ruta.participantes.push(myUid);
    showToast('✅ ¡Te has apuntado a la ruta!');
  } else {
    ruta.participantes = ruta.participantes.filter(u => u !== myUid);
    showToast('❌ Te has desapuntado de la ruta');
  }
  _renderRouteCards(_routesCache); // re-render inmediato

  // Persistir en Firestore
  if (window.firebaseDb) {
    try {
      const { doc, updateDoc, arrayUnion, arrayRemove } = getFns();
      await updateDoc(doc(getDb(), 'rutas', rutaId), {
        participantes: apuntarse ? arrayUnion(myUid) : arrayRemove(myUid),
      });
    } catch (e) {
      showToast('⚠️ Error al guardar: ' + e.message);
      // Revertir en caso de error
      if (apuntarse) ruta.participantes = ruta.participantes.filter(u => u !== myUid);
      else if (!ruta.participantes.includes(myUid)) ruta.participantes.push(myUid);
      _renderRouteCards(_routesCache);
    }
  }
}

async function verParticipantes(rutaId) {
  const ruta = _routesCache.find(r => r.id === rutaId);
  if (!ruta) return;
  const participantes = Array.isArray(ruta.participantes) ? ruta.participantes : [];

  // Construir lista de nombres
  let lista = '';
  if (participantes.length === 0) {
    lista = '<p style="color:var(--text-dim);text-align:center;padding:1rem">Nadie apuntado aún</p>';
  } else {
    // Intentar obtener nombres de Firestore
    const perfiles = [];
    if (window.firebaseDb) {
      try {
        const { doc, getDoc } = getFns();
        for (const uid of participantes) {
          const snap = await getDoc(doc(getDb(), 'usuarios', uid));
          if (snap.exists()) perfiles.push({ uid, ...snap.data() });
          else perfiles.push({ uid, name: uid, avatar: '🛼' });
        }
      } catch {
        participantes.forEach(uid => {
          const u = state.allUsers.find(u => (u.id || u.uid) === uid);
          perfiles.push(u || { uid, name: uid, avatar: '🛼' });
        });
      }
    } else {
      participantes.forEach(uid => {
        const u = state.allUsers.find(u => (u.id || u.uid) === uid);
        perfiles.push(u || { uid, name: uid, avatar: '🛼' });
      });
    }
    lista = perfiles.map(p => `
      <div class="user-result-card" style="cursor:default">
        <div class="avatar">${p.avatar || '🛼'}</div>
        <div class="user-result-info">
          <div class="user-result-name">${p.name || 'Usuario'}</div>
          <div class="user-result-username">@${p.username || p.uid?.slice(0,8) || '—'}</div>
        </div>
      </div>
    `).join('');
  }

  // Mostrar modal de participantes (reutilizamos modal-notifs con título dinámico)
  document.querySelector('#modal-notifs .modal-header h3').textContent = `👥 Participantes — ${ruta.nombre}`;
  document.getElementById('notif-list').innerHTML = lista;
  openModal('modal-notifs');
}

function showConvocarRuta() {
  document.getElementById('ruta-nombre').value   = '';
  document.getElementById('ruta-fecha').value    = '';
  document.getElementById('ruta-punto').value    = '';
  document.getElementById('ruta-desc').value     = '';
  document.getElementById('ruta-edit-id').value  = '';
  document.getElementById('ruta-error').textContent = '';
  document.querySelectorAll('#route-ritmo .chip').forEach(c => c.classList.remove('selected','active'));
  openModal('modal-ruta');
}

async function editRoute(rutaId) {
  const ruta = _routesCache.find(r => r.id === rutaId);
  if (!ruta) { showToast('⚠️ Ruta no encontrada'); return; }

  document.getElementById('ruta-nombre').value  = ruta.nombre || '';
  document.getElementById('ruta-punto').value   = ruta.punto  || '';
  document.getElementById('ruta-desc').value    = ruta.desc   || '';
  document.getElementById('ruta-edit-id').value = rutaId;
  document.getElementById('ruta-error').textContent = '';

  // Fecha: convertir a formato datetime-local (YYYY-MM-DDTHH:MM)
  if (ruta.fecha) {
    const d = new Date(ruta.fecha?.seconds ? ruta.fecha.seconds * 1000 : ruta.fecha);
    if (!isNaN(d)) {
      const pad = n => String(n).padStart(2,'0');
      document.getElementById('ruta-fecha').value =
        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }

  // Seleccionar chip de dificultad
  document.querySelectorAll('#route-ritmo .chip').forEach(c => {
    c.classList.remove('selected','active');
    if (c.textContent.includes(ruta.ritmo)) c.classList.add('selected','active');
  });

  openModal('modal-ruta');
}

async function convocarRuta() {
  const nombre  = document.getElementById('ruta-nombre').value.trim();
  const fecha   = document.getElementById('ruta-fecha').value;
  const punto   = document.getElementById('ruta-punto').value.trim();
  const desc    = document.getElementById('ruta-desc').value.trim();
  const editId  = document.getElementById('ruta-edit-id').value;
  const ritmoEl = document.querySelector('#route-ritmo .chip.selected');
  const errEl   = document.getElementById('ruta-error');
  errEl.textContent = '';

  if (!nombre || !fecha || !punto || !ritmoEl) {
    errEl.textContent = '⚠️ Rellena todos los campos obligatorios';
    return;
  }

  const ritmoTexto = ritmoEl.textContent.trim().replace(/^[🟢🟡🔴]\s?/, '');
  const rutaData = {
    nombre, fecha, punto, desc,
    ritmo: ritmoTexto,
    autor:    state.currentUser?.name || 'Anónimo',
    autorUid: state.currentUser?.uid  || 'demo',
  };

  const btn = document.querySelector('#modal-ruta .btn-primary');
  btn.textContent = 'Guardando...'; btn.disabled = true;

  if (window.firebaseDb) {
    try {
      const { doc, setDoc, addDoc, collection, serverTimestamp } = getFns();
      const db = getDb();
      if (editId) {
        await setDoc(doc(db, 'rutas', editId), { ...rutaData, updatedAt: serverTimestamp() }, { merge: true });
        showToast('✅ Ruta actualizada');
      } else {
        rutaData.createdAt    = serverTimestamp();
        rutaData.participantes = [state.currentUser?.uid || 'demo'];
        await addDoc(collection(db, 'rutas'), rutaData);
        showToast('🚀 ¡Ruta convocada!');
      }
    } catch (e) {
      errEl.textContent = '⚠️ Error: ' + e.message;
      btn.textContent = 'Convocar Ruta 🚀'; btn.disabled = false;
      return;
    }
  } else {
    showToast('🚀 ¡Ruta convocada! (modo demo)');
  }

  btn.textContent = 'Convocar Ruta 🚀'; btn.disabled = false;
  closeModal('modal-ruta');
  renderRoutes();
}

// ══════════════════════════════════════════════════════
// PROFILE MODAL
// ══════════════════════════════════════════════════════
function openProfileModal(uid) {
  const user = state.allUsers.find(u => (u.id || u.uid) === uid) || state.currentUser;
  if (!user) return;
  state.profileModalUser = user;
  document.getElementById('modal-profile-name').textContent = user.name || 'Perfil';
  const age  = calcAge(user.birthdate);
  const tags = (user.tags || []).map(t => `<span class="profile-card-tag">${t}</span>`).join('');
  document.getElementById('profile-card-full').innerHTML = `
    <div class="profile-card-header">
      <div class="avatar lg">${user.avatar || '🛼'}</div>
      <div>
        <div class="profile-card-name">${user.name || 'Usuario'}</div>
        <div class="profile-card-username">@${user.username || '—'}</div>
        <div class="profile-card-loc">📍 ${user.location || '—'} · ${age} años</div>
      </div>
    </div>
    <div class="profile-card-bio">${user.bio || 'Patinador/a apasionado/a 🛼'}</div>
    <div class="profile-card-tags">${tags}</div>
    <div class="profile-card-stats">
      <div class="profile-stat"><div class="profile-stat-val">${user.level?.split('—')[0] || '—'}</div><div class="profile-stat-label">Nivel</div></div>
      <div class="profile-stat"><div class="profile-stat-val">${user.gender || '—'}</div><div class="profile-stat-label">Género</div></div>
      <div class="profile-stat"><div class="profile-stat-val">${user.intention?.[0] || '—'}</div><div class="profile-stat-label">Busca</div></div>
    </div>
  `;
  openModal('modal-profile');
}

function openMyProfileFull() {
  const user = state.currentUser;
  if (!user) return;
  const id = user.uid || user.id;
  if (id && !state.allUsers.find(u => (u.uid || u.id) === id)) state.allUsers.push(user);
  openProfileModal(id);
}

// ══════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════
function renderSettings() {
  const user = state.currentUser;
  if (!user) return;
  document.getElementById('settings-name').textContent     = `${user.name || ''} ${user.surname || ''}`.trim() || 'Cargando...';
  document.getElementById('settings-username').textContent = `@${user.username || '—'}`;
  document.getElementById('settings-location').textContent = user.location || '';
  document.getElementById('settings-bio').textContent      = user.bio || '';
  document.getElementById('settings-avatar').textContent   = user.avatar || '🛼';

  // Sincronizar botones de tema
  const savedTheme = localStorage.getItem('rm1-theme') || 'dark';
  document.getElementById('theme-dark-btn')?.classList.toggle('active',  savedTheme === 'dark');
  document.getElementById('theme-light-btn')?.classList.toggle('active', savedTheme === 'light');
}

// ── EDITAR PERFIL ─────────────────────────────────────
function openEditProfileModal() {
  const user = state.currentUser;
  if (!user) return;

  document.getElementById('edit-name').value     = user.name     || '';
  document.getElementById('edit-location').value = user.location || '';
  document.getElementById('edit-bio').value      = user.bio      || '';
  document.getElementById('edit-hobby').value    = user.hobby    || '';
  document.getElementById('edit-food').value     = user.food     || '';
  document.getElementById('edit-error').textContent = '';
  openModal('modal-edit-profile');
}

async function saveEditProfile() {
  const errEl = document.getElementById('edit-error');
  const name  = document.getElementById('edit-name').value.trim();
  if (!name) { errEl.textContent = '⚠️ El nombre no puede estar vacío'; return; }

  const data = {
    name,
    location: document.getElementById('edit-location').value.trim(),
    bio:      document.getElementById('edit-bio').value.trim(),
    hobby:    document.getElementById('edit-hobby').value.trim(),
    food:     document.getElementById('edit-food').value.trim(),
  };

  const btn = document.querySelector('#modal-edit-profile .btn-primary');
  btn.textContent = 'Guardando...'; btn.disabled = true;

  Object.assign(state.currentUser, data);

  if (window.firebaseDb && state.firebaseUser) {
    try {
      const { doc, updateDoc } = getFns();
      await updateDoc(doc(getDb(), 'usuarios', state.firebaseUser.uid), data);
    } catch (e) {
      errEl.textContent = '⚠️ Error al guardar: ' + e.message;
      btn.textContent = 'Guardar ✅'; btn.disabled = false;
      return;
    }
  }

  btn.textContent = 'Guardar ✅'; btn.disabled = false;
  closeModal('modal-edit-profile');
  renderSettings();
  showToast('✅ Perfil actualizado');
}

// ── PREFERENCIAS ──────────────────────────────────────
function openPreferencesModal() {
  const user = state.currentUser;
  if (!user) return;

  // Preseleccionar lookingFor
  document.querySelectorAll('#prefs-looking .chip').forEach(c => {
    const val = c.textContent.trim();
    const active = (user.lookingFor || []).includes(val);
    c.classList.toggle('selected', active);
    c.classList.toggle('active',   active);
  });

  // Preseleccionar intention
  document.querySelectorAll('#prefs-intention .chip').forEach(c => {
    const val = c.textContent.trim();
    const active = (user.intention || []).includes(val);
    c.classList.toggle('selected', active);
    c.classList.toggle('active',   active);
  });

  // Rango de edad
  document.getElementById('prefs-age-min').value = user.ageMin || 18;
  document.getElementById('prefs-age-max').value = user.ageMax || 99;

  openModal('modal-prefs');
}

async function savePreferences() {
  const prefs = {
    lookingFor: getSelectedChips('prefs-looking'),
    intention:  getSelectedChips('prefs-intention'),
    ageMin:     parseInt(document.getElementById('prefs-age-min').value) || 18,
    ageMax:     parseInt(document.getElementById('prefs-age-max').value) || 99,
  };

  const btn = document.querySelector('#modal-prefs .btn-primary');
  btn.textContent = 'Guardando...'; btn.disabled = true;

  Object.assign(state.currentUser, prefs);

  if (window.firebaseDb && state.firebaseUser) {
    try {
      const { doc, updateDoc } = getFns();
      await updateDoc(doc(getDb(), 'usuarios', state.firebaseUser.uid), prefs);
    } catch (e) {
      showToast('⚠️ Error al guardar: ' + e.message);
      btn.textContent = 'Guardar preferencias ✅'; btn.disabled = false;
      return;
    }
  }

  btn.textContent = 'Guardar preferencias ✅'; btn.disabled = false;
  closeModal('modal-prefs');
  showToast('✅ Preferencias guardadas');
}

// ── CAMBIAR CONTRASEÑA ────────────────────────────────
function openChangePasswordModal() {
  document.getElementById('pass-old').value   = '';
  document.getElementById('pass-new').value   = '';
  document.getElementById('pass-new2').value  = '';
  document.getElementById('pass-error').textContent = '';
  openModal('modal-pass');
}

async function changePassword() {
  const oldPass  = document.getElementById('pass-old').value;
  const newPass  = document.getElementById('pass-new').value;
  const newPass2 = document.getElementById('pass-new2').value;
  const errEl    = document.getElementById('pass-error');
  errEl.textContent = '';

  if (!oldPass || !newPass || !newPass2) { errEl.textContent = '⚠️ Rellena todos los campos'; return; }
  if (newPass !== newPass2)               { errEl.textContent = '⚠️ Las contraseñas nuevas no coinciden'; return; }
  if (newPass.length < 6)                 { errEl.textContent = '⚠️ Mínimo 6 caracteres'; return; }
  if (!/[0-9]/.test(newPass))             { errEl.textContent = '⚠️ Debe tener al menos un número'; return; }
  if (!/[^A-Za-z0-9]/.test(newPass))     { errEl.textContent = '⚠️ Debe tener al menos un carácter especial'; return; }

  if (!window.firebaseAuth || !state.firebaseUser) { errEl.textContent = '⚠️ Firebase no conectado'; return; }

  const btn = document.querySelector('#modal-pass .btn-primary');
  btn.textContent = 'Guardando...'; btn.disabled = true;

  try {
    const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = getFns();
    const cred = EmailAuthProvider.credential(state.firebaseUser.email, oldPass);
    await reauthenticateWithCredential(state.firebaseUser, cred);
    await updatePassword(state.firebaseUser, newPass);
    closeModal('modal-pass');
    showToast('✅ Contraseña actualizada');
  } catch (e) {
    errEl.textContent = firebaseErr(e.code);
  } finally {
    btn.textContent = 'Guardar contraseña'; btn.disabled = false;
  }
}

// ── CAMBIAR CORREO ────────────────────────────────────
function openChangeEmailModal() {
  document.getElementById('new-email').value  = state.currentUser?.email || '';
  document.getElementById('email-pass').value = '';
  document.getElementById('email-error').textContent = '';
  openModal('modal-email');
}

async function changeEmail() {
  const newEmail = document.getElementById('new-email').value.trim();
  const pass     = document.getElementById('email-pass').value;
  const errEl    = document.getElementById('email-error');
  errEl.textContent = '';

  if (!newEmail || !pass)           { errEl.textContent = '⚠️ Rellena todos los campos'; return; }
  if (!newEmail.includes('@'))       { errEl.textContent = '⚠️ Correo no válido'; return; }

  if (!window.firebaseAuth || !state.firebaseUser) { errEl.textContent = '⚠️ Firebase no conectado'; return; }

  const btn = document.querySelector('#modal-email .btn-primary');
  btn.textContent = 'Guardando...'; btn.disabled = true;

  try {
    const { EmailAuthProvider, reauthenticateWithCredential, updateEmail } = getFns();
    const cred = EmailAuthProvider.credential(state.firebaseUser.email, pass);
    await reauthenticateWithCredential(state.firebaseUser, cred);
    await updateEmail(state.firebaseUser, newEmail);

    // Actualizar también en Firestore
    if (window.firebaseDb) {
      const { doc, updateDoc } = getFns();
      await updateDoc(doc(getDb(), 'usuarios', state.firebaseUser.uid), { email: newEmail });
    }
    state.currentUser.email = newEmail;
    closeModal('modal-email');
    showToast('✅ Correo actualizado');
  } catch (e) {
    errEl.textContent = firebaseErr(e.code);
  } finally {
    btn.textContent = 'Guardar correo'; btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════
// NOTIFICACIONES
// ══════════════════════════════════════════════════════
function showNotifications() {
  openModal('modal-notifs');
}

// ══════════════════════════════════════════════════════
// AUTH STATE CHANGE (Firebase)
// ══════════════════════════════════════════════════════
async function initApp() {
  await waitForFirebase();
  if (!window.firebaseAuth) {
    // Modo demo — sin Firebase configurado
    console.warn('[RollerMatch1] Firebase no configurado. Modo demo activado.');
    return;
  }
  const { onAuthStateChanged } = getFns();
  onAuthStateChanged(getAuth(), async user => {
    if (user) {
      state.firebaseUser = user;
      const userData = await loadUserFromFirestore(user.uid);
      state.currentUser = userData;
      if (userData?.onboarded) enterApp();
      else if (userData) { showScreen('onboarding'); initOnboarding(); }
    }
  });
}

initApp();
