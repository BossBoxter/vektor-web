// ========================================
// ПЛАВНЫЙ СКРОЛЛ ПО ЯКОРНЫМ ССЫЛКАМ
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Закрываем мобильное меню после перехода
            document.getElementById('nav').classList.remove('active');
            document.getElementById('burger').classList.remove('active');
        }
    });
});

// Функция для скролла к секции (для кнопки в header)
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = section.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
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
// МОДАЛЬНОЕ ОКНО ДЛЯ ФОРМЫ ВЫБОРА ПАКЕТА
// ========================================
const modal = document.getElementById('modal');
const modalPackage = document.getElementById('modal-package').querySelector('span');
const modalForm = document.getElementById('modalForm');

function openModal(packageName) {
    modalPackage.textContent = packageName;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Заполняем поле "Пакет" в форме
    const select = modalForm.querySelector('select');
    if (select) {
        select.value = packageName;
    }
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
// ОТПРАВКА ФОРМ (ИМИТАЦИЯ)
// ========================================
function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideSuccess() {
    const successMessage = document.getElementById('successMessage');
    successMessage.classList.remove('active');
    document.body.style.overflow = '';
}

// Обработка основной формы
document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Имитация отправки (в реальном проекте здесь будет AJAX запрос)
    showSuccessMessage();
    
    // Сбрасываем форму
    e.target.reset();
});

// Обработка формы в модальном окне
modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Имитация отправки
    showSuccessMessage();
    
    // Закрываем модальное окно
    closeModal();
    
    // Сбрасываем форму
    e.target.reset();
});

// ========================================
// ДОПОЛНИТЕЛЬНЫЕ ЭФФЕКТЫ
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
        heroSvg.style.transform = 'scale(0.8)';
        heroSvg.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        
        setTimeout(() => {
            heroSvg.style.opacity = '1';
            heroSvg.style.transform = 'scale(1)';
        }, 300);
    }
});
