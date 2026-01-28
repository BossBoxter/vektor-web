// ========================================
// VEKTOR WEB — отправка заявок через Cloudflare Worker
// Worker URL: https://vektor-web.anton-bezzz2003.workers.dev
// Endpoint:  POST /lead
// ========================================

const WORKER_BASE_URL = 'https://vektor-web.anton-bezzz2003.workers.dev';
const WORKER_LEAD_ENDPOINT = `${WORKER_BASE_URL}/lead`;

// ========================================
// UI: Success message overlay (используем уже существующую верстку #successMessage)
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
// Helper: POST to worker
// ========================================
async function sendLeadToWorker(payload) {
  const res = await fetch(WORKER_LEAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok || !data || data.ok !== true) {
    const details = (data && (data.error || data.details)) ? ` (${data.error || data.details})` : '';
    throw new Error(`Worker error${details}`);
  }

  return data;
}

// ========================================
// Формы: отправка заявки в Worker, без открытия Telegram
// ========================================
async function handleTelegramSubmit(event, formId) {
  event.preventDefault();

  // Блокируем повторные сабмиты
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const prevBtnText = submitBtn ? submitBtn.textContent : '';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';
  }

  try {
    let payload;

    if (formId === 'contactForm') {
      const name = document.getElementById('mainName').value.trim();
      const contact = document.getElementById('mainContact').value.trim();
      const pkg = document.getElementById('mainPackage').value.trim();
      const description = document.getElementById('mainDescription').value.trim();

      payload = {
        name,
        contact,
        package: pkg,
        description,
        page: window.location.href,
        createdAt: new Date().toLocaleString('ru-RU')
      };
    } else if (formId === 'modalForm') {
      const packageName = document.getElementById('modal-package').querySelector('span').textContent.trim();
      const name = document.getElementById('modalName').value.trim();
      const contact = document.getElementById('modalContact').value.trim();
      const description = document.getElementById('modalDescription').value.trim();

      payload = {
        name,
        contact,
        package: packageName,
        description,
        page: window.location.href,
        createdAt: new Date().toLocaleString('ru-RU')
      };
    } else {
      throw new Error('Unknown form');
    }

    // Простая валидация на клиенте
    if (!payload.name || !payload.contact || !payload.package || !payload.description) {
      throw new Error('Заполните все поля формы');
    }

    await sendLeadToWorker(payload);

    showSuccessMessage(
      'Заявка отправлена, ожидайте, с вами свяжется менеджер в ближайшие 30 минут.',
      { title: 'Заявка в обработке', hint: '', autoHideMs: 4000 }
    );

    // Сброс формы
    form.reset();
    if (formId === 'modalForm') closeModal();
  } catch (err) {
    showSuccessMessage(
      'Ошибка отправки заявки. Попробуйте ещё раз или напишите в Telegram @vektorwebbot.',
      { title: 'Не удалось отправить', hint: String(err && err.message ? err.message : ''), autoHideMs: 4500 }
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = prevBtnText || 'Отправить заявку в бота →';
    }
  }
}

// ========================================
// Открытие Telegram (для карточек/кнопок вне формы) — оставляем
// ========================================
function openTelegramBot(additionalInfo = '') {
  const username = 'vektorwebbot';
  const url = `https://t.me/${username}`;

  const message = additionalInfo
    ? `Здравствуйте! Меня интересует: ${additionalInfo}\n\nКоротко опишите задачу, сроки и желаемый результат.`
    : 'Здравствуйте! Хочу получить консультацию по разработке сайта/бота.\n\nОпишите задачу, сроки и примеры.';

  // Пытаемся скопировать (не критично)
  copyToClipboard(message).catch(() => {});
  window.open(url, '_blank');
}

// Копирование в буфер обмена (используется openTelegramBot)
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
// УНИВЕРСАЛЬНЫЕ ФУНКЦИИ
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

// ========================================
// HEADER: ИЗМЕНЕНИЕ ФОНА ПРИ СКРОЛЛЕ
// ========================================
const header = document.getElementById('header');
const scrollThreshold = 50;

window.addEventListener('scroll', () => {
  if (window.scrollY > scrollThreshold) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
});

// ========================================
// МОБИЛЬНОЕ МЕНЮ (ГАМБУРГЕР)
// ========================================
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

// ========================================
// ПОЯВЛЕНИЕ ЭЛЕМЕНТОВ ПРИ СКРОЛЛЕ (FADE-IN)
// ========================================
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

// ========================================
// МОДАЛЬНОЕ ОКНО
// ========================================
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

// ========================================
// ОБРАБОТЧИКИ ФОРМ
// ========================================
document.getElementById('contactForm').addEventListener('submit', function(e) {
  handleTelegramSubmit(e, 'contactForm');
});

modalForm.addEventListener('submit', function(e) {
  handleTelegramSubmit(e, 'modalForm');
});

// ========================================
// АНИМАЦИИ
// ========================================
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
