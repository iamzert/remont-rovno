// Если человек отключил анимации в системе — не анимируем цифры
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ==========================================================
// 1. МОБИЛЬНОЕ МЕНЮ (бургер)
// ==========================================================
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

function setMenuOpen(isOpen) {
  nav.classList.toggle('nav--open', isOpen);
  burger.classList.toggle('burger--open', isOpen);
  burger.setAttribute('aria-expanded', String(isOpen));
  burger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
}

burger.addEventListener('click', () => {
  setMenuOpen(!nav.classList.contains('nav--open'));
});

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenuOpen(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('nav--open')) {
    setMenuOpen(false);
    burger.focus();
  }
});

document.addEventListener('click', (event) => {
  if (nav.classList.contains('nav--open') && !event.target.closest('.header')) {
    setMenuOpen(false);
  }
});

// ==========================================================
// 2. ШАПКА: тень при прокрутке + подсветка текущего раздела
// ==========================================================
const header = document.getElementById('header');

function onScroll() {
  header.classList.toggle('header--scrolled', window.scrollY > 8);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const navLinks = nav.querySelectorAll('a[href^="#"]:not(.btn)');
const sections = [...navLinks]
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('is-active', isCurrent);
        if (isCurrent) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  },
  { rootMargin: '-45% 0px -50% 0px' }
);
sections.forEach((section) => sectionObserver.observe(section));

// ==========================================================
// 3. ПОЯВЛЕНИЕ БЛОКОВ ПРИ ПРОКРУТКЕ
// ==========================================================
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 90}ms`;
  revealObserver.observe(el);
});

// ==========================================================
// 4. КАЛЬКУЛЯТОР СТОИМОСТИ
//    Цены берутся из атрибутов data-* в index.html
// ==========================================================
const calcForm = document.getElementById('calc-form');
const areaInput = calcForm.elements.area;
const areaOut = document.getElementById('c-area-out');
const totalOut = document.getElementById('c-total');
const perM2Out = document.getElementById('c-per-m2');
const weeksOut = document.getElementById('c-weeks');

// 1 неделя, 2 недели, 5 недель — русские окончания после числа
function plural(n, forms) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

// 406000 → «406 000 ₽»
function rub(n) {
  return `${n.toLocaleString('ru-RU')} ₽`;
}

// Текст подписи у переключателя: «Капитальный», «Тёплый пол» и т.д.
function labelOf(input) {
  return input.closest('label').querySelector('span').textContent.trim();
}

function getEstimate() {
  const area = Number(areaInput.value);
  const type = calcForm.querySelector('input[name="type"]:checked');
  const housing = calcForm.querySelector('input[name="housing"]:checked');
  const extras = [...calcForm.querySelectorAll('input[name="extra"]:checked')];

  const extrasPrice = extras.reduce((sum, input) => sum + Number(input.dataset.price), 0);
  const perM2 = Number(type.dataset.price) * Number(housing.dataset.factor) + extrasPrice;
  const total = Math.round((area * perM2) / 1000) * 1000; // округляем до тысяч
  const weeks = Math.max(
    Number(type.dataset.minWeeks),
    Math.round(area * Number(type.dataset.weeks))
  );

  return { area, type, housing, extras, perM2: Math.round(perM2 / 10) * 10, total, weeks };
}

// Плавно «докручиваем» итоговую сумму до нового значения
let shownTotal = null;
let frame = 0;

function showTotal(target) {
  cancelAnimationFrame(frame);
  if (shownTotal === null || reduceMotion) {
    shownTotal = target;
    totalOut.textContent = rub(target);
    return;
  }

  const from = shownTotal;
  const start = performance.now();
  const duration = 350;

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    shownTotal = Math.round(from + (target - from) * eased);
    totalOut.textContent = rub(Math.round(shownTotal / 1000) * 1000);
    if (t < 1) frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
}

function updateCalc() {
  const estimate = getEstimate();
  const min = Number(areaInput.min);
  const max = Number(areaInput.max);

  areaOut.textContent = `${estimate.area} м²`;
  areaInput.style.setProperty('--fill', `${((estimate.area - min) / (max - min)) * 100}%`);
  perM2Out.textContent = rub(estimate.perM2);
  weeksOut.textContent = `≈ ${estimate.weeks} ${plural(estimate.weeks, ['неделя', 'недели', 'недель'])}`;
  showTotal(estimate.total);
}

calcForm.addEventListener('input', updateCalc);
calcForm.addEventListener('submit', (event) => event.preventDefault());
updateCalc();

// Кнопки «Рассчитать» в карточках услуг сразу выбирают нужный тип ремонта
document.querySelectorAll('[data-pick-type]').forEach((button) => {
  button.addEventListener('click', () => {
    const radio = calcForm.querySelector(`input[name="type"][value="${button.dataset.pickType}"]`);
    radio.checked = true;
    updateCalc();
  });
});

// ==========================================================
// 5. ФОРМА ЗАЯВКИ
// ==========================================================
const form = document.getElementById('request-form');
const message = document.getElementById('form-message');
const phoneInput = form.elements.phone;
const commentInput = form.elements.comment;

// «Получить точную смету» переносит расчёт в комментарий заявки,
// чтобы человеку не пришлось писать всё заново
document.getElementById('c-submit').addEventListener('click', () => {
  const estimate = getEstimate();
  const parts = [
    `${labelOf(estimate.type).toLowerCase()} ремонт`,
    `${estimate.area} м²`,
    labelOf(estimate.housing).toLowerCase(),
    ...estimate.extras.map((input) => labelOf(input).toLowerCase()),
  ];
  commentInput.value = `Расчёт с сайта: ${parts.join(', ')}. Примерно ${rub(estimate.total)}.`;
  form.elements.name.focus({ preventScroll: true });
});

// Маска телефона: +7 (999) 123-45-67
phoneInput.addEventListener('input', () => {
  let digits = phoneInput.value.replace(/\D/g, '');
  if (digits === '') {
    phoneInput.value = '';
    return;
  }
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);

  const p = digits.slice(1); // цифры после +7
  let result = '+7';
  if (p.length > 0) result += ` (${p.slice(0, 3)}`;
  // Скобку ставим, только когда после кода есть цифры —
  // иначе Backspace не сможет стереть третью цифру
  if (p.length > 3) result += `) ${p.slice(3, 6)}`;
  if (p.length > 6) result += `-${p.slice(6, 8)}`;
  if (p.length > 8) result += `-${p.slice(8, 10)}`;
  phoneInput.value = result;
});

// Как только поле начали исправлять — убираем красную рамку
[form.elements.name, phoneInput].forEach((input) => {
  input.addEventListener('input', () => {
    input.classList.remove('input--error');
    input.removeAttribute('aria-invalid');
  });
});

function markError(input) {
  input.classList.add('input--error');
  input.setAttribute('aria-invalid', 'true');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const errors = [];
  const nameInput = form.elements.name;

  if (nameInput.value.trim() === '') {
    markError(nameInput);
    errors.push(nameInput);
  }

  if (phoneInput.value.replace(/\D/g, '').length !== 11) {
    markError(phoneInput);
    errors.push(phoneInput);
  }

  if (errors.length > 0) {
    message.textContent = 'Укажите имя и телефон полностью — так мы сможем перезвонить.';
    message.className = 'form__message form__message--error';
    errors[0].focus();
    return;
  }

  // На реальном сайте здесь заявка уходила бы в Telegram, на почту или в CRM.
  // Для портфолио просто показываем сообщение.
  message.textContent = `Спасибо, ${nameInput.value.trim()}! Перезвоним в течение 15 минут.`;
  message.className = 'form__message form__message--success';
  form.reset();
});

// Год в подвале обновляется сам
document.getElementById('year').textContent = new Date().getFullYear();
