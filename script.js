// ========================================
// VEKTOR WEB — отправка заявки через Cloudflare Worker
// Worker URL: https://vektor-web.anton-bezzz2003.workers.dev
// ========================================

const WORKER_ENDPOINT = 'https://vektor-web.anton-bezzz2003.workers.dev/lead';

// ========================================
// helpers
// ========================================
function safeTrim(v) {
  return (v ?? '').toString().trim();
}

function getPageUrl() {
  return window.location.href;
}

function formatRuDateTime() {
  try {
    return new Date().toLocaleString('ru-RU');
  } catch {
    return new Date().toISOString();
  }
}

// ========================================
// UI: success overlay (использует существующий #successMessage из твоего HTML/CSS)
// ========================================
function showSuccessMessage(message, opts = {}) {
  const { title = 'Заявка отправлена', hint = '', autoHideMs = 3500 } = opts;

  const successMessage = document.getElementById('successMessage');
  if (!successMessage) return;

  const successContent = successMessage.querySelector('.success-content');
  if (!successContent) return;

  const h3 = successContent.querySelector('h3');
  const p = successContent.querySelector('p');
  const hintEl = successContent.querySelector('.copy-hint');

  if (h3) h3.textContent = title;
  if (p) p.textContent = message;

  if (hintEl) {
    if (hint) {
      hintEl.textContent = hint;
      hintEl.style.display = 'block';
    } else {
      hintEl.style.display = 'none';
    }
  }

  successMessage.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (autoHideMs && autoHideMs > 0) {
    setTimeout(() => hideSuccess(), autoHideMs);
  }
}

function hideSuccess() {
  const successMessage = document.getElementById('successMessage');
  if (!successMessage) return;
  successMessage.classList.remove('active');
  document.body.style.overflow = '';
}

// ========================================
// API: отправка лида в Worker
// ========================================
async function sendLeadToWorker(payload) {
  const res = await fetch(WORKER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ========================================
// forms: main + modal
// ========================================
async function handleLeadSubmit(event, formId) {
  event.preventDefault();

  const page = getPageUrl();
  const createdAt = formatRuDateTime();

  let name = '';
  let contact = '';
  let pkg = '';
  let description = '';

  if (formId === 'contactForm') {
    name = safeTrim(document.getElementById('mainName')?.value);
    contact = safeTrim(document.getElementById('mainContact')?.value);
    pkg = safeTrim(document.getElementById('mainPackage')?.value);
    description = safeTrim(document.getElementById('mainDescription')?.value);
  } else if (formId === 'modalForm') {
    const packageName = safeTrim(document.getElementById('modal-package')?.querySelector('span')?.textContent);
    name = safeTrim(document.getElementById('modalName')?.value);
    contact = safeTrim(document.getElementById('modalContact')?.value);
    pkg = packageName;
    description = safeTrim(document.getElementById('modalDescription')?.value);
  }

  const payload = {
    source: 'vektor-web-site',
    name,
    contact,
    package: pkg,
    description,
    page,
    createdAt
  };

  try {
    await sendLeadToWorker(payload);

    showSuccessMessage('Заявка отправлена. Ожидайте — менеджер свяжется с вами в ближайшие 30 минут.', {
      title: 'Заявка в обработке',
      hint: '',
      autoHideMs: 4500
    });

    // reset
    if (formId === 'contactForm') {
      event.target.reset();
    } else if (formId === 'modalForm') {
      event.target.reset();
      closeModal();
    }
  } catch (err) {
    showSuccessMessage('Не удалось отправить заявку. Попробуйте ещё раз или напишите в Telegram @vektorwebbot.', {
      title: 'Ошибка отправки',
      hint: String(err?.message || err || ''),
      autoHideMs: 6500
    });
  }
}

// ========================================
// navigation
// ========================================
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
  const targetPosition = section.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

  window.scrollTo({ top: targetPosition, behavior: 'smooth' });

  document.getElementById('nav')?.classList.remove('active');
  document.getElementById('burger')?.classList.remove('active');
  document.body.style.overflow = '';
}

// ========================================
// header: scroll
// ========================================
const header = document.getElementById('header');
const scrollThreshold = 50;

window.addEventListener('scroll', () => {
  if (!header) return;
  if (window.scrollY > scrollThreshold) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
});

// ========================================
// mobile menu
// ========================================
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

if (burger && nav) {
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
}

// ========================================
// fade-in on scroll
// ========================================
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.section').forEach((section) => {
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

// ========================================
// modal
// ========================================
const modal = document.getElementById('modal');
const modalPackage = document.getElementById('modal-package')?.querySelector('span');
const modalForm = document.getElementById('modalForm');

function openModal(packageName) {
  if (modalPackage) modalPackage.textContent = packageName;
  if (modal) modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  modalForm?.reset();
}

if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal?.classList.contains('active')) closeModal();
});

// ========================================
// forms: wire up submit handlers
// ========================================
document.getElementById('contactForm')?.addEventListener('submit', function (e) {
  handleLeadSubmit(e, 'contactForm');
});

modalForm?.addEventListener('submit', function (e) {
  handleLeadSubmit(e, 'modalForm');
});

// ========================================
// animations: hero svg intro + press effects
// ========================================
window.addEventListener('load', () => {
  const heroSvg = document.querySelector('.hero-svg');
  if (!heroSvg) return;

  heroSvg.style.opacity = '0';
  heroSvg.style.transform = 'scale(0.8) rotate(-10deg)';
  heroSvg.style.transition = 'opacity 0.8s ease, transform 0.8s ease';

  setTimeout(() => {
    heroSvg.style.opacity = '1';
    heroSvg.style.transform = 'scale(1) rotate(0deg)';
  }, 300);
});

document.querySelectorAll('.btn, .service-card, .case-card, .for-whom-card, .guarantee-item, .guarantee-left').forEach((el) => {
  el.addEventListener('mousedown', () => {
    el.style.transform = 'scale(0.99)';
  });

  el.addEventListener('mouseup', () => {
    setTimeout(() => {
      if (!el.matches(':hover')) el.style.transform = '';
    }, 100);
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
});

// ========================================
// optional: cards click => open modal (если где-то используешь openModal)
// (оставлено как есть — твой HTML сейчас вызывает openTelegramBot, можешь заменить на openModal)
// ========================================
// function openTelegramBot(additionalInfo = '') { ... }  // УДАЛЕНО намеренно: теперь заявки идут через Worker
