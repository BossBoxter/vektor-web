// ========================================
// ИНТЕГРАЦИЯ С TELEGRAM BOT @vektorwebbot
// ========================================
const TELEGRAM_BOT_USERNAME = 'vektorwebbot';

// ВАЖНО: start-пейлоад короткий и служебный.
// Мы используем его только чтобы бот понял "пользователь пришёл с сайта".
const TELEGRAM_BOT_DEEPLINK = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=site`;

// Форматирование данных для вставки в чат бота (обычный текст, без Markdown)
function formatTelegramMessage(data) {
    const now = new Date().toLocaleString('ru-RU');
    const page = window.location.href;

    // Убираем пустые поля красиво
    const name = (data.name || '').trim();
    const contact = (data.contact || '').trim();
    const pkg = (data.package || '').trim();
    const desc = (data.description || '').trim();

    return [
        "Заявка с сайта VEKTOR Web",
        "",
        `Имя: ${name || "-"}`,
        `Контакт: ${contact || "-"}`,
        `Пакет: ${pkg || "-"}`,
        "",
        "Описание:",
        desc || "-",
        "",
        `Страница: ${page}`,
        `Дата: ${now}`
    ].join("\n");
}

// Открытие телеграм бота + копирование текста
function openTelegramBot(additionalInfo = '') {
    // Данные из основной формы (если есть)
    const formData = {
        name: document.getElementById('mainName')?.value || '',
        contact: document.getElementById('mainContact')?.value || '',
        package: document.getElementById('mainPackage')?.value || '',
        description: document.getElementById('mainDescription')?.value || ''
    };

    let message = '';

    if (additionalInfo) {
        // Клики по карточкам/кейсам/гарантиям
        message = `Здравствуйте! Меня интересует: ${additionalInfo}\n\nКоротко опишите задачу, сроки и желаемый результат.`;
    } else if ((formData.name || '').trim() || (formData.contact || '').trim() || (formData.description || '').trim()) {
        // Есть введённые данные
        message = formatTelegramMessage(formData);
    } else {
        // Общий сценарий
        message = 'Здравствуйте! Хочу получить консультацию по разработке сайта/бота.\n\nОпишите задачу, сроки и примеры.';
    }

    // Копируем сообщение в буфер и открываем бота
    copyToClipboard(message).then(() => {
        showSuccessMessage('Данные скопированы. Открою бота — вставьте сообщение в чат.', true);
        setTimeout(() => window.open(TELEGRAM_BOT_DEEPLINK, '_blank'), 400);
    }).catch(() => {
        showSuccessMessage('Не удалось скопировать. Открою бота.', false);
        setTimeout(() => window.open(TELEGRAM_BOT_DEEPLINK, '_blank'), 400);
    });
}

// Копирование в буфер обмена
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

// Обработка отправки форм: копируем текст -> открываем бота
function handleTelegramSubmit(event, formId) {
    event.preventDefault();

    let data = {};

    if (formId === 'contactForm') {
        data = {
            name: document.getElementById('mainName').value,
            contact: document.getElementById('mainContact').value,
            package: document.getElementById('mainPackage').value,
            description: document.getElementById('mainDescription').value
        };
    } else if (formId === 'modalForm') {
        const packageName = document.getElementById('modal-package').querySelector('span').textContent;
        data = {
            name: document.getElementById('modalName').value,
            contact: document.getElementById('modalContact').value,
            package: packageName,
            description: document.getElementById('modalDescription').value
        };
    }

    const telegramMessage = formatTelegramMessage(data);

    copyToClipboard(telegramMessage).then(() => {
        showSuccessMessage('Данные скопированы. Открою бота — вставьте сообщение в чат.', true);
    }).catch(() => {
        showSuccessMessage('Не удалось скопировать. Открою бота.', false);
    });

    // Сбрасываем форму
    if (formId === 'contactForm') {
        event.target.reset();
    } else if (formId === 'modalForm') {
        event.target.reset();
        closeModal();
    }

    setTimeout(() => window.open(TELEGRAM_BOT_DEEPLINK, '_blank'), 700);
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
// СООБЩЕНИЕ ОБ УСПЕШНОЙ ОТПРАВКЕ
// ========================================
function showSuccessMessage(message = 'Данные скопированы.', showCopyInfo = true) {
    const successMessage = document.getElementById('successMessage');
    const successContent = successMessage.querySelector('.success-content');

    successContent.querySelector('h3').textContent = 'Готово';
    successContent.querySelector('p').textContent = message;

    const hint = successContent.querySelector('.copy-hint');
    if (showCopyInfo) {
        hint.textContent = 'Откроется бот. Вставьте скопированный текст в чат и отправьте.';
        hint.style.display = 'block';
    } else {
        hint.style.display = 'none';
    }

    successMessage.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        hideSuccess();
        window.open(TELEGRAM_BOT_DEEPLINK, '_blank');
    }, 1500);
}

function hideSuccess() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.remove('active');
    document.body.style.overflow = '';
}

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
