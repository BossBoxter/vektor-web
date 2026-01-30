// FILE: script.js
// ========================================
// VEKTOR WEB — отправка заявок напрямую в Fly.io бот
// Endpoint: POST https://<fly-app>/lead
// ========================================

// 1) Публичный URL Fly приложения (без слэша в конце)
const LEAD_API_BASE_URL = 'https://vektor-web-bot.fly.dev';
const LEAD_API_ENDPOINT = `${LEAD_API_BASE_URL}/lead`;

// 2) Если включишь секрет на Fly (LEAD_SECRET), пропиши здесь тот же
const LEAD_API_SECRET = ''; // пример: 'my-secret'

// ========================================
// Lock helpers
// ========================================
function lockBody(){ document.body.classList.add('is-locked'); }
function unlockBody(){ document.body.classList.remove('is-locked'); }

// ========================================
// Hero: inline action
// ========================================
function heroStart() {
  const v = (document.getElementById('heroContact')?.value || '').trim();
  scrollToSection('contacts');
  setTimeout(() => {
    const contact = document.getElementById('mainContact');
    if (contact) {
      if (v) contact.value = v;
      contact.focus();
    }
  }, 240);
}

// ========================================
// Success overlay
// ========================================
function showSuccessMessage(message, opts = {}) {
  const { title = 'Заявка отправлена', hint = '', autoHideMs = 0 } = opts;

  const successMessage = document.getElementById('successMessage');
  if (!successMessage) return;

  const successContent = successMessage.querySelector('.success-content');
  if (!successContent) return;

  const h3 = successContent.querySelector('h3');
  const p = successContent.querySelector('p');
  const hintEl = successContent.querySelector('.copy-hint');

  if (h3) h3.textContent = title;
  if (p) p.textContent = message;

  if (hint && hintEl) {
    hintEl.textContent = hint;
    hintEl.style.display = 'block';
  } else if (hintEl) {
    hintEl.style.display = 'none';
  }

  successMessage.classList.add('active');
  successMessage.setAttribute('aria-hidden', 'false');
  lockBody();

  if (autoHideMs && autoHideMs > 0) setTimeout(() => hideSuccess(), autoHideMs);
}

function hideSuccess() {
  const successMessage = document.getElementById('successMessage');
  if (!successMessage) return;

  successMessage.classList.remove('active');
  successMessage.setAttribute('aria-hidden', 'true');
  unlockBody();
}

// Закрытие success по клику на фон
document.addEventListener('click', (e) => {
  const sm = document.getElementById('successMessage');
  if (sm && sm.classList.contains('active') && e.target === sm) hideSuccess();
});

// ========================================
// Privacy policy modal
// ========================================
function openPrivacyModal() {
  const privacyModal = document.getElementById('privacyModal');
  if (!privacyModal) return;

  privacyModal.classList.add('active');
  privacyModal.setAttribute('aria-hidden', 'false');
  lockBody();
}

function closePrivacyModal() {
  const privacyModal = document.getElementById('privacyModal');
  if (!privacyModal) return;

  privacyModal.classList.remove('active');
  privacyModal.setAttribute('aria-hidden', 'true');
  unlockBody();
}

document.addEventListener('click', (e) => {
  const pm = document.getElementById('privacyModal');
  if (pm && pm.classList.contains('active') && e.target === pm) closePrivacyModal();
});

// ========================================
// UTM helpers
// ========================================
function getUtmFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const utmKeys = [
    'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
    'gclid','yclid','fbclid'
  ];
  const utm = {};
  for (const k of utmKeys) {
    const v = p.get(k);
    if (v) utm[k] = v;
  }
  return utm;
}

function persistUtm() {
  try {
    const utm = getUtmFromUrl();
    if (Object.keys(utm).length) localStorage.setItem('vektor_utm', JSON.stringify(utm));
  } catch {}
}

function readPersistedUtm() {
  try {
    const raw = localStorage.getItem('vektor_utm');
    if (!raw) return {};
    const utm = JSON.parse(raw);
    return utm && typeof utm === 'object' ? utm : {};
  } catch { return {}; }
}

function getUtmMerged() {
  const fromUrl = getUtmFromUrl();
  const stored = readPersistedUtm();
  return { ...stored, ...fromUrl };
}

// ========================================
// POST to Fly /lead
// ========================================
async function sendLeadToApi(payload) {
  const headers = { 'Content-Type': 'application/json' };
  if (LEAD_API_SECRET) headers['X-Lead-Secret'] = LEAD_API_SECRET;

  const res = await fetch(LEAD_API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok || !data || data.ok !== true) {
    const code = data && data.code ? data.code : '';
    throw new Error(code || `http_${res.status}`);
  }

  return data;
}

// ========================================
// Forms submit
// ========================================
async function handleTelegramSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  const prevBtnText = submitBtn ? submitBtn.textContent : '';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';
  }

  try {
    const name = (document.getElementById('mainName')?.value || '').trim();
    const contact = (document.getElementById('mainContact')?.value || '').trim();
    const pkg = (document.getElementById('mainPackage')?.value || '').trim();
    const description = (document.getElementById('mainDescription')?.value || '').trim();

    if (!name || !contact || !pkg || !description) throw new Error('fill_all_fields');

    const payload = {
      name,
      contact,
      package: pkg,
      message: description,
      page: window.location.href,
      utm: getUtmMerged(),
      source: 'site_form',
    };

    await sendLeadToApi(payload);

    showSuccessMessage(
      'Заявка отправлена. Менеджер напишет вам в ближайшие 30 минут.',
      { title: 'Заявка принята', hint: '', autoHideMs: 0 }
    );

    if (form && typeof form.reset === 'function') form.reset();
  } catch (err) {
    const msg = (err && err.message) ? String(err.message) : '';
    let hint = '';

    if (msg === 'cors_blocked') hint = 'CORS: домен сайта не добавлен в ALLOWED_ORIGINS на Fly.';
    else if (msg === 'bad_secret') hint = 'Секрет не совпал: проверь X-Lead-Secret и LEAD_SECRET.';
    else if (msg === 'fill_all_fields') hint = 'Заполните все поля.';
    else hint = msg;

    showSuccessMessage(
      'Не удалось отправить заявку. Напишите в Telegram @vektorwebbot.',
      { title: 'Ошибка отправки', hint, autoHideMs: 0 }
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = prevBtnText || 'Отправить заявку';
    }
  }
}

// ========================================
// Telegram open helper (карточки)
// ========================================
function openTelegramBot(additionalInfo = '') {
  const username = 'vektorwebbot';
  const url = `https://t.me/${username}`;

  const utm = getUtmMerged();
  const utmStr = Object.keys(utm).length ? `\n\nUTM: ${JSON.stringify(utm)}` : '';

  const message = additionalInfo
    ? `Здравствуйте! Меня интересует: ${additionalInfo}\n\nОпишите задачу, сроки и желаемый результат.${utmStr}`
    : `Здравствуйте! Хочу консультацию по разработке сайта/бота.\n\nОпишите задачу, сроки и примеры.${utmStr}`;

  copyToClipboard(message).catch(() => {});
  window.open(url, '_blank', 'noopener,noreferrer');
}

function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(resolve).catch(reject);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); resolve(); }
      catch (err) { reject(err); }
      finally { document.body.removeChild(textarea); }
    }
  });
}

// ========================================
// Scroll helper (FIX: в твоём коде был обрезан)
// ========================================
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const header = document.getElementById('header');
  const headerH = header ? header.offsetHeight : 0;

  const top = section.getBoundingClientRect().top + window.pageYOffset - headerH - 10;
  window.scrollTo({ top, behavior: 'smooth' });
}

// ========================================
// Header scrolled state
// ========================================
function onScrollHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  if (window.scrollY > 10) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
}

// ========================================
// Preview tabs + autoswitch
// ========================================
function setPreview(tabName) {
  const tabs = Array.from(document.querySelectorAll('.preview-tab'));
  const screens = Array.from(document.querySelectorAll('.preview-screen'));

  tabs.forEach(t => {
    const isActive = t.dataset.tab === tabName;
    t.classList.toggle('is-active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  screens.forEach(s => {
    const isActive = s.dataset.screen === tabName;
    s.classList.toggle('is-active', isActive);
  });
}

function initPreview() {
  const tabs = Array.from(document.querySelectorAll('.preview-tab'));
  if (!tabs.length) return;

  tabs.forEach(btn => {
    btn.addEventListener('click', () => setPreview(btn.dataset.tab));
  });

  const order = tabs.map(t => t.dataset.tab).filter(Boolean);
  let idx = 0;

  // Автопереключение мягко, если пользователь не кликает
  let lastUser = Date.now();
  tabs.forEach(btn => btn.addEventListener('click', () => { lastUser = Date.now(); }));

  setInterval(() => {
    if (Date.now() - lastUser < 6000) return;
    idx = (idx + 1) % order.length;
    setPreview(order[idx]);
  }, 5000);
}

// ========================================
// Tilt (без библиотек)
// ========================================
function initTilt() {
  const cards = Array.from(document.querySelectorAll('[data-tilt]'));
  if (!cards.length) return;

  const isFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  if (!isFinePointer) return;

  cards.forEach(card => {
    const max = 7;

    function onMove(e) {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const px = (x / r.width) * 2 - 1;
      const py = (y / r.height) * 2 - 1;

      const rx = (-py * max).toFixed(2);
      const ry = (px * max).toFixed(2);

      card.style.transform = `translateY(-2px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }

    function onLeave() {
      card.style.transform = '';
    }

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  });
}

// ========================================
// Legal accordions
// ========================================
function initAccordions() {
  const toggles = Array.from(document.querySelectorAll('.legal-toggle'));
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-accordion');
      const panel = id ? document.getElementById(id) : null;
      if (!panel) return;

      const isOpen = btn.classList.contains('open');

      // close others
      toggles.forEach(b => {
        const bid = b.getAttribute('data-accordion');
        const bp = bid ? document.getElementById(bid) : null;
        if (bp) {
          b.classList.remove('open');
          bp.style.maxHeight = '0px';
          bp.classList.remove('open');
          bp.setAttribute('aria-hidden', 'true');
        }
      });

      if (!isOpen) {
        btn.classList.add('open');
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });
}

// ========================================
// Init
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  persistUtm();

  const form = document.getElementById('contactForm');
  if (form) form.addEventListener('submit', handleTelegramSubmit);

  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  initPreview();
  initTilt();
  initAccordions();
});
