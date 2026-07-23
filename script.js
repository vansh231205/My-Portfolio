/* =========================================================
   Vansh Bhardwaj — Portfolio script.js
   1. Mobile menu   2. Navbar scroll   3. Scroll reveal   4. Form
   ========================================================= */

/* ---------- 1. MOBILE MENU ---------- */
const navToggle  = document.getElementById('navToggle');
const navLinks   = document.getElementById('navLinks');
const navOverlay = document.getElementById('navOverlay');

function openMenu() {
  navLinks.classList.add('is-open');
  navToggle.classList.add('is-open');
  navToggle.setAttribute('aria-expanded', 'true');
  navToggle.setAttribute('aria-label', 'Close menu');
  navOverlay.hidden = false;
  void navOverlay.offsetHeight;   // reflow — rAF ki jagah, throttling-proof
  navOverlay.classList.add('is-visible');
  document.body.classList.add('is-locked');
}
function closeMenu() {
  navLinks.classList.remove('is-open');
  navToggle.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open menu');
  navOverlay.classList.remove('is-visible');
  setTimeout(() => { navOverlay.hidden = true; }, 300);
  document.body.classList.remove('is-locked');
}
navToggle.addEventListener('click', () => {
  navLinks.classList.contains('is-open') ? closeMenu() : openMenu();
});
navOverlay.addEventListener('click', closeMenu);
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navLinks.classList.contains('is-open')) closeMenu();
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 720 && navLinks.classList.contains('is-open')) closeMenu();
});

/* ---------- 2. NAVBAR + PROGRESS BAR on scroll ---------- */
const nav      = document.getElementById('nav');
const progress = document.getElementById('scrollProgress');

function onScroll() {
  nav.classList.toggle('is-scrolled', window.scrollY > 20);
  // Kitna scroll hua (0–100%) — progress bar ki width
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
  progress.style.width = pct + '%';
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- 2b. SCROLLSPY — active nav link highlight ----------
   Jo section screen ke beech me hai, uska nav link highlight hota hai. */
const navAnchors = [...document.querySelectorAll('.nav__links a')]
  .filter(a => a.getAttribute('href')?.startsWith('#'));
const spyTargets = navAnchors
  .map(a => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window && spyTargets.length) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navAnchors.forEach(a =>
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id)
      );
    });
  }, { rootMargin: '-45% 0px -50% 0px' });  // viewport ke beech wala section
  spyTargets.forEach(s => spy.observe(s));
}

/* ---------- 3. SCROLL REVEAL ---------- */
const revealTargets = document.querySelectorAll(
  '.hero__content > *, .hero__visual, .section__title, .about__text, .about__card, ' +
  '.skills__group, .project, .timeline__item, .achievements, ' +
  '.contact__lede, .form, .contact__or, .socials'
);
function revealAll() { revealTargets.forEach(el => el.classList.add('is-visible')); }

if ('IntersectionObserver' in window) {
  // Ye class lagne ke baad hi CSS content chhupata hai — JS fail hua to page normal dikhega
  document.documentElement.classList.add('js-ready');
  revealTargets.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      entry.target.style.transitionDelay = `${Math.min(i * 60, 320)}ms`;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealTargets.forEach(el => io.observe(el));
  // Safety net: 3s baad har haal me dikha do
  setTimeout(revealAll, 3000);
} else {
  revealAll();
}

/* ---------- 3b. LIGHTBOX (certificates + video) ----------
   Sab kuch isi page pe khulta hai — naya tab nahi. Peeche
   main page blur ke through dikhta rehta hai. */
const lb      = document.getElementById('lightbox');
const lbBody  = document.getElementById('lbBody');
const lbTitle = document.getElementById('lbTitle');
const lbOpen  = document.getElementById('lbOpen');
const lbClose = document.getElementById('lbClose');

let lbLastFocus = null;   // kis button se khula tha — band hone par wahin focus wapas

function openLightbox(type, src, title) {
  lbLastFocus = document.activeElement;
  lbTitle.textContent = title;
  lbOpen.href = src;
  lbBody.innerHTML = '';

  if (type === 'video') {
    const v = document.createElement('video');
    v.src = src;
    v.controls = true;
    v.muted = true;          // MUTED — property bhi, attribute bhi
    v.setAttribute('muted', '');
    v.defaultMuted = true;
    v.autoplay = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    lbBody.appendChild(v);
    // Muted autoplay browsers allow karte hain; fir bhi block ho to chup-chaap ignore
    v.play().catch(() => {});
  } else {
    // PDF: browser ka built-in viewer. Mobile pe aksar render nahi hota —
    // isliye pehle hi fallback rakh dete hain, iframe uske upar aata hai.
    const canInline = navigator.pdfViewerEnabled !== false;
    if (canInline) {
      const f = document.createElement('iframe');
      f.src = src + '#toolbar=0&navpanes=0&view=FitH';
      f.title = title;
      lbBody.appendChild(f);
    } else {
      lbBody.innerHTML =
        '<div class="lightbox__fallback">' +
        '<p>Your browser can\'t show PDFs inline.</p>' +
        '<a class="btn" href="' + src + '" target="_blank" rel="noopener">Open certificate</a>' +
        '</div>';
    }
  }

  lb.hidden = false;
  /* Reflow force karke class lagate hain (rAF nahi) — rAF background tab me
     throttle ho jata hai, jisse box khulta to hai par dikhta nahi. */
  void lb.offsetHeight;
  lb.classList.add('is-open');
  document.body.classList.add('is-locked');
  lbClose.focus();
}

function closeLightbox() {
  lb.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  // Animation khatam hone ke baad content hatao (video/iframe band ho jaye)
  setTimeout(() => {
    lb.hidden = true;
    lbBody.innerHTML = '';
  }, 300);
  lbLastFocus?.focus();
}

// Har trigger button (certificates + watch demo)
document.querySelectorAll('[data-lb]').forEach(btn => {
  btn.addEventListener('click', () => {
    openLightbox(btn.dataset.lb, btn.dataset.src, btn.dataset.title || '');
  });
});

lbClose.addEventListener('click', closeLightbox);
lb.querySelector('[data-lb-close]').addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !lb.hidden) closeLightbox();
});

/* ---------- 4. CONTACT FORM ---------- */
const form     = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');

const fields = {
  name:    document.getElementById('name'),
  email:   document.getElementById('email'),
  message: document.getElementById('message'),
};
const rules = {
  name:    { test: v => v.trim().length >= 2,                 msg: 'Please enter your name.' },
  email:   { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Please enter a valid email.' },
  message: { test: v => v.trim().length >= 5,                 msg: 'Please write a short message.' },
};

function validateField(key) {
  const input = fields[key];
  const errEl = document.getElementById(`err-${key}`);
  const ok = rules[key].test(input.value);
  input.classList.toggle('is-invalid', !ok);
  input.setAttribute('aria-invalid', String(!ok));
  errEl.textContent = ok ? '' : rules[key].msg;
  return ok;
}
Object.keys(fields).forEach(key => {
  fields[key].addEventListener('input', () => {
    if (fields[key].classList.contains('is-invalid')) validateField(key);
  });
});

/* Netlify fail ho jaye (ya localhost/GitHub Pages ho) to email fallback dikhao */
function showEmailFallback() {
  const email = 'vanshbhardwaj23off@gmail.com';
  const subject = encodeURIComponent('Portfolio enquiry' + (fields.name.value ? ` from ${fields.name.value}` : ''));
  const body = encodeURIComponent(
    (fields.message.value || '') +
    (fields.email.value ? `\n\n— ${fields.name.value || ''} (${fields.email.value})` : '')
  );
  formNote.className = 'form__note is-notice';
  formNote.innerHTML =
    `Couldn't send automatically. Please email me at ` +
    `<a href="mailto:${email}?subject=${subject}&body=${body}">${email}</a> — I'll reply within a day.`;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  formNote.textContent = '';
  formNote.className = 'form__note';

  const results = Object.keys(fields).map(validateField);
  if (results.includes(false)) {
    form.querySelector('.is-invalid')?.focus();
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  formNote.className = 'form__note';
  formNote.textContent = 'Sending…';

  /* Netlify Forms: saara form data URL-encoded karke site root pe POST.
     Netlify ise capture kar leta hai (form-name field zaroori hai).
     Netlify ke bahar (localhost/GitHub Pages) ye POST fail hota hai —
     tab email fallback dikhta hai, message kabhi chup-chaap gum nahi hota. */
  const data = new URLSearchParams(new FormData(form)).toString();

  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: data,
  })
    .then(res => {
      if (!res.ok) throw new Error('bad status ' + res.status);
      formNote.className = 'form__note is-success';
      formNote.textContent = "Thanks! Your message has been sent — I'll reply within a day.";
      form.reset();
    })
    .catch(() => showEmailFallback())
    .finally(() => { submitBtn.disabled = false; });
});
