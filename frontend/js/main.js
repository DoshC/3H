// =====================================================
//  TRES HORIZONTES — main.js
// =====================================================

const API_URL = 'http://localhost:5000/api';
const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
function openModal(id) {
  $(id).style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  $(id).style.display = 'none';
  document.body.style.overflow = '';
}

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

  if (password !== confirm) {
    showMessage('registerMessage', 'Las contraseñas no coinciden.', 'error');
    return;
  }
  if (password.length < 6) {
    showMessage('registerMessage', 'La contraseña debe tener al menos 6 caracteres.', 'error');
    return;
  }

  setLoading(btn, true);
  try {
    const { ok, data } = await postJSON('/auth/register', { name, email, password });

    if (!ok) {
      const duplicado = /duplicate|unique/i.test(data.error || '');
      const msg = duplicado
        ? 'Ese email ya tiene una cuenta. Inicia sesión.'
        : (data.error || 'No se pudo completar el registro.');
      showMessage('registerMessage', msg, 'error');
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

  setLoading(btn, true);
  try {
    const { ok, data } = await postJSON('/auth/login', { email, password });

    if (!ok) {
      const mensajes = {
        'User not found': 'Esa cuenta no existe. Regístrate primero.',
        'Invalid password': 'Contraseña incorrecta.'
      };
      showMessage('loginMessage', mensajes[data.error] || data.error || 'No se pudo iniciar sesión.', 'error');
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

tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabs.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
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
  ['.cta-video', 'zoom', 0],
  ['.newsletter', 'zoom', 0]
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
  background: '#0A5B4A', transformOrigin: 'left center', transform: 'scaleX(0)',
  zIndex: '100'
});
document.body.appendChild(progress);

// El slider crece 10% por arriba y abajo para que el parallax no deje huecos
if (heroSlider && !reduceMotion) {
  heroSlider.style.top = '-10%';
  heroSlider.style.bottom = '-10%';
}

function onScroll() {
  const y = window.scrollY;

  header.classList.toggle('scrolled', y > 40);

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

// =====================================================
//  HERO SLIDER
// =====================================================
const slides = document.querySelectorAll('.hero-slide');
let slideIdx = 0;
if (slides.length > 1 && !reduceMotion) {
  setInterval(() => {
    slides[slideIdx].classList.remove('active');
    slideIdx = (slideIdx + 1) % slides.length;
    void slides[slideIdx].offsetWidth; // reinicia el zoom lento
    slides[slideIdx].classList.add('active');
  }, 5000);
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
//  SESIÓN: si ya hay token, ir directo al dashboard
// =====================================================
window.addEventListener('load', () => {
  if (localStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
  }
});

console.log('✓ Tres Horizontes — frontend cargado');
