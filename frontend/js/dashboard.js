// =====================================================
//  TRES HORIZONTES — dashboard.js
//  Panel del viajero: resumen, reservas, nueva reserva y perfil.
// =====================================================

const API_URL = 'http://localhost:5000/api';
const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== SESIÓN =====
const token = localStorage.getItem('token');
let user = null;
try { user = JSON.parse(localStorage.getItem('user')); } catch { /* sesión corrupta */ }
if (!token || !user) window.location.replace('index.html');

const state = {
  bookings: null,       // null = cargando, [] = vacío
  bookingsError: null,
  tours: null,
  toursError: null,
  filter: 'todas',
  q: '',
  sort: 'fecha-asc',
  tourId: null,
  newId: null
};

// =====================================================
//  UTILIDADES
// =====================================================
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Las fechas DATE de Postgres llegan como ISO con zona; solo usamos AAAA-MM-DD
function parseDay(s) {
  if (!s) return null;
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
const DAY = 86400000;
const daysUntil = (d) => Math.round((d - today()) / DAY);
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const money = (n) => (Number.isFinite(n) ? `$${Math.round(n).toLocaleString('es-CO')}` : '—');
const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? d.toLocaleDateString('es-CO', opts) : '—');

const STATUS = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada' };
const statusPill = (s) => `<span class="pill ${esc(s in STATUS ? s : 'pending')}">${esc(STATUS[s] || s || 'Pendiente')}</span>`;

const IMAGES = [
  [/nuqu|choc|ballena|pac[ií]fic/i, 'img/nuqui.jpg'],
  [/tayrona|santa marta|sierra|caribe/i, 'img/tayrona.jpg'],
  [/guain|amazon|r[ií]o negro/i, 'img/guainia.jpg']
];
function imageFor(item) {
  if (item.image_url) return item.image_url;
  const text = `${item.name || ''} ${item.destination || ''}`;
  const hit = IMAGES.find(([re]) => re.test(text));
  return hit ? hit[1] : null;
}

const totalOf = (b) => (b.price === null || b.price === undefined ? NaN : Number(b.price) * Number(b.guests));
const isCancelled = (b) => b.status === 'cancelled';
const isUpcoming = (b) => !isCancelled(b) && b.status !== 'completed' && (parseDay(b.travel_date) || 0) >= today();
const isPast = (b) => !isCancelled(b) && !isUpcoming(b);

function relativeDays(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / DAY);
  if (diff <= 0) return 'hoy';
  if (diff === 1) return 'ayer';
  if (diff < 30) return `hace ${diff} días`;
  return fmtDate(d);
}

// ===== TOASTS =====
function toast(text, type = 'info') {
  const icon = { success: 'ph-check-circle', error: 'ph-warning-circle', info: 'ph-info' }[type];
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="ph-fill ${icon}" aria-hidden="true"></i><span></span>`;
  el.querySelector('span').textContent = text;
  const life = type === 'error' ? 6000 : 3500;
  el.style.setProperty('--life', `${life}ms`); // barra de tiempo restante
  $('toasts').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, life);
}

function setBusy(btn, busy, label = 'Guardando…') {
  if (busy) {
    btn.dataset.label = btn.innerHTML;
    btn.textContent = label;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.label || btn.innerHTML;
    btn.disabled = false;
  }
}

// ===== API =====
class ApiError extends Error {}

async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('No hay conexión con el servidor. Revisa que el backend esté activo.');
  }

  if (res.status === 401) {
    sessionExpired();
    throw new ApiError('Tu sesión expiró.');
  }

  let data = null;
  try { data = await res.json(); } catch { /* sin JSON */ }
  if (!res.ok) {
    if (res.status === 404 && !data) throw new ApiError('Esta función necesita la versión actualizada del backend. Reinicia el servidor.');
    throw new ApiError((data && data.error) || `Error ${res.status}`);
  }
  return data;
}

let expiring = false;
function sessionExpired() {
  if (expiring) return;
  expiring = true;
  toast('Tu sesión expiró. Vuelve a iniciar sesión.', 'error');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setTimeout(() => window.location.replace('index.html'), 2000);
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}
document.querySelectorAll('[data-action="logout"]').forEach((b) => b.addEventListener('click', logout));

// =====================================================
//  NAVEGACIÓN ENTRE VISTAS (hash: #resumen, #reservas…)
// =====================================================
const VIEWS = ['resumen', 'reservas', 'reservar', 'perfil'];
const TITLES = { resumen: 'Mi panel', reservas: 'Mis reservas', reservar: 'Reservar', perfil: 'Perfil' };

// Pastilla que se desliza hasta el elemento activo de un grupo.
// Devuelve la función que la recoloca; un ResizeObserver la llama sola
// cuando el grupo cambia de tamaño o pasa de oculto a visible.
function glider(container, cls, activeSelector) {
  if (!container) return () => {};
  const pill = document.createElement('span');
  pill.className = `glider ${cls}`;
  pill.setAttribute('aria-hidden', 'true');
  container.prepend(pill);
  container.classList.add('has-glider');

  const move = () => {
    const t = container.querySelector(activeSelector);
    if (!t || !t.offsetParent) { pill.style.opacity = '0'; return; }
    pill.style.opacity = '';
    pill.style.width = `${t.offsetWidth}px`;
    pill.style.height = `${t.offsetHeight}px`;
    pill.style.transform = `translate3d(${t.offsetLeft}px, ${t.offsetTop}px, 0)`;
  };
  if ('ResizeObserver' in window) new ResizeObserver(move).observe(container);
  // La primera colocación no se anima; a partir de ahí, sí
  requestAnimationFrame(() => requestAnimationFrame(() => pill.classList.add('is-placed')));
  return move;
}
const moveNavPill = glider(document.querySelector('.side-nav'), 'nav-pill', 'a[aria-current="page"]');
const moveFilterThumb = glider($('filterGroup'), 'filter-thumb', '[aria-checked="true"]');

function showView(fromUser = false) {
  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'resumen';
  VIEWS.forEach((v) => { $(v).hidden = v !== name; });
  document.querySelectorAll('.side-nav a').forEach((a) => {
    if (a.dataset.section === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${TITLES[name]} | Tres Horizontes`;
  moveNavPill();
  moveFilterThumb();
  if (fromUser) {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    $('panel').focus({ preventScroll: true });
  }
}
// La vista que sale se desvanece (motion.css › 6) si el navegador lo soporta
window.addEventListener('hashchange', () => {
  if (!document.startViewTransition || reduceMotion) { showView(true); return; }
  const html = document.documentElement;
  html.classList.add('vt-view'); // motion.css › 8: solo se anima el contenido
  const vt = document.startViewTransition(() => showView(true));
  vt.finished.finally(() => html.classList.remove('vt-view'));
});

// Luz que sigue al cursor en los KPIs (dashboard.css › CAPA DINÁMICA)
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.kpi').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

// Reinicia la animación de rebote cuando un valor cambia de verdad
function bump(el, text) {
  if (el.textContent === String(text)) return;
  el.textContent = text;
  if (reduceMotion) return;
  el.classList.remove('bump');
  void el.offsetWidth; // fuerza el reinicio de la animación
  el.classList.add('bump');
}

// =====================================================
//  USUARIO
// =====================================================
function renderUser() {
  const name = user.name || 'Viajero';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  $('avatar').textContent = initials || '·';
  $('userName').textContent = name;
  $('userEmail').textContent = user.email || '';
  $('greetName').textContent = `, ${name.split(' ')[0]}`;
  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  $('today').textContent = hoy.charAt(0).toUpperCase() + hoy.slice(1);
}

// =====================================================
//  RESUMEN
// =====================================================
function countTo(el, target, format = (n) => String(Math.round(n))) {
  if (reduceMotion || !Number.isFinite(target) || target === 0) { el.textContent = format(target); return; }
  const start = performance.now();
  const dur = 900;
  const frame = (now) => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = format(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function errorState(msg, retry, compact = false) {
  return `<div class="state error${compact ? ' compact' : ''}" style="grid-column:1/-1">
    <i class="ph ph-cloud-slash" aria-hidden="true"></i>
    <h3>No pudimos cargar esto</h3>
    <p>${esc(msg)}</p>
    <button type="button" class="btn btn-ghost btn-sm" data-retry="${retry}"><i class="ph ph-arrow-clockwise"></i> Reintentar</button>
  </div>`;
}

function renderSummary() {
  const kpiIds = ['kpiActivas', 'kpiProximas', 'kpiDestinos', 'kpiTotal'];

  if (state.bookingsError) {
    kpiIds.forEach((id) => { $(id).textContent = '—'; });
    $('nextTrip').querySelector('.next-body').innerHTML = errorState(state.bookingsError, 'bookings', true);
    $('recentList').innerHTML = '<li class="muted">Sin datos disponibles.</li>';
    return;
  }
  if (!state.bookings) return; // sigue cargando

  const activas = state.bookings.filter((b) => !isCancelled(b));
  const proximas = state.bookings.filter(isUpcoming).sort((a, b) => parseDay(a.travel_date) - parseDay(b.travel_date));
  const destinos = new Set(activas.map((b) => b.destination).filter(Boolean));
  const conPrecio = activas.filter((b) => Number.isFinite(totalOf(b)));
  const total = conPrecio.reduce((s, b) => s + totalOf(b), 0);

  countTo($('kpiActivas'), activas.length);
  countTo($('kpiProximas'), proximas.length);
  countTo($('kpiDestinos'), destinos.size);
  // Si ninguna reserva trae precio (backend sin actualizar), no inventamos un total
  if (activas.length && !conPrecio.length) $('kpiTotal').textContent = '—';
  else countTo($('kpiTotal'), total, money);

  // Próximo viaje
  const body = $('nextTrip').querySelector('.next-body');
  const next = proximas[0];
  if (!next) {
    body.innerHTML = `<div class="state compact" style="grid-column:1/-1">
      <i class="ph ph-compass" aria-hidden="true"></i>
      <h3>Sin viajes en el calendario</h3>
      <p>Elige una región y nosotros armamos la ruta.</p>
      <a href="#reservar" class="btn btn-primary btn-sm">Reservar un tour</a>
    </div>`;
  } else {
    const d = parseDay(next.travel_date);
    const n = daysUntil(d);
    const img = imageFor(next);
    body.innerHTML = `
      <div class="next-arch" ${img ? `style="background-image:url('${esc(img)}')"` : ''} role="img" aria-label="${esc(next.destination)}"></div>
      <div class="next-info">
        ${statusPill(next.status)}
        <h3 style="margin-top:8px">${esc(next.name)}</h3>
        <p class="loc"><i class="ph ph-map-pin"></i>${esc(next.destination)}</p>
        <div class="countdown">${n === 0 ? '<strong>¡Hoy!</strong>' : `<strong>${n}</strong><span>${n === 1 ? 'día para salir' : 'días para salir'}</span>`}</div>
        <div class="meta">
          <span><i class="ph ph-calendar-blank"></i>${esc(fmtDate(d, { weekday: 'short', day: 'numeric', month: 'long' }))}</span>
          <span><i class="ph ph-users"></i>${esc(next.guests)} ${Number(next.guests) === 1 ? 'viajero' : 'viajeros'}</span>
          ${next.duration ? `<span><i class="ph ph-clock"></i>${esc(next.duration)} días</span>` : ''}
        </div>
      </div>`;
    // La cuenta regresiva sube hasta los días que faltan
    if (n > 0) countTo(body.querySelector('.countdown strong'), n);
  }

  // Actividad reciente
  const recientes = [...state.bookings].sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date)).slice(0, 4);
  $('recentList').innerHTML = recientes.length
    ? recientes.map((b) => `
      <li>
        <span class="dot"><i class="ph ${isCancelled(b) ? 'ph-x' : 'ph-ticket'}" aria-hidden="true"></i></span>
        <div class="txt">
          <strong>${isCancelled(b) ? 'Cancelaste' : 'Reservaste'} ${esc(b.name)}</strong>
          <span>${esc(relativeDays(b.booking_date))} · salida ${esc(fmtDate(parseDay(b.travel_date)))}</span>
        </div>
        ${statusPill(b.status)}
      </li>`).join('')
    : '<li class="muted">Tu actividad aparecerá aquí cuando hagas tu primera reserva.</li>';
}

// =====================================================
//  RESERVAS
// =====================================================
const FILTERS = {
  todas: () => true,
  proximas: isUpcoming,
  pasadas: isPast,
  canceladas: isCancelled
};

function renderBookings() {
  const list = $('bookingList');

  if (state.bookingsError) { list.innerHTML = errorState(state.bookingsError, 'bookings'); return; }
  if (!state.bookings) return;

  // Contadores
  Object.keys(FILTERS).forEach((k) => {
    const el = document.querySelector(`[data-count="${k}"]`);
    if (el) el.textContent = state.bookings.filter(FILTERS[k]).length;
  });
  const up = state.bookings.filter(isUpcoming).length;
  $('navCount').hidden = up === 0;
  $('navCount').textContent = up;

  if (state.bookings.length === 0) {
    list.innerHTML = `<div class="state">
      <i class="ph ph-suitcase-rolling" aria-hidden="true"></i>
      <h3>Aún no tienes reservas</h3>
      <p>Cuando reserves un tour lo verás aquí, con su fecha, estado y detalles.</p>
      <a href="#reservar" class="btn btn-primary">Reservar mi primer tour</a>
    </div>`;
    return;
  }

  const q = state.q.trim().toLowerCase();
  const rows = state.bookings
    .filter(FILTERS[state.filter])
    .filter((b) => !q || `${b.name} ${b.destination} ${b.notes || ''}`.toLowerCase().includes(q))
    .sort((a, b) => {
      if (state.sort === 'reciente') return new Date(b.booking_date) - new Date(a.booking_date);
      const diff = parseDay(a.travel_date) - parseDay(b.travel_date);
      return state.sort === 'fecha-asc' ? diff : -diff;
    });

  if (rows.length === 0) {
    list.innerHTML = `<div class="state">
      <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
      <h3>Nada coincide</h3>
      <p>No hay reservas con ese filtro${q ? ` y la búsqueda “${esc(state.q)}”` : ''}.</p>
      <button type="button" class="btn btn-ghost btn-sm" data-clear-filters>Quitar filtros</button>
    </div>`;
    return;
  }

  list.innerHTML = rows.map((b) => {
    const d = parseDay(b.travel_date);
    const cls = isCancelled(b) ? 'is-cancelled' : isPast(b) ? 'is-past' : '';
    const total = totalOf(b);
    return `
    <article class="booking ${cls} ${b.id === state.newId ? 'is-new' : ''}" data-id="${esc(b.id)}">
      <div class="date-block" aria-hidden="true">
        <b>${d ? d.getDate() : '–'}</b>
        <small>${d ? esc(d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')) : ''}</small>
      </div>
      <div class="booking-main">
        <div class="row1"><h3>${esc(b.name)}</h3>${statusPill(b.status)}</div>
        <div class="meta">
          <span><i class="ph ph-map-pin"></i>${esc(b.destination)}</span>
          <span><i class="ph ph-calendar-blank"></i>${esc(fmtDate(d))}</span>
          <span><i class="ph ph-users"></i>${esc(b.guests)}</span>
          ${isUpcoming(b) ? `<span><i class="ph ph-hourglass-medium"></i>${daysUntil(d) === 0 ? 'hoy' : `en ${daysUntil(d)} días`}</span>` : ''}
        </div>
      </div>
      <div class="booking-side">
        <span class="amt">${Number.isFinite(total) ? money(total) : ''}</span>
        ${isUpcoming(b) ? `<button type="button" class="btn-text" data-cancel="${esc(b.id)}">Cancelar</button>` : ''}
      </div>
    </article>`;
  }).join('');
}

// Filtros, búsqueda y orden
$('filterGroup').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-filter]');
  if (!btn) return;
  setFilter(btn.dataset.filter);
});
// Flechas para moverse entre filtros (patrón radiogroup)
$('filterGroup').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const keys = Object.keys(FILTERS);
  const i = keys.indexOf(state.filter);
  const next = keys[(i + (e.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length];
  setFilter(next);
  document.querySelector(`[data-filter="${next}"]`).focus();
});
function setFilter(f) {
  state.filter = f;
  document.querySelectorAll('[data-filter]').forEach((b) => {
    const on = b.dataset.filter === f;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  moveFilterThumb();
  renderBookings();
}
let searchTimer;
$('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.q = e.target.value; renderBookings(); }, 150);
});
$('sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; renderBookings(); });

// Acciones delegadas: cancelar, reintentar, limpiar filtros
document.addEventListener('click', (e) => {
  const retry = e.target.closest('[data-retry]');
  if (retry) {
    if (retry.dataset.retry === 'tours') loadTours(); else loadBookings();
    return;
  }

  if (e.target.closest('[data-clear-filters]')) {
    $('searchInput').value = '';
    state.q = '';
    setFilter('todas');
    return;
  }

  const cancelBtn = e.target.closest('[data-cancel]');
  if (cancelBtn) confirmCancel(cancelBtn.dataset.cancel, cancelBtn);
});

function confirmCancel(id, btn) {
  const b = state.bookings.find((x) => String(x.id) === String(id));
  if (!b) return;
  const dlg = $('confirmDialog');
  $('confirmText').textContent = `${b.name}, salida el ${fmtDate(parseDay(b.travel_date), { day: 'numeric', month: 'long' })}. Esta acción no se puede deshacer.`;
  dlg.returnValue = '';
  dlg.showModal();
  dlg.addEventListener('close', async () => {
    if (dlg.returnValue !== 'si') { btn.focus(); return; }
    btn.disabled = true;
    btn.textContent = 'Cancelando…';
    try {
      const updated = await api(`/bookings/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' });
      b.status = (updated && updated.status) || 'cancelled';
      toast('Reserva cancelada.', 'success');
      renderAll();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Cancelar';
    }
  }, { once: true });
}

// =====================================================
//  NUEVA RESERVA
// =====================================================
const hasPrice = (t) => t && t.price !== null && t.price !== undefined && Number.isFinite(Number(t.price));

function renderTours() {
  const box = $('tourOptions');
  if (state.toursError) { box.innerHTML = errorState(state.toursError, 'tours', true); return; }
  if (!state.tours) return;
  if (state.tours.length === 0) {
    box.innerHTML = `<div class="state compact" style="grid-column:1/-1">
      <i class="ph ph-map-trifold" aria-hidden="true"></i>
      <h3>Aún no hay tours publicados</h3>
      <p>Estamos preparando las próximas salidas. Vuelve pronto o escríbenos para un viaje a medida.</p>
    </div>`;
    return;
  }

  box.innerHTML = state.tours.map((t) => `
    <label class="tour-opt">
      <input type="radio" name="tour" value="${esc(t.id)}" ${String(t.id) === String(state.tourId) ? 'checked' : ''}>
      <span class="box">
        <span class="name">${esc(t.name)}</span>
        <span class="dest">${esc(t.destination)}</span>
        <span class="foot">
          <span>${t.duration ? `${esc(t.duration)} días` : ''}</span>
          <b>${hasPrice(t) ? money(Number(t.price)) : 'Consultar'}</b>
        </span>
      </span>
    </label>`).join('');
}

$('tourOptions').addEventListener('change', (e) => {
  if (e.target.name !== 'tour') return;
  state.tourId = e.target.value;
  updateSummary();
});

function selectedTour() {
  return (state.tours || []).find((t) => String(t.id) === String(state.tourId)) || null;
}

function clampGuests() {
  const input = $('guests');
  let n = parseInt(input.value, 10);
  if (!Number.isFinite(n)) n = 1;
  n = Math.min(Math.max(n, 1), 20);
  input.value = n;
  document.querySelector('[data-step="-1"]').disabled = n <= 1;
  document.querySelector('[data-step="1"]').disabled = n >= 20;
  return n;
}

document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
  $('guests').value = (parseInt($('guests').value, 10) || 1) + Number(b.dataset.step);
  clampGuests();
  updateSummary();
}));
$('guests').addEventListener('change', () => { clampGuests(); updateSummary(); });
$('guests').addEventListener('input', updateSummary);
$('travelDate').addEventListener('input', () => { $('travelDate').removeAttribute('aria-invalid'); updateSummary(); });

function updateSummary() {
  const t = selectedTour();
  const guests = Math.max(parseInt($('guests').value, 10) || 1, 1);
  const d = parseDay($('travelDate').value);

  $('sumTour').textContent = t ? t.name : '—';
  $('sumDate').textContent = d ? fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  bump($('sumGuests'), guests);
  $('sumPrice').textContent = hasPrice(t) ? money(Number(t.price)) : (t ? 'Consultar' : '—');
  bump($('sumTotal'), hasPrice(t) ? money(Number(t.price) * guests) : '—');

  const visual = $('sumVisual');
  const img = t ? imageFor(t) : null;
  visual.style.backgroundImage = img ? `url('${img}')` : '';
  visual.classList.toggle('has-img', Boolean(img));
  visual.querySelector('span').textContent = t ? t.destination : 'Selecciona un tour';
}

$('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('bookBtn');
  const t = selectedTour();
  const dateStr = $('travelDate').value;
  const d = parseDay(dateStr);
  const guests = clampGuests();

  if (!t) {
    toast('Elige un tour para continuar.', 'error');
    $('tourOptions').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    const first = $('tourOptions').querySelector('input');
    if (first) first.focus();
    return;
  }
  if (!d || d < today()) {
    $('travelDate').setAttribute('aria-invalid', 'true');
    $('travelDate').focus();
    toast(d ? 'La fecha de salida no puede estar en el pasado.' : 'Elige una fecha de salida.', 'error');
    return;
  }

  setBusy(btn, true, 'Reservando…');
  try {
    const created = await api('/bookings', {
      method: 'POST',
      body: { tour_id: t.id, travel_date: dateStr, guests, notes: $('notes').value.trim() }
    });
    state.newId = created && created.id;
    toast(`¡Listo! Reservaste ${t.name}.`, 'success');
    $('bookingForm').reset();
    state.tourId = null;
    renderTours();
    clampGuests();
    updateSummary();
    setFilter('todas');
    await loadBookings();
    location.hash = '#reservas';
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy(btn, false);
  }
});

// =====================================================
//  PERFIL
// =====================================================
function fillProfile() {
  $('profileName').value = user.name || '';
  $('profileEmail').value = user.email || '';
  $('profilePhone').value = user.phone || '';
}

$('profileName').addEventListener('input', () => $('profileName').removeAttribute('aria-invalid'));

$('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('profileName').value.trim();
  const phone = $('profilePhone').value.trim();
  if (!name) {
    $('profileName').setAttribute('aria-invalid', 'true');
    $('profileName').focus();
    toast('El nombre no puede quedar vacío.', 'error');
    return;
  }

  const btn = $('profileBtn');
  setBusy(btn, true);
  try {
    const saved = await api('/users/me', { method: 'PUT', body: { name, phone } });
    user = { ...user, name: saved.name, phone: saved.phone || '' };
    localStorage.setItem('user', JSON.stringify(user));
    renderUser();
    toast('Perfil actualizado.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy(btn, false);
  }
});

// =====================================================
//  CARGA DE DATOS
// =====================================================
function renderAll() {
  renderSummary();
  renderBookings();
}

async function loadBookings() {
  state.bookingsError = null;
  try {
    const data = await api('/bookings');
    state.bookings = Array.isArray(data) ? data : [];
  } catch (err) {
    state.bookings = null;
    state.bookingsError = err.message;
  }
  renderAll();
}

async function loadTours() {
  state.toursError = null;
  state.tours = null;
  try {
    const res = await fetch(`${API_URL}/tours`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.tours = Array.isArray(data) ? data : [];
  } catch {
    state.toursError = 'No pudimos traer los tours disponibles.';
  }
  renderTours();
  updateSummary();
}

// =====================================================
//  INICIO
// =====================================================
if (token && user) {
  renderUser();
  fillProfile();
  $('travelDate').min = toISO(today());
  clampGuests();
  setFilter('todas');
  showView(false);
  loadBookings();
  loadTours();
  // Activa las animaciones de entrada (dashboard.css › ENTRADA AL CARGAR)
  // en el siguiente frame, cuando el primer render ya está en el DOM.
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
}
