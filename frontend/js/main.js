// =====================================================
//  TRES HORIZONTES — main.js
// =====================================================

const API_URL = 'http://localhost:5000/api';
const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// =====================================================
//  UTILIDADES
// =====================================================
function showMessage(id, text, type = 'info') {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'error' ? '#B42318' : type === 'success' ? '#0A5B4A' : '#2D2D2D';
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.label = btn.textContent;
    btn.textContent = 'Enviando...';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.label || btn.textContent;
    btn.disabled = false;
  }
}

async function postJSON(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data = {};
  try { data = await res.json(); } catch { /* respuesta sin JSON */ }
  return { ok: res.ok, status: res.status, data };
}

function saveSession(data) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
}

// =====================================================
//  MODALES
// =====================================================
let lastFocus = null;

function openModal(id) {
  const modal = $(id);
  lastFocus = document.activeElement;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const first = modal.querySelector('input');
  if (first) setTimeout(() => first.focus(), 50);
}

function closeModal(id) {
  const modal = $(id);
  if (!modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  modal.querySelectorAll('[aria-invalid]').forEach((f) => f.removeAttribute('aria-invalid'));
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}

// Mantiene el foco dentro del modal abierto
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const modal = document.querySelector('.modal.is-open');
  if (!modal) return;
  const focusables = modal.querySelectorAll('button, input, a[href]');
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// Marca un campo como inválido y lleva el foco a él
function invalid(fieldId, msgId, text) {
  const f = $(fieldId);
  f.setAttribute('aria-invalid', 'true');
  f.focus();
  showMessage(msgId, text, 'error');
}
document.querySelectorAll('.modal .field').forEach((f) => {
  f.addEventListener('input', () => f.removeAttribute('aria-invalid'));
});

function openRegisterModal() {
  $('registerForm').reset();
  showMessage('registerMessage', '');
  openModal('registerModal');
}

function closeRegisterModal() { closeModal('registerModal'); }

function openLoginModal() {
  $('loginForm').reset();
  showMessage('loginMessage', '');
  openModal('loginModal');
}

function closeLoginModal() { closeModal('loginModal'); }

['registerModal', 'loginModal'].forEach((id) => {
  $(id).addEventListener('click', (e) => {
    if (e.target === $(id)) closeModal(id);
  });
});

// =====================================================
//  REGISTRO
// =====================================================
$('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = $('regName').value.trim();
  const email = $('regEmail').value.trim().toLowerCase();
  const password = $('regPassword').value;
  const confirm = $('regPasswordConfirm').value;
  const btn = e.submitter || $('registerForm').querySelector('button[type="submit"]');

  if (!name) return invalid('regName', 'registerMessage', 'Escribe tu nombre.');
  if (!$('regEmail').checkValidity() || !email) return invalid('regEmail', 'registerMessage', 'Escribe un email válido.');
  if (password.length < 8 || password.length > 72) return invalid('regPassword', 'registerMessage', 'La contraseña debe tener entre 8 y 72 caracteres.');
  if (password !== confirm) return invalid('regPasswordConfirm', 'registerMessage', 'Las contraseñas no coinciden.');

  setLoading(btn, true);
  try {
    const { ok, data } = await postJSON('/auth/register', { name, email, password });

    if (!ok) {
      // El servidor ya responde con mensajes en español y sin detalles internos
      showMessage('registerMessage', data.error || 'No se pudo completar el registro.', 'error');
      return;
    }

    saveSession(data);
    showMessage('registerMessage', 'Registro completado. Te llevamos a tu dashboard.', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1800);
  } catch {
    showMessage('registerMessage', 'No hay conexión con el servidor. Revisa que el backend esté activo.', 'error');
  } finally {
    setLoading(btn, false);
  }
});

// =====================================================
//  LOGIN
// =====================================================
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = $('loginEmail').value.trim().toLowerCase();
  const password = $('loginPassword').value;
  const btn = e.submitter || $('loginForm').querySelector('button[type="submit"]');

  if (!email || !$('loginEmail').checkValidity()) return invalid('loginEmail', 'loginMessage', 'Escribe un email válido.');
  if (!password) return invalid('loginPassword', 'loginMessage', 'Escribe tu contraseña.');

  setLoading(btn, true);
  try {
    const { ok, data } = await postJSON('/auth/login', { email, password });

    if (!ok) {
      // Mensaje único "Email o contraseña incorrectos" para no revelar qué cuentas existen
      showMessage('loginMessage', data.error || 'No se pudo iniciar sesión.', 'error');
      return;
    }

    saveSession(data);
    showMessage('loginMessage', 'Sesión iniciada. Cargando tu dashboard...', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
  } catch {
    showMessage('loginMessage', 'No hay conexión con el servidor. Revisa que el backend esté activo.', 'error');
  } finally {
    setLoading(btn, false);
  }
});

// =====================================================
//  NEWSLETTER
// =====================================================
async function suscribirNewsletter() {
  const form = $('newsletterForm');
  const input = form.querySelector('input[type="email"]');
  const btn = form.querySelector('button');
  const email = input.value.trim().toLowerCase();

  if (!email || !input.checkValidity()) {
    input.reportValidity();
    return;
  }

  btn.disabled = true;
  try {
    const { ok } = await postJSON('/newsletter', { email });
    btn.textContent = ok ? 'Inscrito' : 'Intenta de nuevo';
    if (ok) form.reset();
  } catch {
    btn.textContent = 'Sin conexión';
  } finally {
    setTimeout(() => {
      btn.textContent = 'Inscribirse';
      btn.disabled = false;
    }, 2500);
  }
}

$('newsletterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  suscribirNewsletter();
});

// =====================================================
//  TOURS: pestañas con animación escalonada
// =====================================================
const tabs = document.querySelectorAll('.tab-btn');
const tourCards = document.querySelectorAll('.tour-card');
let activeTab = 'destination';

function showTab(cat) {
  activeTab = cat;
  let i = 0;

  tourCards.forEach((card) => {
    const match = card.dataset.cat === cat;
    card.classList.toggle('show', match);
    card.classList.remove('is-visible', 'is-done');
    card.style.removeProperty('--d');

    if (!match || reduceMotion) return;

    card.style.setProperty('--d', `${i * 90}ms`);
    i++;
    // Doble rAF: el navegador pinta el estado inicial antes de animar
    requestAnimationFrame(() => requestAnimationFrame(() => {
      card.classList.add('is-visible');
      card.addEventListener('transitionend', () => card.classList.add('is-done'), { once: true });
    }));
  });
}

// Indicador que se desliza bajo la pestaña activa
const tabRow = document.querySelector('.tab-row');
let tabIndicator = null;
if (tabRow) {
  tabIndicator = document.createElement('span');
  tabIndicator.className = 'tab-indicator';
  tabIndicator.setAttribute('aria-hidden', 'true');
  tabRow.prepend(tabIndicator);
  tabRow.classList.add('has-indicator');
}

function moveIndicator() {
  const active = tabRow && tabRow.querySelector('.tab-btn.active');
  if (!active || !tabIndicator) return;
  tabIndicator.style.width = `${active.offsetWidth}px`;
  tabIndicator.style.height = `${active.offsetHeight}px`;
  tabIndicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
}

if (tabIndicator) {
  moveIndicator();
  // Recoloca cuando cargan las fuentes (cambian los anchos) y luego activa la transición
  document.fonts.ready.then(() => {
    moveIndicator();
    requestAnimationFrame(() => tabIndicator.classList.add('is-ready'));
  });
  window.addEventListener('resize', moveIndicator);
}

tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabs.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    moveIndicator();
    showTab(btn.dataset.tab);
  });
});

// =====================================================
//  REVEAL AL HACER SCROLL
//  [selector, variante, separación entre elementos en ms]
// =====================================================
const REVEAL = [
  ['#destinations .section-head', 'down', 0],
  ['.section-head', '', 0],
  ['.tab-row', '', 0],
  ['.dest-card', 'down', 110],
  ['.why-card', '', 120],
  ['.country-row', 'left', 80],
  ['.team-card', 'zoom', 100],
  ['.blog-card', '', 110],
  ['.faq-item', '', 90],
  ['.faq-wrap > div:first-child', 'left', 0],
  ['.cta-video', 'zoom', 0],
  ['.newsletter', 'zoom', 0],
  ['.footer-mark', '', 0]
];

const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    el.classList.add('is-visible');
    el.addEventListener('transitionend', () => el.classList.add('is-done'), { once: true });
    obs.unobserve(el);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

// Las pestañas de tours se animan cuando la sección entra en pantalla
const toursSection = $('tours');
if (toursSection && !reduceMotion) {
  const toursObserver = new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) {
      showTab(activeTab);
      obs.disconnect();
    }
  }, { threshold: 0.15 });
  toursObserver.observe(toursSection);
}

if (!reduceMotion) {
  REVEAL.forEach(([sel, variant, step]) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (el.classList.contains('reveal')) return; // ya lo animó una regla más específica
      const hermanos = Array.from(el.parentElement.children).filter((c) => c.matches(sel));
      const idx = Math.max(hermanos.indexOf(el), 0);

      el.classList.add('reveal');
      if (variant) el.classList.add(`reveal--${variant}`);
      el.style.setProperty('--d', `${idx * step}ms`);
      revealObserver.observe(el);
    });
  });

  // Las tarjetas de tours se marcan como reveal; showTab() las activa
  tourCards.forEach((card) => card.classList.add('reveal'));
}

// =====================================================
//  FRASE QUE SE ILUMINA PALABRA POR PALABRA
// =====================================================
const taglineSection = $('tagline');
const taglineText = taglineSection ? taglineSection.querySelector('.tagline-text') : null;
let taglineWords = [];

if (taglineText && !reduceMotion) {
  const palabras = taglineText.textContent.trim().split(/\s+/);
  taglineText.innerHTML = palabras.map((p) => `<span class="word">${p}</span>`).join(' ');
  taglineWords = Array.from(taglineText.querySelectorAll('.word'));
}

function lightTagline() {
  if (!taglineWords.length) return;
  const r = taglineSection.getBoundingClientRect();
  // Progreso: 0 cuando la sección empieza a entrar, 1 cuando ya pasó la línea de disparo
  const trigger = window.innerHeight * 0.75;
  const progreso = Math.min(Math.max((trigger - r.top) / r.height, 0), 1);
  const encendidas = Math.round(progreso * taglineWords.length);
  taglineWords.forEach((w, i) => w.classList.toggle('is-lit', i < encendidas));
}

// =====================================================
//  SCROLL: header, barra de progreso y parallax del hero
// =====================================================
const header = document.querySelector('header');
const hero = document.querySelector('.hero');
const heroSlider = document.querySelector('.hero-slider');

// Barra de progreso: se escala con transform (no se anima width)
const progress = document.createElement('div');
Object.assign(progress.style, {
  position: 'fixed', top: '0', left: '0', right: '0', height: '3px',
  background: 'linear-gradient(90deg, #0A5B4A, #D4A574)',
  transformOrigin: 'left center', transform: 'scaleX(0)',
  zIndex: '100'
});
document.body.appendChild(progress);

// El slider crece 10% por arriba y abajo para que el parallax no deje huecos
if (heroSlider && !reduceMotion) {
  heroSlider.style.top = '-10%';
  heroSlider.style.bottom = '-10%';
}

let lastY = window.scrollY;

function onScroll() {
  const y = window.scrollY;

  header.classList.toggle('scrolled', y > 40);

  // El header se esconde al bajar y reaparece al subir
  const bajando = y > lastY + 4;
  const subiendo = y < lastY - 4;
  const bloqueado = header.classList.contains('nav-open')
    || header.matches(':focus-within')
    || document.querySelector('.modal.is-open');
  if (bajando && y > 480 && !bloqueado) header.classList.add('is-hidden');
  else if (subiendo || y <= 480) header.classList.remove('is-hidden');
  if (bajando || subiendo) lastY = y;

  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

  if (heroSlider && hero && !reduceMotion && y < window.innerHeight) {
    const shift = Math.min(y * 0.25, hero.offsetHeight * 0.1);
    heroSlider.style.transform = `translate3d(0, ${shift}px, 0)`;
  }

  lightTagline();
}

let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    onScroll();
    ticking = false;
  });
}, { passive: true });
onScroll();

header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

// =====================================================
//  HERO SLIDER con indicadores
// =====================================================
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.hero-dot');
const SLIDE_MS = 6000;
let slideIdx = 0;
let slideTimer = null;

document.documentElement.style.setProperty('--slide-ms', `${SLIDE_MS}ms`);

function goToSlide(n) {
  slides[slideIdx].classList.remove('active');
  if (dots[slideIdx]) {
    dots[slideIdx].classList.remove('is-active');
    dots[slideIdx].setAttribute('aria-pressed', 'false');
  }
  slideIdx = (n + slides.length) % slides.length;
  void slides[slideIdx].offsetWidth; // reinicia el zoom lento
  slides[slideIdx].classList.add('active');
  if (dots[slideIdx]) {
    void dots[slideIdx].offsetWidth; // reinicia la barra de progreso
    dots[slideIdx].classList.add('is-active');
    dots[slideIdx].setAttribute('aria-pressed', 'true');
  }
}

function startAutoplay() {
  clearInterval(slideTimer);
  if (reduceMotion || slides.length < 2) return;
  slideTimer = setInterval(() => goToSlide(slideIdx + 1), SLIDE_MS);
}

dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    goToSlide(i);
    startAutoplay();
  });
});

if (reduceMotion) document.querySelector('.hero-dots')?.classList.add('is-static');
startAutoplay();

// =====================================================
//  TITULAR DEL HERO: entra palabra por palabra
// =====================================================
// Parte un título en .w > span (con --i) conservando sus <em>.
// El texto completo queda en aria-label para lectores de pantalla.
function splitWords(el) {
  const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let i = 0;
  const wrapWords = (text) => text.split(/(\s+)/).map((part) => (
    part.trim() ? `<span class="w"><span style="--i:${i++}">${escape(part)}</span></span>` : part
  )).join('');

  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  el.innerHTML = Array.from(el.childNodes).map((node) => {
    if (node.nodeType === Node.TEXT_NODE) return wrapWords(node.textContent);
    if (node.nodeType === Node.ELEMENT_NODE) {
      node.innerHTML = wrapWords(node.textContent);
      return node.outerHTML;
    }
    return '';
  }).join('');
}

const heroTitle = document.querySelector('.hero h1');
if (heroTitle && !reduceMotion) {
  splitWords(heroTitle);
  heroTitle.classList.add('is-split');
}

// Títulos de sección: suben palabra por palabra al aparecer (motion.css › 2)
if (!reduceMotion) {
  document.querySelectorAll('.section-head h2, .faq-wrap h2, .cta-video h2, .newsletter h2').forEach((h2) => {
    splitWords(h2);
    h2.classList.add('split');
  });
}

// =====================================================
//  INTERACCIONES CON CURSOR (solo ratón / trackpad)
// =====================================================
// Luz que sigue al cursor en las tarjetas de valores
if (canHover) {
  document.querySelectorAll('.why-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

// Inclinación 3D suave en las tarjetas arco
if (canHover && !reduceMotion) {
  document.querySelectorAll('.dest-card .arch-visual, .tour-card .arch-visual').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) translateY(-8px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

// Vista previa flotante que sigue al cursor en la lista de regiones
if (canHover && !reduceMotion) {
  const preview = document.createElement('div');
  preview.className = 'row-preview';
  preview.setAttribute('aria-hidden', 'true');
  document.body.appendChild(preview);

  let x = 0, y = 0, tx = 0, ty = 0;
  let active = false;
  let raf = null;

  const target = (e) => {
    // Se pone a la derecha del cursor, o a la izquierda si no cabe
    tx = e.clientX + 232 > window.innerWidth ? e.clientX - 232 : e.clientX + 32;
    ty = e.clientY - 120;
  };

  const loop = () => {
    const dx = tx - x;
    x += dx * 0.16;
    y += (ty - y) * 0.16;
    const rot = Math.max(-10, Math.min(10, dx * 0.15));
    preview.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
    raf = (active || Math.abs(dx) > 0.5) ? requestAnimationFrame(loop) : null;
  };

  const hide = () => { active = false; preview.classList.remove('is-on'); };

  document.querySelectorAll('.country-row[data-img]').forEach((row) => {
    row.addEventListener('pointerenter', (e) => {
      preview.style.backgroundImage = `url('${row.dataset.img}')`;
      target(e);
      if (!active && !preview.classList.contains('is-on')) { x = tx; y = ty; }
      active = true;
      preview.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(loop);
    });
    row.addEventListener('pointermove', target);
    row.addEventListener('pointerleave', hide);
  });
  window.addEventListener('scroll', () => { if (active) hide(); }, { passive: true });
}

// =====================================================
//  CONTADORES DEL HERO (solo valores numéricos)
// =====================================================
function countUp(el, delay = 0) {
  const m = el.textContent.trim().match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return;

  const target = parseFloat(m[1]);
  const suffix = m[2];
  const decimals = (m[1].split('.')[1] || '').length;
  const duration = 1400;

  el.textContent = (0).toFixed(decimals) + suffix;

  setTimeout(() => {
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, delay);
}

if (!reduceMotion) {
  document.querySelectorAll('.hero-strip-item strong').forEach((el, i) => {
    countUp(el, 900 + i * 150);
  });
}

// =====================================================
//  SMOOTH SCROLL PARA ANCLAS
// =====================================================
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#' || href === '#main') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  });
});

// =====================================================
//  MENÚ MÓVIL (pantalla completa)
// =====================================================
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

function setMenu(open) {
  header.classList.toggle('nav-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  document.body.style.overflow = open ? 'hidden' : '';
}

menuToggle.addEventListener('click', () => {
  setMenu(!header.classList.contains('nav-open'));
});

navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

// Escape cierra el menú y los modales
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  setMenu(false);
  closeModal('registerModal');
  closeModal('loginModal');
});

// =====================================================
//  EFECTO MAGNÉTICO EN BOTONES
// =====================================================
if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.hero .btn-primary').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.08}px, ${y * 0.15}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// =====================================================
//  BOTÓN DE VIDEO (pendiente de conectar)
// =====================================================
document.querySelectorAll('.play-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    console.info('Video pendiente: aquí va el modal o embed del video');
  });
});

// =====================================================
//  SESIÓN: con token, la barra muestra "Mi panel" en vez de
//  redirigir (antes la landing era inaccesible con sesión).
// =====================================================
const isLoggedIn = () => Boolean(localStorage.getItem('token'));

if (isLoggedIn()) {
  let nombre = '';
  try { nombre = (JSON.parse(localStorage.getItem('user')) || {}).name || ''; } catch { /* sesión corrupta */ }
  const actions = $('authActions');
  actions.querySelectorAll('.btn').forEach((b) => b.remove());
  const link = document.createElement('a');
  link.href = 'dashboard.html';
  link.className = 'btn btn-primary btn-sm';
  link.innerHTML = '<i class="ph ph-squares-four"></i>';
  link.append(nombre ? ` Hola, ${nombre.split(' ')[0]}` : ' Mi panel');
  actions.prepend(link);
}

// =====================================================
//  TARJETAS DE TOURS: llevan a reservar
// =====================================================
function irAReservar() {
  if (isLoggedIn()) window.location.href = 'dashboard.html#reservar';
  else openLoginModal();
}
tourCards.forEach((card) => {
  card.addEventListener('click', irAReservar);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irAReservar(); }
  });
});

console.log('✓ Tres Horizontes — frontend cargado');

// =====================================================
//  MENÚ: marca la sección que está en pantalla (motion.css › 7)
// =====================================================
const spyLinks = Array.from(document.querySelectorAll('.nav-links > a[href^="#"], .nav-links > .has-dropdown > a[href^="#"]'));
const spySections = ['top', ...spyLinks.map((a) => a.getAttribute('href').slice(1))]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

if (spyLinks.length && 'IntersectionObserver' in window) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      spyLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' }); // franja en el centro de la pantalla
  spySections.forEach((s) => spy.observe(s));
}
