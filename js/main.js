/* ==========================================================================
   THEBETTERSELF — main.js v5
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     CONFIG
     ---------------------------------------------------------------------- */
  const CONFIG = {
    // Founding 15. Update `taken` MANUALLY as real spots are filled. Never automatic.
    foundingSpots: { total: 15, taken: 0 },
    // WhatsApp contact. `link` is the short link (its pre-filled message is set inside
    // WhatsApp Business). Fill in `phone` (digits only, with country code) to build the
    // link here instead — then `text` below is pre-filled automatically, plan included.
    whatsapp: { link: 'https://wa.me/message/YCJGWLGCUBCZD1', phone: '', text: 'START' }
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ----------------------------------------------------------------------
     Split headlines into masked words (keeps <em> and <br>)
     ---------------------------------------------------------------------- */
  function splitHeadline(el) {
    const nodes = Array.from(el.childNodes);
    el.textContent = '';
    let i = 0;
    const push = (word, isEm) => {
      const w = document.createElement('span'); w.className = 'w';
      const wi = document.createElement('span'); wi.className = 'wi';
      wi.style.setProperty('--i', i++);
      if (isEm) { const em = document.createElement('em'); em.textContent = word; wi.appendChild(em); } else wi.textContent = word;
      w.appendChild(wi); el.appendChild(w); el.appendChild(document.createTextNode(' '));
    };
    nodes.forEach(n => {
      if (n.nodeType === 1 && n.tagName === 'BR') { el.appendChild(document.createElement('br')); return; }
      const isEm = n.nodeType === 1 && n.tagName === 'EM';
      n.textContent.trim().split(/\s+/).filter(Boolean).forEach(word => push(word, isEm));
    });
  }

  /* ----------------------------------------------------------------------
     Language — Portuguese is the markup, English comes from js/i18n.js
     ---------------------------------------------------------------------- */
  const EN = window.TBS_EN || {};
  const LANG_KEY = 'tbs-lang';
  const PT = { html: new Map(), attr: new Map(), title: document.title,
               desc: ($('meta[name="description"]') || {}).content || '' };
  $$('[data-i18n]').forEach(el => PT.html.set(el, el.innerHTML));
  ['alt', 'aria'].forEach(kind => $$(`[data-i18n-${kind}]`).forEach(el => {
    const name = kind === 'aria' ? 'aria-label' : 'alt';
    PT.attr.set(el, { name, value: el.getAttribute(name) });
  }));
  let lang = 'pt';
  const t = (key, fallback) => (lang === 'en' ? (EN[key] || fallback) : fallback);

  function applyLang(next) {
    lang = next === 'en' ? 'en' : 'pt';
    const en = lang === 'en';
    $$('[data-i18n]').forEach(el => {
      const html = en ? (EN[el.dataset.i18n] || PT.html.get(el)) : PT.html.get(el);
      if (html != null && el.innerHTML !== html) el.innerHTML = html;
      if (el.hasAttribute('data-text')) el.setAttribute('data-text', el.textContent.trim());
    });
    PT.attr.forEach((def, el) => {
      const key = el.dataset.i18nAlt || el.dataset.i18nAria;
      el.setAttribute(def.name, en ? (EN[key] || def.value) : def.value);
    });
    document.documentElement.lang = lang;
    document.title = en ? (EN['meta.title'] || PT.title) : PT.title;
    const meta = $('meta[name="description"]');
    if (meta) meta.content = en ? (EN['meta.desc'] || PT.desc) : PT.desc;
    $$('[data-split]').forEach(splitHeadline);
    $$('.lang-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('tbs:lang', { detail: lang }));
  }

  let saved = null; try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
  applyLang(saved || ((navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en'));
  $$('.lang-switch button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));

  /* ----------------------------------------------------------------------
     Anchor links: smooth native scroll
     ---------------------------------------------------------------------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el && id !== 'top') return;
    e.preventDefault();
    const y = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  });

  /* ----------------------------------------------------------------------
     Intro loader → hero in
     ---------------------------------------------------------------------- */
  const loader = $('#loader');
  const hero = $('.hero');
  function startHero() {
    document.body.classList.add('is-ready');
    $$('[data-split], .reveal, [data-img-reveal]', hero).forEach(el => el.classList.add('is-in'));
  }
  let seenIntro = false;
  try { seenIntro = sessionStorage.getItem('tbs-intro') === '1'; } catch (e) {}
  if (reduced || seenIntro) {
    loader.classList.add('is-gone');
    startHero();
  } else {
    $$('.loader-mark span', loader).forEach((s, i) => s.style.setProperty('--i', i));
    requestAnimationFrame(() => loader.classList.add('is-on'));
    setTimeout(() => {
      loader.classList.add('is-done');
      startHero();
      try { sessionStorage.setItem('tbs-intro', '1'); } catch (e) {}
      setTimeout(() => loader.classList.add('is-gone'), 1100);
    }, 1400);
  }

  /* ----------------------------------------------------------------------
     Reveal on scroll (frame-based)
     ---------------------------------------------------------------------- */
  let pending = $$('.reveal, [data-split], [data-img-reveal], .founding').filter(el => !hero.contains(el));
  if (reduced) { pending.forEach(el => el.classList.add('is-in')); pending = []; }
  function scanReveals() {
    if (!pending.length) return;
    const vh = window.innerHeight;
    pending = pending.filter(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add('is-in'); return false; }
      return true;
    });
  }

  /* ----------------------------------------------------------------------
     Scenes: the fixed gym photo follows the window section in view
     ---------------------------------------------------------------------- */
  const scenes = $$('.scene');
  const windows = $$('[data-scene]').filter(el => el.tagName === 'SECTION');
  let activeScene = '';
  function updateScenes() {
    const vh = window.innerHeight;
    let best = null, bestDist = Infinity;
    windows.forEach(w => {
      const r = w.getBoundingClientRect();
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;
      const d = Math.abs(r.top + r.height / 2 - vh / 2);
      if (d < bestDist) { bestDist = d; best = w; }
    });
    const name = best ? best.dataset.scene : activeScene;
    if (name && name !== activeScene) {
      activeScene = name;
      scenes.forEach(s => {
        const on = s.dataset.scene === name;
        s.classList.toggle('is-active', on);
        const v = s.querySelector('video');
        if (!v) return;
        if (on && !reduced) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
        else if (!on) { v.pause(); }
      });
    }
  }

  /* ----------------------------------------------------------------------
     Nav: shrink, hide on scroll down, adapt to section theme
     ---------------------------------------------------------------------- */
  const nav = $('#nav');
  let lastY = window.scrollY;
  function navUpdate(y) {
    nav.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > lastY + 2 && y > 160;
    const goingUp = y < lastY - 2;
    if (goingDown) nav.classList.add('is-hidden');
    if (goingUp || y < 160) nav.classList.remove('is-hidden');
    lastY = y;
  }
  const themed = $$('main > section, footer');
  function navTheme() {
    if (document.body.classList.contains('menu-open')) { nav.dataset.theme = 'dark'; return; }
    const probe = 30;
    let theme = 'dark';
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { theme = s.classList.contains('light') ? 'light' : 'dark'; break; }
    }
    if (nav.dataset.theme !== theme) nav.dataset.theme = theme;
  }
  const burger = $('#navBurger');
  const mobileMenu = $('#mobileMenu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? t('nav.close', 'Fechar menu') : t('nav.open', 'Abrir menu'));
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
    if (open) nav.classList.remove('is-hidden');
    navTheme();
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', mobileMenu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ----------------------------------------------------------------------
     Magnetic buttons, card spotlight, hero pointer parallax
     ---------------------------------------------------------------------- */
  const magnets = $$('[data-magnetic]').map(el => ({ el, x: 0, y: 0, tx: 0, ty: 0 }));
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer && !reduced) {
    magnets.forEach(m => {
      m.el.addEventListener('pointermove', e => {
        const r = m.el.getBoundingClientRect();
        m.tx = (e.clientX - (r.left + r.width / 2)) * 0.28;
        m.ty = (e.clientY - (r.top + r.height / 2)) * 0.28;
      });
      m.el.addEventListener('pointerleave', () => { m.tx = 0; m.ty = 0; });
    });
    $$('[data-spot]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        card.style.setProperty('--mx', `${mx}px`);
        card.style.setProperty('--my', `${my}px`);
        const rx = ((my / r.height) - 0.5) * -5, ry = ((mx / r.width) - 0.5) * 5;
        card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(6px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
    hero.addEventListener('pointermove', e => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    hero.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
  }

  /* ----------------------------------------------------------------------
     Frame loop
     ---------------------------------------------------------------------- */
  const parallaxEls = $$('[data-parallax]').map(el => ({ el, f: parseFloat(el.dataset.parallax) || 0.1, p: parseFloat(el.dataset.pointer) || 0, y: 0 }));
  let tick = 0;
  function frame() {
    const vh = window.innerHeight;
    tick++;
    navUpdate(window.scrollY);
    if (tick % 3 === 0) { navTheme(); scanReveals(); updateScenes(); }
    if (!reduced) {
      pointer.x = lerp(pointer.x, pointer.tx, 0.06); pointer.y = lerp(pointer.y, pointer.ty, 0.06);
      parallaxEls.forEach(p => {
        const r = p.el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const progress = (r.top + r.height / 2 - vh / 2) / vh;
        p.y = lerp(p.y, -progress * r.height * p.f, 0.12);
        const px = p.p ? pointer.x * p.p : 0;
        const py = p.p ? pointer.y * p.p : 0;
        p.el.style.transform = `translate3d(${px.toFixed(2)}px, ${(p.y + py).toFixed(2)}px, 0) scale(${1 + p.f * 1.4 + (p.p ? 0.04 : 0)})`;
      });
    }
    if (finePointer && !reduced) {
      magnets.forEach(m => {
        m.x = lerp(m.x, m.tx, 0.18); m.y = lerp(m.y, m.ty, 0.18);
        if (Math.abs(m.x) > 0.05 || Math.abs(m.y) > 0.05 || m.tx || m.ty) m.el.style.transform = `translate3d(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px, 0)`;
        else if (m.el.style.transform) m.el.style.transform = '';
      });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  scanReveals(); navTheme(); updateScenes();

  /* ----------------------------------------------------------------------
     Before / After: drag, touch, keyboard + one demo sweep when it appears
     ---------------------------------------------------------------------- */
  $$('[data-ba]').forEach(frameEl => {
    const range = $('.ba-range', frameEl);
    let touched = false;
    const set = v => frameEl.style.setProperty('--pos', `${v}%`);
    range.addEventListener('input', () => { touched = true; set(range.value); });
    const on = () => { touched = true; frameEl.classList.add('is-active'); };
    const off = () => frameEl.classList.remove('is-active');
    range.addEventListener('pointerdown', on);
    range.addEventListener('pointerup', off);
    range.addEventListener('pointercancel', off);
    range.addEventListener('mouseleave', off);
    range.addEventListener('touchend', off, { passive: true });
    range.addEventListener('focus', () => frameEl.classList.add('is-active'));
    range.addEventListener('blur', off);
    if (reduced) return;
    let started = false;
    const sweep = () => {
      if (touched || started) return; started = true;
      const keys = [[0, 50], [900, 12], [2100, 88], [3100, 50]];
      const t0 = performance.now();
      const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const step = now => {
        if (touched) return;
        const t = now - t0;
        let i = 1; while (i < keys.length - 1 && t > keys[i][0]) i++;
        const [ta, va] = keys[i - 1], [tb, vb] = keys[i];
        const p = clamp((t - ta) / (tb - ta), 0, 1);
        const v = va + (vb - va) * ease(p);
        range.value = v; set(v);
        if (t < keys[keys.length - 1][0]) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const check = () => {
      const r = frameEl.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.6 && r.bottom > 0) { setTimeout(sweep, 400); window.removeEventListener('scroll', check); }
    };
    window.addEventListener('scroll', check, { passive: true }); check();
  });

  /* ----------------------------------------------------------------------
     Calendar: pages fly off 1 → 60 while the grid fills
     ---------------------------------------------------------------------- */
  (function () {
    const cal = $('#cal'); if (!cal) return;
    const num = $('#calNum'), grid = $('#calGrid'), leaves = $('#calLeaves');
    const cells = [];
    for (let i = 0; i < 60; i++) { const c = document.createElement('i'); grid.appendChild(c); cells.push(c); }
    let started = false;
    const run = () => {
      if (started) return; started = true;
      if (reduced) { num.textContent = '60'; cells.forEach(c => c.classList.add('is-on')); cal.classList.add('is-done'); return; }
      let day = 1;
      const step = () => {
        if (day >= 60) { cells[cells.length - 1].classList.add('is-on'); cal.classList.add('is-done'); return; }
        // the current page flies away
        const leaf = document.createElement('span');
        leaf.className = 'cal-leaf'; leaf.textContent = String(day).padStart(2, '0');
        const ang = (Math.random() * 0.9 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
        leaf.style.setProperty('--lx', `${Math.cos(ang) * (220 + Math.random() * 160)}px`);
        leaf.style.setProperty('--ly', `${-120 - Math.random() * 220}px`);
        leaf.style.setProperty('--lr', `${(Math.random() * 50 - 25).toFixed(1)}deg`);
        leaves.appendChild(leaf);
        setTimeout(() => leaf.remove(), 950);
        cells[day - 1].classList.add('is-on');
        day++;
        num.textContent = String(day);
        const delay = 25 + (day / 60) * 55; // eases out as it approaches 60
        setTimeout(step, delay);
      };
      cells[0].classList.add('is-on');
      setTimeout(step, 350);
    };
    const check = () => {
      const r = cal.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.8 && r.bottom > 0) { run(); window.removeEventListener('scroll', check); }
    };
    window.addEventListener('scroll', check, { passive: true }); check();
  })();

  /* ----------------------------------------------------------------------
     Count-up
     ---------------------------------------------------------------------- */
  $$('[data-count]').forEach(el => {
    const target = Number(el.dataset.count);
    let done = false;
    const run = () => {
      if (done) return; done = true;
      if (reduced) { el.textContent = target; return; }
      const t0 = performance.now(), dur = 1500;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round((1 - Math.pow(1 - p, 4)) * target);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const check = () => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85 && r.bottom > 0) { run(); window.removeEventListener('scroll', check); }
    };
    window.addEventListener('scroll', check, { passive: true }); check();
  });

  /* ----------------------------------------------------------------------
     Founding 15 (static, config-driven)
     ---------------------------------------------------------------------- */
  const { total, taken } = CONFIG.foundingSpots;
  const spotsLeft = total - clamp(taken, 0, total);
  (function () {
    const wrap = $('#foundingSegments'), text = $('#foundingText');
    if (!wrap) return;
    wrap.style.gridTemplateColumns = `repeat(${total}, 1fr)`;
    for (let i = 0; i < total; i++) {
      const s = document.createElement('i');
      if (i < total - spotsLeft) s.classList.add('is-taken');
      s.style.transitionDelay = `${i * 40}ms`;
      wrap.appendChild(s);
    }
    const fill = () => { text.textContent = spotsLeft === 0
      ? t('founding.full', 'Todas as vagas preenchidas.')
      : t('founding.text', `${spotsLeft} de ${total} vagas disponíveis.`).replace('{n}', spotsLeft).replace('{total}', total); };
    fill();
    document.addEventListener('tbs:lang', fill);
  })();

  /* ----------------------------------------------------------------------
     WhatsApp CTA — remembers which plan was clicked
     ---------------------------------------------------------------------- */
  const wa = CONFIG.whatsapp || {};
  let chosenProgram = '';
  const waHref = () => {
    if (!wa.phone) return wa.link;                       // short link: message set in WhatsApp Business
    const msg = chosenProgram ? `${wa.text} ${chosenProgram}` : wa.text;
    return `https://wa.me/${String(wa.phone).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };
  const refreshWaLinks = () => $$('[data-wa]').forEach(a => { a.href = waHref(); });
  refreshWaLinks();
  $$('[data-program]').forEach(link => link.addEventListener('click', () => {
    chosenProgram = link.dataset.program === 'NOT SURE' ? '' : link.dataset.program;
    refreshWaLinks();
  }));

  /* ----------------------------------------------------------------------
     Sticky mobile CTA
     ---------------------------------------------------------------------- */
  const heroSpots = $('#heroSpots'); if (heroSpots) heroSpots.textContent = String(spotsLeft);
  const sticky = $('#stickyCta');
  const applySection = $('#apply');
  if (sticky) {
    const note = () => { $('#stickyCtaNote').textContent = spotsLeft > 0
      ? t('sticky.note', `${spotsLeft} vagas de fundador`).replace('{n}', spotsLeft) : ''; };
    note();
    document.addEventListener('tbs:lang', note);
    const update = () => {
      const r = applySection.getBoundingClientRect();
      const formVisible = r.top < window.innerHeight * 0.6 && r.bottom > 0;
      sticky.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.8 && !formVisible && !document.body.classList.contains('menu-open'));
    };
    window.addEventListener('scroll', update, { passive: true }); update();
  }

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
