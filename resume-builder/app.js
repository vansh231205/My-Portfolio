/* =========================================================
   Resume Builder — app.js

   Kaam kaise karta hai:
   1. Ek `state` object me saara data rehta hai
   2. Form badla → state update → preview dobara render
   3. State localStorage me auto-save hoti hai
   4. Print sirf .resume element ko chhapta hai (CSS me handle)

   Sections:
   1. State + storage      5. Preview render
   2. Repeater config      6. Design controls
   3. Simple field binding 7. Toolbar (sample/import/export/print/clear)
   4. Repeater UI          8. Zoom + tabs + init
   ========================================================= */

/* ---------------------------------------------------------
   1. STATE
   --------------------------------------------------------- */
/* Storage ka version. Ise badalne se purana saved data ignore ho jata hai.
   v1 → v2: pehle "Load sample" apne aap save ho jata tha, isliye page kholte
   hi sample dikhta rehta tha. Ab sample save nahi hota, aur purani v1 entry
   ko chhod diya jata hai taaki fresh open par blank placeholder aaye.
   (Purana data delete nahi kiya — bas use nahi hota.) */
const STORAGE_KEY = 'resume-builder-v2';

function emptyState() {
  return {
    design:   { template: 'classic', accent: '#2563eb', font: 'sans', density: 'normal' },
    personal: { fullName: '', role: '', email: '', phone: '',
                location: '', website: '', linkedin: '', github: '' },
    summary: '',
    education: [], experience: [], projects: [],
    skills: [], certifications: [], achievements: [],
    languages: [], custom: [],
  };
}

let state = emptyState();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    flash('Saved');
  } catch (e) {
    flash("Couldn't save to this browser");
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    // Purani save me nayi keys missing ho sakti hain — merge kar lete hain
    state = Object.assign(emptyState(), JSON.parse(raw));
    return true;
  } catch (e) {
    return false;
  }
}

/* Chhota "Saved" toast */
let flashTimer;
function flash(msg) {
  const el = document.getElementById('savedNote');
  el.textContent = msg;
  el.classList.add('is-show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove('is-show'), 1400);
}

/* Type karte waqt har keystroke pe save na ho — thoda ruk ke */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const saveSoon = debounce(save, 700);

/* HTML injection se bachne ke liye — user ka text hamesha isse guzarta hai */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Multi-line text ko bullet list me badalta hai */
function bullets(text) {
  const lines = String(text || '').split('\n').map(l => l.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
  if (!lines.length) return '';
  return `<ul class="r-bullets">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

/* "2024-12" → "Dec 2024" */
function fmtDate(v) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  if (!m) return esc(v);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m[2] - 1]} ${m[1]}`;
}

function dateRange(start, end, current) {
  const s = fmtDate(start);
  const e = current ? 'Present' : fmtDate(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || '';
}

/* URL ko saaf dikhane ke liye (https:// hata ke) */
function cleanUrl(u) { return String(u || '').replace(/^https?:\/\//, '').replace(/\/$/, ''); }
function fullUrl(u)  { return /^https?:\/\//.test(u) ? u : 'https://' + u; }


/* ---------------------------------------------------------
   2. REPEATER CONFIG
   Har repeatable section yahan define hai. Naya section
   add karna ho to bas ek entry yahan daal do — UI aur
   preview dono automatically ban jaate hain.
   --------------------------------------------------------- */
const SECTIONS = [
  {
    key: 'education', title: 'Education', addLabel: '+ Add education',
    titleField: 'degree',
    fields: [
      { name: 'degree',      label: 'Degree / course', type: 'text', width: 2, placeholder: 'Your Degree / Course' },
      { name: 'institution', label: 'Institution',     type: 'text', width: 2, placeholder: 'Your Institution' },
      { name: 'location',    label: 'Location',        type: 'text', placeholder: 'City, State' },
      { name: 'score',       label: 'CGPA / %',        type: 'text', placeholder: 'Your CGPA / %' },
      { name: 'start',       label: 'Start',           type: 'month' },
      { name: 'end',         label: 'End',             type: 'month' },
      { name: 'details',     label: 'Extra details (one per line)', type: 'textarea', width: 2,
        placeholder: 'Relevant coursework, honours, activities — one per line' },
    ],
  },
  {
    key: 'experience', title: 'Experience', addLabel: '+ Add experience',
    titleField: 'role',
    fields: [
      { name: 'role',     label: 'Role',     type: 'text', width: 2, placeholder: 'Your Role' },
      { name: 'company',  label: 'Company',  type: 'text', width: 2, placeholder: 'Company Name' },
      { name: 'location', label: 'Location', type: 'text', placeholder: 'City, State' },
      { name: 'current',  label: 'Currently working here', type: 'checkbox' },
      { name: 'start',    label: 'Start',    type: 'month' },
      { name: 'end',      label: 'End',      type: 'month' },
      { name: 'details',  label: 'What you did (one bullet per line)', type: 'textarea', width: 2,
        placeholder: 'What you did — one bullet per line\nAnother point, ideally with a number in it' },
    ],
  },
  {
    key: 'projects', title: 'Projects', addLabel: '+ Add project',
    titleField: 'name',
    fields: [
      { name: 'name',    label: 'Project name', type: 'text', width: 2, placeholder: 'Project Name' },
      { name: 'tech',    label: 'Tech used',    type: 'text', width: 2, placeholder: 'Tech you used' },
      { name: 'link',    label: 'Live link / repo', type: 'text', width: 2, placeholder: 'github.com/your-username/project' },
      { name: 'start',   label: 'Start', type: 'month' },
      { name: 'end',     label: 'End',   type: 'month' },
      { name: 'details', label: 'Description (one bullet per line)', type: 'textarea', width: 2,
        placeholder: 'What the project does\nSomething interesting about how you built it' },
    ],
  },
  {
    key: 'skills', title: 'Skills', addLabel: '+ Add skill category',
    titleField: 'category',
    fields: [
      { name: 'category', label: 'Category', type: 'text', placeholder: 'Languages' },
      { name: 'items',    label: 'Skills (comma separated)', type: 'text', placeholder: 'Your skills, comma separated' },
    ],
  },
  {
    key: 'certifications', title: 'Certifications', addLabel: '+ Add certification',
    titleField: 'name',
    fields: [
      { name: 'name',   label: 'Certificate name', type: 'text', width: 2, placeholder: 'Certificate Name' },
      { name: 'issuer', label: 'Issued by',        type: 'text', placeholder: 'Issued by' },
      { name: 'date',   label: 'Date',             type: 'month' },
      { name: 'link',   label: 'Credential link',  type: 'text', width: 2, placeholder: 'Optional' },
    ],
  },
  {
    key: 'achievements', title: 'Achievements', addLabel: '+ Add achievement',
    titleField: 'text',
    fields: [
      { name: 'text', label: 'Achievement', type: 'textarea', width: 2,
        placeholder: 'An achievement, award, or ranking worth showing' },
    ],
  },
  {
    key: 'languages', title: 'Languages', addLabel: '+ Add language',
    titleField: 'name',
    fields: [
      { name: 'name',  label: 'Language', type: 'text', placeholder: 'English' },
      { name: 'level', label: 'Level',    type: 'text', placeholder: 'Fluent' },
    ],
  },
  {
    key: 'custom', title: 'Custom section', addLabel: '+ Add custom section',
    titleField: 'heading',
    fields: [
      { name: 'heading', label: 'Section heading', type: 'text', width: 2,
        placeholder: 'Volunteering / Publications / Hobbies' },
      { name: 'details', label: 'Content (one bullet per line)', type: 'textarea', width: 2,
        placeholder: 'Anything that does not fit the sections above' },
    ],
  },
];


/* ---------------------------------------------------------
   3. SIMPLE FIELD BINDING  (data-bind="personal.email")
   --------------------------------------------------------- */
function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function bindSimpleFields() {
  document.querySelectorAll('[data-bind]').forEach(el => {
    el.addEventListener('input', () => {
      setPath(state, el.dataset.bind, el.value);
      renderPreview();
      saveSoon();
    });
  });
}

/* State se form ke simple fields bharo */
function fillSimpleFields() {
  document.querySelectorAll('[data-bind]').forEach(el => {
    el.value = getPath(state, el.dataset.bind) ?? '';
  });
}


/* ---------------------------------------------------------
   4. REPEATER UI
   --------------------------------------------------------- */
function buildRepeaters() {
  const host = document.getElementById('repeaters');
  host.innerHTML = SECTIONS.map(sec => `
    <details class="group" ${['education','experience','projects','skills'].includes(sec.key) ? 'open' : ''}>
      <summary class="group__head">
        <span class="group__title">${esc(sec.title)}</span>
        <span class="group__chev" aria-hidden="true"></span>
      </summary>
      <div class="group__body">
        <div class="items" id="items-${sec.key}"></div>
        <button type="button" class="add-btn" data-add="${sec.key}">${esc(sec.addLabel)}</button>
      </div>
    </details>
  `).join('');

  host.addEventListener('click', onRepeaterClick);
  host.addEventListener('input', onRepeaterInput);
  host.addEventListener('change', onRepeaterInput);   // checkbox ke liye

  SECTIONS.forEach(sec => renderItems(sec.key));
}

function fieldHtml(sec, item, index, f) {
  const id = `${sec.key}-${index}-${f.name}`;
  const val = item[f.name] ?? '';
  const span = f.width === 2 ? ' style="grid-column:1/-1"' : '';

  if (f.type === 'checkbox') {
    return `<label class="check"${span}>
      <input type="checkbox" data-sec="${sec.key}" data-i="${index}" data-f="${f.name}" ${val ? 'checked' : ''}>
      <span>${esc(f.label)}</span>
    </label>`;
  }

  const input = f.type === 'textarea'
    ? `<textarea rows="3" data-sec="${sec.key}" data-i="${index}" data-f="${f.name}"
         placeholder="${esc(f.placeholder || '')}">${esc(val)}</textarea>`
    : `<input type="${f.type}" value="${esc(val)}" data-sec="${sec.key}" data-i="${index}" data-f="${f.name}"
         placeholder="${esc(f.placeholder || '')}">`;

  return `<label class="field"${span}><span>${esc(f.label)}</span>${input}</label>`;
}

function renderItems(key) {
  const sec = SECTIONS.find(s => s.key === key);
  const list = state[key];
  const host = document.getElementById(`items-${key}`);
  if (!host) return;

  if (!list.length) {
    host.innerHTML = `<p class="empty">Nothing added yet.</p>`;
    return;
  }

  host.innerHTML = list.map((item, i) => {
    const label = item[sec.titleField] || `${sec.title} ${i + 1}`;
    return `
      <div class="item">
        <div class="item__bar">
          <span class="item__num">${esc(label.slice(0, 40))}</span>
          <button type="button" class="icon-btn" data-move="up"   data-sec="${key}" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
          <button type="button" class="icon-btn" data-move="down" data-sec="${key}" data-i="${i}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
          <button type="button" class="icon-btn icon-btn--del" data-del data-sec="${key}" data-i="${i}" aria-label="Delete">✕</button>
        </div>
        <div class="row row--2">
          ${sec.fields.map(f => fieldHtml(sec, item, i, f)).join('')}
        </div>
      </div>`;
  }).join('');
}

function onRepeaterClick(e) {
  const add = e.target.closest('[data-add]');
  if (add) {
    const key = add.dataset.add;
    state[key].push({});
    renderItems(key);
    renderPreview();
    save();
    return;
  }

  const del = e.target.closest('[data-del]');
  if (del) {
    const { sec, i } = del.dataset;
    state[sec].splice(+i, 1);
    renderItems(sec);
    renderPreview();
    save();
    return;
  }

  const move = e.target.closest('[data-move]');
  if (move) {
    const { sec, i, move: dir } = move.dataset;
    const list = state[sec];
    const from = +i;
    const to = dir === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    renderItems(sec);
    renderPreview();
    save();
  }
}

function onRepeaterInput(e) {
  const el = e.target;
  if (!el.dataset.sec) return;
  const { sec, i, f } = el.dataset;
  const value = el.type === 'checkbox' ? el.checked : el.value;
  state[sec][+i][f] = value;

  // Item ka heading label live update ho
  const secCfg = SECTIONS.find(s => s.key === sec);
  if (f === secCfg.titleField) {
    const bar = el.closest('.item')?.querySelector('.item__num');
    if (bar) bar.textContent = (value || `${secCfg.title} ${+i + 1}`).slice(0, 40);
  }

  renderPreview();
  saveSoon();
}


/* ---------------------------------------------------------
   5. PREVIEW RENDER
   --------------------------------------------------------- */
function hasAny(list, ...keys) {
  return list.some(it => keys.some(k => String(it[k] || '').trim()));
}

function renderPreview() {
  const r = document.getElementById('resume');

  const p = state.personal;
  const PH = PLACEHOLDER;

  /* Har hissa alag "block" me banate hain. Phir template ke hisaab se
     inhe alag-alag arrange karte hain (single column ya sidebar).

     Placeholder ab FIELD-BY-FIELD chalta hai: jo cheez user ne bhar di wo
     asli dikhti hai, jo khali hai wahan placeholder rehta hai. Isse ek
     field bharne par poora page blank nahi hota.
     .r-ph / .r-ph-item wale hisse print me nahi jate (CSS me handle). */
  const B = {};

  /* Khali ho to placeholder, warna asli value */
  const F = (v, ph) => String(v ?? '').trim()
    ? esc(v) : `<span class="r-ph">${esc(ph)}</span>`;

  /* --- Name + role --- */
  B.identity = `<div class="r-name">${F(p.fullName, PH.personal.fullName)}</div>
    <div class="r-role">${F(p.role, PH.personal.role)}</div>`;

  /* --- Contact --- */
  const cRow = (icon, val, ph, kind) => {
    if (String(val ?? '').trim()) {
      if (kind === 'mail') return `<span>${icon} <a href="mailto:${esc(val)}">${esc(val)}</a></span>`;
      if (kind === 'url')  return `<span>${icon} <a href="${esc(fullUrl(val))}">${esc(cleanUrl(val))}</a></span>`;
      return `<span>${icon} ${esc(val)}</span>`;
    }
    return `<span class="r-ph-item">${icon} ${esc(ph)}</span>`;
  };
  B.contact = `<div class="r-contact">` + [
    cRow('✉',  p.email,    PH.personal.email,    'mail'),
    cRow('☎',  p.phone,    PH.personal.phone,    'text'),
    cRow('📍', p.location, PH.personal.location, 'text'),
    cRow('🔗', p.website,  PH.personal.website,  'url'),
    cRow('in', p.linkedin, PH.personal.linkedin, 'url'),
    cRow('gh', p.github,   PH.personal.github,   'url'),
  ].join('') + `</div>`;

  const sec = (title, inner) => inner ? `<section class="r-section"><h2 class="r-h">${esc(title)}</h2>${inner}</section>` : '';

  /* Section jisme abhi user ka kuch nahi hai — placeholder items dikhte hain.
     Poore section pe .r-ph-item lag jata hai (grey + print me hidden). */
  const secPh = (title, inner) => inner
    ? `<section class="r-section r-ph-item"><h2 class="r-h">${esc(title)}</h2>${inner}</section>` : '';

  /* User ke items hain to wahi, warna placeholder wale.
     `wrap` optional hai — jaise Languages ko chips ke div me lapetna. */
  const pick = (title, list, phList, keys, renderFn, wrap) => {
    const real = hasAny(list, ...keys);
    let inner = (real ? list : phList).map(renderFn).join('');
    if (inner && wrap) inner = wrap(inner);
    return real ? sec(title, inner) : secPh(title, inner);
  };

  /* --- Summary --- */
  B.summary = String(state.summary).trim()
    ? sec('Summary', `<p class="r-summary">${esc(state.summary)}</p>`)
    : secPh('Summary', `<p class="r-summary">${esc(PH.summary)}</p>`);

  /* --- Education --- */
  B.education = pick('Education', state.education, PH.education, ['degree', 'institution'],
    (it => {
      if (!it.degree && !it.institution) return '';
      const sub = [it.institution, it.location].filter(Boolean).join(' · ');
      return `<div class="r-item">
        <div class="r-item__top">
          <span class="r-item__title">${esc(it.degree || '')}</span>
          <span class="r-item__date">${dateRange(it.start, it.end)}</span>
        </div>
        ${sub ? `<div class="r-item__sub">${esc(sub)}</div>` : ''}
        ${it.score ? `<div class="r-item__meta">${esc(it.score)}</div>` : ''}
        ${bullets(it.details)}
      </div>`;
    }));

  /* --- Experience --- */
  B.experience = pick('Experience', state.experience, PH.experience, ['role', 'company'],
    (it => {
      if (!it.role && !it.company) return '';
      const sub = [it.company, it.location].filter(Boolean).join(' · ');
      return `<div class="r-item">
        <div class="r-item__top">
          <span class="r-item__title">${esc(it.role || '')}</span>
          <span class="r-item__date">${dateRange(it.start, it.end, it.current)}</span>
        </div>
        ${sub ? `<div class="r-item__sub">${esc(sub)}</div>` : ''}
        ${bullets(it.details)}
      </div>`;
    }));

  /* --- Projects --- */
  B.projects = pick('Projects', state.projects, PH.projects, ['name'],
    (it => {
      if (!it.name) return '';
      const bits = [];
      if (it.tech) bits.push(esc(it.tech));
      if (it.link) bits.push(`<a class="r-link" href="${esc(fullUrl(it.link))}">${esc(cleanUrl(it.link))}</a>`);
      return `<div class="r-item">
        <div class="r-item__top">
          <span class="r-item__title">${esc(it.name)}</span>
          <span class="r-item__date">${dateRange(it.start, it.end)}</span>
        </div>
        ${bits.length ? `<div class="r-item__sub">${bits.join(' · ')}</div>` : ''}
        ${bullets(it.details)}
      </div>`;
    }));

  /* --- Skills --- */
  B.skills = pick('Skills', state.skills, PH.skills, ['category', 'items'],
    (it => {
      if (!it.items && !it.category) return '';
      return `<div class="r-skill">
        ${it.category ? `<span class="r-skill__cat">${esc(it.category)}</span>` : ''}
        <span>${esc(it.items || '')}</span>
      </div>`;
    }));

  /* --- Certifications --- */
  B.certifications = pick('Certifications', state.certifications, PH.certifications, ['name'],
    (it => {
      if (!it.name) return '';
      const subBits = [];
      if (it.issuer) subBits.push(esc(it.issuer));
      if (it.link)   subBits.push(`<a class="r-link" href="${esc(fullUrl(it.link))}">${esc(cleanUrl(it.link))}</a>`);
      return `<div class="r-item">
        <div class="r-item__top">
          <span class="r-item__title">${esc(it.name)}</span>
          <span class="r-item__date">${fmtDate(it.date)}</span>
        </div>
        ${subBits.length ? `<div class="r-item__sub">${subBits.join(' · ')}</div>` : ''}
      </div>`;
    }));

  /* --- Achievements --- */
  {
    const real = hasAny(state.achievements, 'text');
    const list = real ? state.achievements : PH.achievements;
    const inner = bullets(list.map(it => it.text).filter(Boolean).join('\n'));
    B.achievements = real ? sec('Achievements', inner) : secPh('Achievements', inner);
  }

  /* --- Languages --- */
  B.languages = pick('Languages', state.languages, PH.languages, ['name'],
    (it => it.name ? `<span>${esc(it.name)}${it.level ? ` — ${esc(it.level)}` : ''}</span>` : ''),
    (inner => `<div class="r-chips">${inner}</div>`));

  /* --- Custom sections (sirf user ke, inka koi placeholder nahi) --- */
  B.custom = state.custom.map(it => {
    if (!it.heading && !it.details) return '';
    return sec(it.heading || 'Additional', bullets(it.details));
  }).join('');

  r.dataset.template = state.design.template || 'classic';
  r.innerHTML = assembleResume(B, state.design.template);

  /* Content badla to stage ki height aur page count dono refresh karo.
     ResizeObserver pe bharosa nahi kar sakte — wo hamesha fire nahi hota. */
  applyZoom();
}

/* Blocks ko template ke hisaab se arrange karta hai */
function assembleResume(B, template) {
  if (template === 'sidebar') {
    /* Do column: baayein colored sidebar (contact, skills, languages,
       certifications), daayein main content. */
    const aside = `<aside class="r-aside">
      ${B.contact ? `<div class="r-aside__contact">${B.contact}</div>` : ''}
      ${B.skills}${B.languages}${B.certifications}
    </aside>`;
    const main = `<div class="r-main">
      <header class="r-head">${B.identity}</header>
      ${B.summary}${B.experience}${B.projects}${B.education}${B.achievements}${B.custom}
    </div>`;
    return aside + main;
  }

  /* Single column (classic / modern / minimal) — sab ek order me */
  return `<header class="r-head">${B.identity}${B.contact}</header>` +
    B.summary + B.education + B.experience + B.projects +
    B.skills + B.certifications + B.achievements + B.languages + B.custom;
}


/* ---------------------------------------------------------
   6. DESIGN CONTROLS
   --------------------------------------------------------- */
const FONTS = {
  sans:  "'Inter', system-ui, sans-serif",
  serif: "'Source Serif 4', Georgia, serif",
  mono:  "'JetBrains Mono', monospace",
};
const DENSITY = { compact: 0.92, normal: 1, roomy: 1.1 };

function applyDesign() {
  const root = document.documentElement.style;
  root.setProperty('--r-accent', state.design.accent);
  root.setProperty('--r-font', FONTS[state.design.font] || FONTS.sans);
  root.setProperty('--r-scale', DENSITY[state.design.density] ?? 1);

  const resume = document.getElementById('resume');
  if (resume) {
    resume.dataset.template = state.design.template || 'classic';
    applyZoom();  // template/font/density se height badalti hai → page count refresh
  }
}

function bindDesign() {
  const template = document.getElementById('designTemplate');
  const accent   = document.getElementById('designAccent');
  const font     = document.getElementById('designFont');
  const density  = document.getElementById('designDensity');

  // Template ka layout badalta hai — isliye poora preview dobara render
  template.addEventListener('change', () => {
    state.design.template = template.value;
    renderPreview();
    save();
  });
  accent.addEventListener('input',   () => { state.design.accent = accent.value; applyDesign(); saveSoon(); });
  font.addEventListener('change',    () => { state.design.font = font.value;      applyDesign(); save(); });
  density.addEventListener('change', () => { state.design.density = density.value; applyDesign(); save(); });
}

function fillDesign() {
  document.getElementById('designTemplate').value = state.design.template || 'classic';
  document.getElementById('designAccent').value   = state.design.accent;
  document.getElementById('designFont').value     = state.design.font;
  document.getElementById('designDensity').value  = state.design.density;
}


/* ---------------------------------------------------------
   7. TOOLBAR
   --------------------------------------------------------- */
function refreshAll() {
  fillSimpleFields();
  fillDesign();
  applyDesign();
  SECTIONS.forEach(s => renderItems(s.key));
  renderPreview();
}

function bindToolbar() {
  /* Sample data */
  document.getElementById('btnSample').addEventListener('click', () => {
    if (!confirm('Load the sample resume? This replaces what you have right now.')) return;
    state = sampleState();
    refreshAll();
    /* Jaan-boojh ke save() nahi kar rahe — sample sirf dikhane ke liye hai.
       Page dobara kholne par blank placeholder hi aana chahiye. Jaise hi
       user khud kuch edit karega, wo uska apna kaam ban jayega aur save
       ho jayega. */
    localStorage.removeItem(STORAGE_KEY);
    flash('Sample loaded (not saved)');
  });

  /* Clear */
  document.getElementById('btnClear').addEventListener('click', () => {
    if (!confirm('Clear everything and start fresh? This cannot be undone.')) return;
    state = emptyState();
    refreshAll();
    save();
  });

  /* Export JSON — backup file */
  document.getElementById('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const name = (state.personal.fullName || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${name}-data.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    flash('Exported');
  });

  /* Import JSON */
  const fileInput = document.getElementById('fileInput');
  document.getElementById('btnImport').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = Object.assign(emptyState(), JSON.parse(reader.result));
        refreshAll();
        save();
        flash('Imported');
      } catch (err) {
        alert("That file doesn't look like a resume export.");
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  /* PDF — browser ka print dialog, "Save as PDF" choose karna hota hai */
  document.getElementById('btnPrint').addEventListener('click', () => {
    const prev = document.title;
    // Print me file ka naam yahi banta hai
    document.title = (state.personal.fullName || 'Resume').replace(/\s+/g, '_');
    window.print();
    setTimeout(() => { document.title = prev; }, 500);
  });
}


/* ---------------------------------------------------------
   8. ZOOM + TABS + INIT
   --------------------------------------------------------- */
let zoom = 1;
const MM_TO_PX = 96 / 25.4;             // 1mm ≈ 3.78px
const PAGE_W = 210 * MM_TO_PX;          // A4 width in px

const PAGE_H = 297 * MM_TO_PX;          // A4 height in px

function applyZoom() {
  document.documentElement.style.setProperty('--r-zoom', zoom);
  document.getElementById('zoomValue').textContent = Math.round(zoom * 100) + '%';

  /* transform se element ka layout size nahi badalta, isliye stage ki
     width/height khud set karte hain — warna scrollbars galat aate hain */
  const stage  = document.getElementById('previewStage');
  const resume = document.getElementById('resume');
  stage.style.width  = PAGE_W * zoom + 'px';
  stage.style.height = resume.offsetHeight * zoom + 'px';

  updatePages();
}

/* Kitne page ban rahe hain + kahan katega — dono dikhao */
function updatePages() {
  const resume = document.getElementById('resume');
  const guides = document.getElementById('guides');
  const chip   = document.getElementById('pageCount');
  const h = resume.offsetHeight;
  const pages = Math.max(1, Math.ceil(h / PAGE_H - 0.002));  // 0.002 = rounding slack

  chip.textContent = pages === 1 ? '1 page' : `${pages} pages`;
  chip.classList.toggle('is-over', pages > 1);
  chip.title = pages > 1
    ? 'Most student resumes work best on one page — try Compact density or trimming bullets.'
    : 'Fits on a single page.';

  // Har page boundary pe ek dashed line
  let lines = '';
  for (let i = 1; i < pages; i++) {
    lines += `<div class="guides__line" style="top:${i * PAGE_H}px"></div>`;
  }
  guides.innerHTML = lines;
}

function fitZoom() {
  const scroll = document.getElementById('previewScroll');
  const avail = scroll.clientWidth - 40;          // padding ke liye
  zoom = Math.min(1, Math.max(0.3, avail / PAGE_W));
  applyZoom();
}

function bindZoom() {
  document.getElementById('zoomIn').addEventListener('click',  () => { zoom = Math.min(1.6, zoom + 0.1); applyZoom(); });
  document.getElementById('zoomOut').addEventListener('click', () => { zoom = Math.max(0.3, zoom - 0.1); applyZoom(); });
  document.getElementById('zoomFit').addEventListener('click', fitZoom);
  window.addEventListener('resize', debounce(fitZoom, 200));
}

function bindTabs() {
  const app = document.querySelector('.app');
  app.dataset.tab = 'edit';
  document.querySelectorAll('.tabs__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs__btn').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      app.dataset.tab = btn.dataset.tab;
      if (btn.dataset.tab === 'preview') fitZoom();
    });
  });
}

/* Preview ki height badalne par stage bhi adjust ho */
const ro = new ResizeObserver(() => applyZoom());

function init() {
  const had = load();
  buildRepeaters();
  bindSimpleFields();
  bindDesign();
  bindToolbar();
  bindZoom();
  bindTabs();
  refreshAll();
  fitZoom();
  ro.observe(document.getElementById('resume'));

  if (!had) flash('Tip: hit “Load sample” to see a filled example');
}

document.addEventListener('DOMContentLoaded', init);


/* ---------------------------------------------------------
   PLACEHOLDER — jab kuch bhara na ho tab preview me yahi
   dikhta hai ("Your Name", "Your Degree" waghera), taaki
   user ko pata chale resume kaisa banega.
   Ye kabhi state me nahi jata — sirf dikhane ke liye hai.
   --------------------------------------------------------- */
const PLACEHOLDER = {
  personal: {
    fullName: 'Your Name',
    role: 'Your Job Title',
    email: 'your.email@example.com',
    phone: '+91 00000 00000',
    location: 'City, State',
    website: 'yourwebsite.com',
    linkedin: 'linkedin.com/in/your-profile',
    github: 'github.com/your-username',
  },
  summary: 'Write two to four lines about who you are, what you build, and what kind of role you are looking for.',
  education: [{
    degree: 'Your Degree / Course', institution: 'Your Institution',
    location: 'City, State', score: 'Your CGPA / %',
    start: 'Start', end: 'End', details: '',
  }],
  experience: [{
    role: 'Your Role', company: 'Company Name', location: 'City',
    start: 'Start', end: 'End',
    details: 'What you did — one bullet per line\nAnother point, ideally with a number in it',
  }],
  projects: [{
    name: 'Project Name', tech: 'Tech you used', link: '',
    start: 'Start', end: 'End',
    details: 'What the project does\nSomething interesting about how you built it',
  }],
  skills: [
    { category: 'Languages',  items: 'Your programming languages' },
    { category: 'Frameworks', items: 'Your frameworks and libraries' },
    { category: 'Tools',      items: 'Your tools' },
  ],
  certifications: [{ name: 'Certificate Name', issuer: 'Issued by', date: '', link: '' }],
  achievements: [{ text: 'An achievement, award, or ranking worth showing' }],
  languages: [{ name: 'Language', level: 'Level' }],
  custom: [],
};


/* ---------------------------------------------------------
   Sample data — "Load sample" button ke liye
   --------------------------------------------------------- */
function sampleState() {
  return {
    design: { template: 'classic', accent: '#0d6b67', font: 'sans', density: 'compact' },
    personal: {
      fullName: 'Vansh Bhardwaj',
      role: 'IoT Developer · Full-Stack · Embedded Systems · Cybersecurity',
      email: 'email@example.com',
      phone: '+91 00000 00000',
      location: 'Delhi, India',
      website: '',
      linkedin: 'linkedin.com/in/vansh-developer',
      github: 'github.com/vansh231205',
    },
    summary: 'Final-year B.Tech CSE student specializing in IoT, with hands-on experience in backend development and embedded systems. I have built full-stack applications and IoT systems integrating ESP8266 for real-time communication. A strong foundation in problem-solving and scalable system design lets me approach challenges efficiently.',
    education: [{
      degree: 'B.Tech — Computer Science & Engineering (IoT)',
      institution: 'Raj Kumar Goel Institute of Technology',
      location: 'Ghaziabad, UP',
      score: '',
      start: '2023-09', end: '2027-08',
      details: '',
    }],
    experience: [],
    projects: [{
      name: 'Vormar AI Assistant',
      tech: 'Python, MySQL, REST APIs, OOP',
      link: '',
      start: '2025-07', end: '2025-08',
      details: 'Built an AI-based assistant to automate scheduling and task management using Python and MySQL\nDesigned backend architecture using OOP principles and integrated external APIs for real-time data\nOptimized database queries to reduce response latency and improve performance',
    }, {
      name: 'IoT-Based WiFi Controlled Robo Car',
      tech: 'ESP8266, Arduino, HTML/CSS/JS',
      link: '',
      start: '2025-05', end: '',
      details: 'Developed a WiFi-controlled robotic car using ESP8266 with ultrasonic obstacle detection\nImplemented real-time browser-based control over the local network\nDesigned a lightweight web interface for seamless directional navigation',
    }],
    skills: [
      { category: 'Languages',       items: 'Python, JavaScript, SQL' },
      { category: 'Web Technologies', items: 'HTML, CSS, Node.js, Express.js, EJS, REST APIs' },
      { category: 'Tools',           items: 'Git, GitHub, VS Code, Arduino IDE' },
      { category: 'Concepts',        items: 'OOP, IoT' },
    ],
    certifications: [
      { name: 'Cybersecurity Analyst Job Simulation', issuer: 'Forage', date: '', link: '' },
      { name: 'Android Development with Core Java', issuer: '', date: '', link: '' },
      { name: 'Network Management & Web Development', issuer: '', date: '', link: '' },
    ],
    achievements: [
      { text: 'High Academic Achievement — 90% in final project evaluations for IoT-based solutions in the B.Tech curriculum' },
      { text: 'IoT Device Efficiency — built an IoT device that reduced response latency through optimal coding' },
      { text: 'AI Assistant Project Leader — led a team of five to build an AI assistant, improving user productivity' },
      { text: 'Successful App Development — completed an Android development course, building functional apps with very positive feedback' },
    ],
    languages: [
      { name: 'English', level: 'Proficient' },
      { name: 'Hindi',   level: 'Native' },
    ],
    custom: [
      { heading: 'Training & Courses',
        details: 'Python Course — Python programming\nFull Stack Development — comprehensive full-stack training\nDSA with Python — data structures and algorithms\nNetwork Management & Web Development — with Android and Core Java' },
      { heading: 'Interests',
        details: 'Technical Leadership — mentoring teams and organizing technical events' },
    ],
  };
}
