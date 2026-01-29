// ========================================
// VEKTOR WEB — отправка заявок напрямую в Fly.io бот
// Endpoint: POST https://<fly-app>/lead
// ========================================

// 1) Укажи публичный URL Fly приложения (без слэша в конце)
const LEAD_API_BASE_URL = 'https://vektor-web-bot.fly.dev';
const LEAD_API_ENDPOINT = `${LEAD_API_BASE_URL}/lead`;

// 2) Если включишь секрет на Fly (LEAD_SECRET), пропиши здесь тот же
// Иначе оставь пустым.
const LEAD_API_SECRET = ''; // пример: 'my-secret'

// ========================================
// UI: Success message overlay (#successMessage)
// ========================================
function showSuccessMessage(message, opts = {}) {
  const { title = 'Заявка отправлена', hint = '', autoHideMs = 3500 } = opts;

  const successMessage = document.getElementById('successMessage');
  const successContent = successMessage.querySelector('.success-content');

  const h3 = successContent.querySelector('h3');
  const p = successContent.querySelector('p');
  const hintEl = successContent.querySelector('.copy-hint');

  h3.textContent = title;
  p.textContent = message;

  if (hint && hintEl) {
    hintEl.textContent = hint;
    hintEl.style.display = 'block';
  } else if (hintEl) {
    hintEl.style.display = 'none';
  }

  successMessage.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (autoHideMs && autoHideMs > 0) {
    setTimeout(() => hideSuccess(), autoHideMs);
  }
}

function hideSuccess() {
  const successMessage = document.getElementById('successMessage');
  successMessage.classList.remove('active');
  document.body.style.overflow = '';
}

// ========================================
// UTM helpers
// ========================================
function getUtmFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const utmKeys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'yclid',
    'fbclid'
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
    if (Object.keys(utm).length) {
      localStorage.setItem('vektor_utm', JSON.stringify(utm));
    }
  } catch {}
}

function readPersistedUtm() {
  try {
    const raw = localStorage.getItem('vektor_utm');
    if (!raw) return {};
    const utm = JSON.parse(raw);
    return utm && typeof utm === 'object' ? utm : {};
  } catch {
    return {};
  }
}

function getUtmMerged() {
  const fromUrl = getUtmFromUrl();
  const stored = readPersistedUtm();
  // URL utm имеет приоритет
  return { ...stored, ...fromUrl };
}

// ========================================
// Helper: POST to Fly /lead
// Bot expects: name, contact, package, message, page, utm, source
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
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok || !data || data.ok !== true) {
    const code = data && data.code ? data.code : '';
    throw new Error(code || `http_${res.status}`);
  }

  return data;
}

// ========================================
// Forms: отправка заявки на Fly, без открытия Telegram
// ========================================
async function handleTelegramSubmit(event, formId) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
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
      name = document.getElementById('mainName').value.trim();
      contact = document.getElementById('mainContact').value.trim();
      pkg = document.getElementById('mainPackage').value.trim();
      description = document.getElementById('mainDescription').value.trim();
    } else if (formId === 'modalForm') {
      pkg = document.getElementById('modal-package').querySelector('span').textContent.trim();
      name = document.getElementById('modalName').value.trim();
      contact = document.getElementById('modalContact').value.trim();
      description = document.getElementById('modalDescription').value.trim();
    } else {
      throw new Error('unknown_form');
    }

    if (!name || !contact || !pkg || !description) {
      throw new Error('fill_all_fields');
    }

    const payload = {
      name,
      contact,
      package: pkg,
      message: description,            // важно: bot ждёт поле message
      page: window.location.href,
      utm: getUtmMerged(),
      source: 'site_form',
    };

    await sendLeadToApi(payload);

    showSuccessMessage(
      'Заявка отправлена. Менеджер напишет вам в ближайшие 30 минут.',
      { title: 'Заявка принята', hint: '', autoHideMs: 4500 }
    );

    form.reset();
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
      { title: 'Ошибка отправки', hint, autoHideMs: 5500 }
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = prevBtnText || 'Отправить заявку в бота →';
    }
  }
}

// ========================================
// Открытие Telegram (карточки/кейсы/для кого) — оставляем, но делаем контекстнее
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
  window.open(url, '_blank');
}

// Clipboard helper
function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(resolve).catch(reject);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  });
}

// ========================================
// Универсальные функции (без изменений логики)
// ========================================
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    const headerHeight = document.querySelector('.header').offsetHeight;
    const targetPosition = section.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

    window.scrollTo({ top: targetPosition, behavior: 'smooth' });

    document.getElementById('nav').classList.remove('active');
    document.getElementById('burger').classList.remove('active');
  }
}

// Header scroll
const header = document.getElementById('header');
const scrollThreshold = 50;

window.addEventListener('scroll', () => {
  if (window.scrollY > scrollThreshold) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
});

// Mobile menu
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
  burger.classList.toggle('active');
  nav.classList.toggle('active');
  document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
});

document.addEventListener('click', (e) => {
  if (nav.classList.contains('active') && !nav.contains(e.target) && !burger.contains(e.target)) {
    nav.classList.remove('active');
    burger.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Fade-in observer
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
  persistUtm();

  document.querySelectorAll('.section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(15px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
  });

  document.querySelectorAll('.service-card').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    card.style.transition = `opacity 0.4s ease ${index * 0.06}s, transform 0.4s ease ${index * 0.06}s`;
    observer.observe(card);
  });

  document.querySelectorAll('.case-card').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    card.style.transition = `opacity 0.4s ease ${index * 0.06}s, transform 0.4s ease ${index * 0.06}s`;
    observer.observe(card);
  });

  document.querySelectorAll('.timeline-step').forEach((step, index) => {
    step.style.opacity = '0';
    step.style.transform = 'translateY(12px)';
    step.style.transition = `opacity 0.4s ease ${index * 0.06}s, transform 0.4s ease ${index * 0.06}s`;
    observer.observe(step);
  });
});

// Modal
const modal = document.getElementById('modal');
const modalPackage = document.getElementById('modal-package').querySelector('span');
const modalForm = document.getElementById('modalForm');

function openModal(packageName) {
  modalPackage.textContent = packageName;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
  modalForm.reset();
}

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
});

// Form handlers
document.getElementById('contactForm').addEventListener('submit', function(e) {
  handleTelegramSubmit(e, 'contactForm');
});

modalForm.addEventListener('submit', function(e) {
  handleTelegramSubmit(e, 'modalForm');
});

// Animations
document.querySelectorAll('.timeline-step').forEach(step => {
  step.addEventListener('mouseenter', () => {
    step.querySelector('.step-content').style.transform = 'scale(1.005)';
  });

  step.addEventListener('mouseleave', () => {
    step.querySelector('.step-content').style.transform = 'scale(1)';
  });
});

window.addEventListener('load', () => {
  const heroSvg = document.querySelector('.hero-svg');
  if (heroSvg) {
    heroSvg.style.opacity = '0';
    heroSvg.style.transform = 'scale(0.8) rotate(-10deg)';
    heroSvg.style.transition = 'opacity 0.8s ease, transform 0.8s ease';

    setTimeout(() => {
      heroSvg.style.opacity = '1';
      heroSvg.style.transform = 'scale(1) rotate(0deg)';
    }, 300);
  }
});

document.querySelectorAll('.btn, .service-card, .case-card, .for-whom-card, .guarantee-item, .guarantee-left').forEach(element => {
  element.addEventListener('mousedown', () => { element.style.transform = 'scale(0.99)'; });

  element.addEventListener('mouseup', () => {
    setTimeout(() => { if (!element.matches(':hover')) element.style.transform = ''; }, 100);
  });

  element.addEventListener('mouseleave', () => { element.style.transform = ''; });
});
