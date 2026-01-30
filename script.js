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
function lockBody() { document.body.classList.add('is-locked'); }
function unlockBody() { document.body.classList.remove('is-locked'); }

// ========================================
// Hero: inline action (вместо CTA)
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
  }, 220);
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

  const modal = document.getElementById('modal');
  const privacyModal = document.getElementById('privacyModal');
  const modalOpen = modal && modal.classList.contains('active');
  const privacyOpen = privacyModal && privacyModal.classList.contains('active');

  if (!modalOpen && !privacyOpen) unlockBody();
}

// Закрытие success по клику на фон
document.addEventListener('click', (e) => {
  const sm = document.getElementById('successMessage');
  if (sm && sm.classList.contains('active') && e.target === sm) hideSuccess();
});

// ========================================
// Privacy policy modal (для формы)
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

  const modal = document.getElementById('modal');
  const sm = document.getElementById('successMessage');
  const modalOpen = modal && modal.classList.contains('active');
  const smOpen = sm && sm.classList.contains('active');

  if (!modalOpen && !smOpen) unlockBody();
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
// Forms submit (без открытия Telegram)
// ========================================
async function handleTelegramSubmit(event, formId) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  const prevBtnText = submitBtn ? submitBtn.textContent : '';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';
  }

  try {
    let name = '';
    let contact = '';
    let pkg = '';
    let description = '';

    if (formId === 'contactForm') {
      name = (document.getElementById('mainName')?.value || '').trim();
      contact = (document.getElementById('mainContact')?.value || '').trim();
      pkg = (document.getElementById('mainPackage')?.value || '').trim();
      description = (document.getElementById('mainDescription')?.value || '').trim();
    } else if (formId === 'modalForm') {
      const pkgSpan = document.getElementById('modal-package')?.querySelector('span');
      pkg = (pkgSpan ? pkgSpan.textContent : '').trim();
      name = (document.getElementById('modalName')?.value || '').trim();
      contact = (document.getElementById('modalContact')?.value || '').trim();
      description = (document.getElementById('modalDescription')?.value || '').trim();
    } else {
      throw new Error('unknown_form');
    }

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
    if (formId === 'modalForm') closeModal();
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
// Telegram open helper (карточки/кейсы)
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
// Scroll helper
// ========================================
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const header
