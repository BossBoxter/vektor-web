// ========================================
// ИНТЕГРАЦИЯ С TELEGRAM BOT @vektorwebbot
// ========================================
const TELEGRAM_BOT_USERNAME = 'vektorwebbot';
const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

// Форматирование данных для отправки в бота
function formatTelegramMessage(data) {
    return `🎯 *Новая заявка с сайта Vektor Web*

👤 *Имя:* ${data.name}
📱 *Контакт:* ${data.contact}
📦 *Пакет:* ${data.package}
📝 *Описание:*
${data.description}

🔗 *Страница заявки:* ${window.location.href}
📅 *Дата:* ${new Date().toLocaleString('ru-RU')}

#заявка #vektorweb`;
}

// Открытие телеграм бота с данными
function openTelegramBot(additionalInfo = '') {
    // Собираем данные из формы (если есть)
    const formData = {
        name: document.getElementById('mainName')?.value || '',
        contact: document.getElementById('mainContact')?.value || '',
        package: document.getElementById('mainPackage')?.value || '',
        description: document.getElementById('mainDescription')?.value || ''
    };
    
    // Если вызывается из клика по карточке, создаем сообщение-шаблон
    let message = '';
    
    if (additionalInfo) {
        message = `Здравствуйте! Меня интересует: ${additionalInfo}`;
    } else if (formData.name && formData.contact) {
        message = formatTelegramMessage(formData);
    } else {
        message = 'Здравствуйте! Хочу получить консультацию по разработке сайта.';
    }
    
    // Открываем бота с предзаполненным сообщением (в мобильном приложении)
    const telegramLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(message)}`;
    
    // Копируем сообщение в буфер обмена
    copyToClipboard(message).then(() => {
        showSuccessMessage('Данные скопированы! Вставьте их в чат с ботом.');
        // Небольшая задержка перед открытием ссылки
        setTimeout(() => {
            window.open(telegramLink, '_blank');
        }, 500);
    }).catch(() => {
        // Если копирование не сработало, просто открываем бота
        showSuccessMessage('Открываю бота...');
        setTimeout(() => {
            window.open(telegramLink, '_blank');
        }, 500);
    });
}

// Копирование в буфер обмена
function copyToClipboard(text) {
    return new Promise((resolve, reject) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => resolve())
                .catch(() => reject());
        } else {
            // Fallback для старых браузеров
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
                reject();
            } finally {
                document.body.removeChild(textarea);
            }
        }
    });
}

// Обработка всех форм с отправкой в телеграм
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
    
    // Формируем сообщение
    const telegramMessage = formatTelegramMessage(data);
    
    // Копируем в буфер и показываем инструкцию
    copyToClipboard(telegramMessage).then(() => {
        showSuccessMessage('Данные скопированы! Теперь вставьте их в чат с ботом.', true);
    }).catch(() => {
        showSuccessMessage('Не удалось скопировать. Открываю бота...', false);
    });
    
    // Очищаем форму
    if (formId === 'contactForm') {
        event.target.reset();
    } else if (formId === 'modalForm') {
        event.target.reset();
        closeModal();
    }
    
    // Небольшая задержка перед открытием бота
    setTimeout(() => {
        window.open(TELEGRAM_BOT_URL, '_blank');
    }, 1000);
}

// ========================================
// УНИВЕРСАЛЬНЫЕ ФУНКЦИИ
// ========================================
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = section.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
        
        // Закрываем мобильное меню после перехода
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
    if (window.scrollY > scrollThreshold) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// ========================================
// МОБИЛЬНОЕ МЕНЮ (ГАМБУРГЕР)
// ========================================
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
    burger.classList.toggle('active');
    nav.classList.toggle('active');
    
    // Блокируем прокрутку body при открытом меню
    if (nav.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
});

// Закрытие меню при клике вне его
document.addEventListener('click', (e) => {
    if (nav.classList.contains('active') && 
        !nav.contains(e.target) && 
        !burger.contains(e.target)) {
        nav.classList.remove('active');
        burger.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ========================================
// ПОЯВЛЕНИЕ ЭЛЕМЕНТОВ ПРИ СКРОЛЛЕ (FADE-IN)
// ========================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Наблюдаем за всеми секциями и карточками
document.addEventListener('DOMContentLoaded', () => {
    // Секции
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
    
    // Карточки услуг
    document.querySelectorAll('.service-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.4s ease ${index * 0.1}s, transform 0.4s ease ${index * 0.1}s`;
        observer.observe(card);
    });
    
    // Карточки кейсов
    document.querySelectorAll('.case-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.4s ease ${index * 0.1}s, transform 0.4s ease ${index * 0.1}s`;
        observer.observe(card);
    });
    
    // Таймлайн
    document.querySelectorAll('.timeline-step').forEach((step, index) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';
        step.style.transition = `opacity 0.4s ease ${index * 0.1}s, transform 0.4s ease ${index * 0.1}s`;
        observer.observe(step);
    });
});

// ========================================
// ФУНКЦИЯ ДЛЯ РАСКРЫТИЯ ПОЛИТИКИ КОНФИДЕНЦИАЛЬНОСТИ
// ========================================
function togglePrivacyPolicy() {
    const content = document.getElementById('privacyContent');
    const button = document.getElementById('togglePrivacy');
    const buttonText = document.getElementById('privacyToggleText');
    
    if (content.style.display === 'block') {
        content.style.display = 'none';
        buttonText.textContent = 'Показать политику';
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline');
    } else {
        content.style.display = 'block';
        buttonText.textContent = 'Скрыть политику';
        button.classList.remove('btn-outline');
        button.classList.add('btn-primary');
        
        // Прокрутка к разделу политики
        setTimeout(() => {
            const privacySection = document.getElementById('privacy-section');
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = privacySection.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }, 100);
    }
}

// ========================================
// МОДАЛЬНОЕ ОКНО ДЛЯ ФОРМЫ ВЫБОРА ПАКЕТА
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
    
    // Сбрасываем форму
    modalForm.reset();
}

// Закрытие при клике на фон
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

// ========================================
// СООБЩЕНИЕ ОБ УСПЕШНОЙ ОТПРАВКЕ
// ========================================
function showSuccessMessage(message = 'Данные скопированы! 🎉', showCopyInfo = true) {
    const successMessage = document.getElementById('successMessage');
    const successContent = successMessage.querySelector('.success-content');
    
    // Обновляем текст
    successContent.querySelector('h3').textContent = 'Отлично!';
    successContent.querySelector('p').textContent = message;
    
    if (showCopyInfo) {
        successContent.querySelector('.copy-hint').textContent = 'Бот уже получил ваши данные, просто подтвердите отправку в чате.';
        successContent.querySelector('.copy-hint').style.display = 'block';
    } else {
        successContent.querySelector('.copy-hint').style.display = 'none';
    }
    
    successMessage.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideSuccess() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.remove('active');
    document.body.style.overflow = '';
}

function openBotAndClose() {
    hideSuccess();
    window.open(TELEGRAM_BOT_URL, '_blank');
}

// ========================================
// ОБРАБОТЧИКИ ФОРМ
// ========================================
// Основная форма
document.getElementById('contactForm').addEventListener('submit', function(e) {
    handleTelegramSubmit(e, 'contactForm');
});

// Форма в модальном окне
modalForm.addEventListener('submit', function(e) {
    handleTelegramSubmit(e, 'modalForm');
});

// ========================================
// АНИМАЦИИ
// ========================================
// Плавное появление карточек при наведении на таймлайн
document.querySelectorAll('.timeline-step').forEach(step => {
    step.addEventListener('mouseenter', () => {
        step.querySelector('.step-content').style.transform = 'scale(1.02)';
    });
    
    step.addEventListener('mouseleave', () => {
        step.querySelector('.step-content').style.transform = 'scale(1)';
    });
});

// Анимация SVG в Hero при загрузке
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

// Эффект нажатия на кнопки
document.querySelectorAll('.btn, .service-card, .case-card, .for-whom-card, .guarantee-item, .guarantee-left').forEach(element => {
    element.addEventListener('mousedown', () => {
        element.style.transform = 'scale(0.95)';
    });
    
    element.addEventListener('mouseup', () => {
        setTimeout(() => {
            if (!element.matches(':hover')) {
                element.style.transform = '';
            }
        }, 100);
    });
    
    element.addEventListener('mouseleave', () => {
        element.style.transform = '';
    });
});

// ========================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // Привязываем кнопку в футере к функции
    const footerPrivacyLink = document.querySelector('.footer-legal a[href="#privacy-section"]');
    if (footerPrivacyLink) {
        footerPrivacyLink.addEventListener('click', function(e) {
            e.preventDefault();
            togglePrivacyPolicy();
        });
    }
});
