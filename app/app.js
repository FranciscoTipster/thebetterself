/* ==========================================================================
   THEBETTERSELF — members app
   Vanilla JS single-page app. Data layer: Supabase (production) or a demo
   store in localStorage when config.js has no Supabase keys.
   ========================================================================== */
(function () {
  'use strict';

  const CFG = window.TBS_CONFIG || {};
  const root = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const fmtDate = d => { if (!d) return '—'; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
  const fmtWhen = d => { if (!d) return 'never'; const x = new Date(d); const diff = (Date.now() - x.getTime()) / 1000; if (diff < 60) return 'just now'; if (diff < 3600) return `${Math.floor(diff / 60)} min ago`; if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`; if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`; return fmtDate(x); };
  const by = (k, dir = 1) => (a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0);
  const PROGRAMS = ['START', 'EVOLVE', 'PRIME', 'NOT SURE'];
  const isAdminEmail = e => (CFG.ADMIN_EMAILS || []).map(x => x.toLowerCase()).includes(String(e || '').toLowerCase());

  /* ======================================================================
     DEMO DATA LAYER (localStorage)
     ====================================================================== */
  function demoApi() {
    const KEY = 'tbs-demo-db-v1', SKEY = 'tbs-demo-session';
    const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
    const dateAgo = n => daysAgo(n).slice(0, 10);

    function seed() {
      const accounts = CFG.DEMO_ACCOUNTS || [];
      const profiles = accounts.map((a, i) => ({ id: `u${i + 1}`, email: a.email, full_name: a.full_name, role: a.role, program: a.program, approved: true, created_at: daysAgo(40 - i) }));
      const member = profiles.find(p => p.role === 'member') || profiles[0];
      const admin = profiles.find(p => p.role === 'admin') || profiles[0];
      const mk = (title, day, sort, ex) => ({ id: uid(), user_id: member.id, title, day_label: day, coach_notes: '', sort, created_by: admin.id, created_at: daysAgo(30), exercises: ex.map((e, i) => ({ id: uid(), name: e[0], target_sets: e[1], target_reps: e[2], sort: i })) });
      const workouts = [
        mk('Upper body', 'Day A', 0, [['Bench press', 4, '6-8'], ['Pull-ups', 4, '6-10'], ['Overhead press', 3, '8-10'], ['Seated row', 3, '10-12'], ['Face pulls', 3, '15']]),
        mk('Lower body', 'Day B', 1, [['Back squat', 4, '5-8'], ['Romanian deadlift', 3, '8-10'], ['Walking lunges', 3, '12 / leg'], ['Leg curl', 3, '12'], ['Calf raises', 4, '12-15']]),
        mk('Full body', 'Day C', 2, [['Deadlift', 3, '3-5'], ['Incline dumbbell press', 3, '8-10'], ['Lat pulldown', 3, '10-12'], ['Plank', 3, '45 s']])
      ];
      workouts[0].coach_notes = 'Control the eccentric on every press. Rest 2–3 min between the heavy sets.';
      const sessions = [];
      const addSession = (w, daysBack, kgs) => {
        const s = { id: uid(), user_id: member.id, workout_id: w.id, workout_title: w.title, date: dateAgo(daysBack), notes: '', created_at: daysAgo(daysBack), sets: [] };
        w.exercises.forEach((ex, i) => {
          const base = kgs[i]; if (base == null) return;
          for (let n = 1; n <= ex.target_sets; n++) s.sets.push({ exercise_id: ex.id, exercise_name: ex.name, set_no: n, weight_kg: base, reps: 8 });
        });
        sessions.push(s);
      };
      addSession(workouts[0], 20, [60, 0, 35, 50, 15]); addSession(workouts[1], 18, [80, 70, 16, 40, 60]);
      addSession(workouts[0], 13, [62.5, 0, 37.5, 55, 15]); addSession(workouts[1], 11, [85, 75, 18, 45, 60]);
      addSession(workouts[0], 6, [65, 0, 40, 55, 17.5]); addSession(workouts[1], 4, [90, 80, 20, 45, 65]);
      addSession(workouts[2], 1, [110, 26, 60, 0]);
      const notes = [
        { id: uid(), user_id: member.id, author_id: admin.id, kind: 'coach', body: 'Great week. Bench is moving: next session try 67.5 kg on the first two sets and keep 65 for the rest.', created_at: daysAgo(3) },
        { id: uid(), user_id: member.id, author_id: member.id, kind: 'member', body: 'Slept badly on Tuesday, squats felt heavy. Nutrition on point the rest of the week.', created_at: daysAgo(5) }
      ];
      const logins = [
        { id: uid(), user_id: member.id, at: daysAgo(1), user_agent: 'iPhone' }, { id: uid(), user_id: member.id, at: daysAgo(4), user_agent: 'iPhone' },
        { id: uid(), user_id: admin.id, at: daysAgo(2), user_agent: 'Mac' }, { id: uid(), user_id: member.id, at: daysAgo(6), user_agent: 'iPhone' }
      ];
      return { profiles, workouts, sessions, notes, logins };
    }
    let db; try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    if (!db) { db = seed(); persist(); }
    function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
    const wait = v => new Promise(r => setTimeout(() => r(v), 120));
    const prof = id => db.profiles.find(p => p.id === id);
    const me = () => { const id = sessionStorage.getItem(SKEY); return id ? prof(id) || null : null; };

    return {
      mode: 'demo',
      async signIn(email, password) {
        const acc = (CFG.DEMO_ACCOUNTS || []).find(a => a.email.toLowerCase() === String(email).toLowerCase());
        if (!acc || acc.password !== password) throw new Error('Demo mode: wrong email or password.');
        const p = db.profiles.find(x => x.email.toLowerCase() === acc.email.toLowerCase());
        sessionStorage.setItem(SKEY, p.id);
        db.logins.unshift({ id: uid(), user_id: p.id, at: new Date().toISOString(), user_agent: navigator.userAgent.slice(0, 80) }); persist();
        return wait(p);
      },
      async signUp() { throw new Error('Demo mode: use one of the demo accounts.'); },
      async resetPassword() { throw new Error('Demo mode: password is tbs-demo.'); },
      async signOut() { sessionStorage.removeItem(SKEY); },
      async getUser() { return me(); },
      async listProfiles() { return wait(db.profiles.map(p => ({ ...p }))); },
      async updateProfile(id, patch) { Object.assign(prof(id), patch); persist(); return wait(prof(id)); },
      async listWorkouts(userId) { return wait(db.workouts.filter(w => w.user_id === userId).sort(by('sort')).map(w => ({ ...w, exercises: [...w.exercises].sort(by('sort')) }))); },
      async saveWorkout(w) {
        const i = db.workouts.findIndex(x => x.id === w.id);
        const rec = { ...w, exercises: w.exercises.map((e, k) => ({ ...e, id: e.id || uid(), sort: k })) };
        if (i >= 0) db.workouts[i] = rec; else db.workouts.push(rec);
        persist(); return wait(rec);
      },
      async deleteWorkout(id) { db.workouts = db.workouts.filter(w => w.id !== id); persist(); return wait(true); },
      async listSessions(userId) { return wait(db.sessions.filter(s => s.user_id === userId).sort(by('date', -1)).map(s => ({ ...s }))); },
      async saveSession(s) { const rec = { ...s, id: s.id || uid(), created_at: new Date().toISOString() }; db.sessions.unshift(rec); persist(); return wait(rec); },
      async deleteSession(id) { db.sessions = db.sessions.filter(s => s.id !== id); persist(); return wait(true); },
      async listNotes(userId) { return wait(db.notes.filter(n => n.user_id === userId).sort(by('created_at', -1))); },
      async addNote(n) { const rec = { ...n, id: uid(), created_at: new Date().toISOString() }; db.notes.unshift(rec); persist(); return wait(rec); },
      async deleteNote(id) { db.notes = db.notes.filter(n => n.id !== id); persist(); return wait(true); },
      async listLogins(limit = 50) { return wait(db.logins.slice().sort(by('at', -1)).slice(0, limit).map(l => ({ ...l, profile: prof(l.user_id) }))); },
      async listAllSessions(limit = 30) { return wait(db.sessions.slice().sort(by('created_at', -1)).slice(0, limit).map(s => ({ ...s, profile: prof(s.user_id) }))); },
      async resetDemo() { localStorage.removeItem(KEY); sessionStorage.removeItem(SKEY); db = seed(); persist(); }
    };
  }

  /* ======================================================================
     SUPABASE DATA LAYER
     ====================================================================== */
  function supabaseApi(sb) {
    const profileOf = async id => { const { data, error } = await sb.from('profiles').select('*').eq('id', id).single(); if (error) throw error; return data; };
    const shapeWorkout = w => ({ ...w, exercises: (w.workout_exercises || []).slice().sort(by('sort')) });
    const shapeSession = s => ({ ...s, sets: (s.session_sets || []).slice().sort((a, b) => a.set_no - b.set_no) });
    const finish = async userId => {
      let p = null;
      for (let i = 0; i < 6 && !p; i++) { try { p = await profileOf(userId); } catch (e) { await new Promise(r => setTimeout(r, 400)); } }
      if (!p) throw new Error('Your profile is not ready yet. Try again in a moment.');
      await sb.from('logins').insert({ user_id: p.id, user_agent: navigator.userAgent.slice(0, 120) });
      return p;
    };
    return {
      mode: 'supabase',
      async signIn(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(/invalid login/i.test(error.message) ? 'Wrong email or password.' : error.message);
        return finish(data.user.id);
      },
      async signUp(email, password, fullName) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw new Error(/already registered/i.test(error.message) ? 'This email already has an account. Log in instead.' : /rate limit/i.test(error.message) ? 'Email confirmation is still switched on and the email limit was reached. Ask your coach to switch it off, or try again in an hour.' : error.message);
        if (!data.session) throw new Error('Account created. Check your email to confirm it, then log in.');
        return finish(data.user.id);
      },
      async resetPassword(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] + '#/password' });
        if (error) throw new Error(error.message);
      },
      async updatePassword(password) {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw new Error(error.message);
      },
      async signInWithGoogle() {
        const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } });
        if (error) throw new Error(error.message);
      },
      async signOut() { await sb.auth.signOut(); },
      async recordLogin() { const { data } = await sb.auth.getSession(); if (data.session) await sb.from('logins').insert({ user_id: data.session.user.id, user_agent: navigator.userAgent.slice(0, 120) }); },

      async getUser() { const { data } = await sb.auth.getSession(); if (!data.session) return null; try { return await profileOf(data.session.user.id); } catch (e) { return null; } },
      async listProfiles() { const { data, error } = await sb.from('profiles').select('*').order('created_at'); if (error) throw error; return data; },
      async updateProfile(id, patch) { const { data, error } = await sb.from('profiles').update(patch).eq('id', id).select().single(); if (error) throw error; return data; },
      async listWorkouts(userId) { const { data, error } = await sb.from('workouts').select('*, workout_exercises(*)').eq('user_id', userId).order('sort'); if (error) throw error; return data.map(shapeWorkout); },
      async saveWorkout(w) {
        const row = { id: w.id, user_id: w.user_id, title: w.title, day_label: w.day_label || null, coach_notes: w.coach_notes || null, sort: w.sort || 0, created_by: w.created_by || null };
        const { error } = await sb.from('workouts').upsert(row); if (error) throw error;
        const { error: e2 } = await sb.from('workout_exercises').delete().eq('workout_id', w.id); if (e2) throw e2;
        const ex = w.exercises.map((e, k) => ({ workout_id: w.id, name: e.name, target_sets: Number(e.target_sets) || 3, target_reps: e.target_reps || '8-12', sort: k }));
        if (ex.length) { const { error: e3 } = await sb.from('workout_exercises').insert(ex); if (e3) throw e3; }
        return w;
      },
      async deleteWorkout(id) { const { error } = await sb.from('workouts').delete().eq('id', id); if (error) throw error; return true; },
      async listSessions(userId) { const { data, error } = await sb.from('sessions').select('*, session_sets(*)').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }); if (error) throw error; return data.map(shapeSession); },
      async saveSession(s) {
        const { data, error } = await sb.from('sessions').insert({ user_id: s.user_id, workout_id: s.workout_id || null, workout_title: s.workout_title, date: s.date, notes: s.notes || null }).select().single(); if (error) throw error;
        const sets = s.sets.map(x => ({ session_id: data.id, exercise_id: x.exercise_id || null, exercise_name: x.exercise_name, set_no: x.set_no, weight_kg: x.weight_kg, reps: x.reps }));
        if (sets.length) { const { error: e2 } = await sb.from('session_sets').insert(sets); if (e2) throw e2; }
        return { ...s, id: data.id };
      },
      async deleteSession(id) { const { error } = await sb.from('sessions').delete().eq('id', id); if (error) throw error; return true; },
      async listNotes(userId) { const { data, error } = await sb.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }); if (error) throw error; return data; },
      async addNote(n) { const { data, error } = await sb.from('notes').insert({ user_id: n.user_id, author_id: n.author_id, kind: n.kind, body: n.body }).select().single(); if (error) throw error; return data; },
      async deleteNote(id) { const { error } = await sb.from('notes').delete().eq('id', id); if (error) throw error; return true; },
      async listLogins(limit = 50) { const { data, error } = await sb.from('logins').select('*, profile:profiles(full_name,email)').order('at', { ascending: false }).limit(limit); if (error) throw error; return data; },
      async listAllSessions(limit = 30) { const { data, error } = await sb.from('sessions').select('*, session_sets(*), profile:profiles(full_name,email)').order('created_at', { ascending: false }).limit(limit); if (error) throw error; return data.map(shapeSession); }
    };
  }

  /* ======================================================================
     APP STATE + ROUTER
     ====================================================================== */
  const api = (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase)
    ? supabaseApi(window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY))
    : demoApi();
  const state = { user: null, cache: {} };
  const isAdmin = () => !!state.user && (state.user.role === 'admin' || isAdminEmail(state.user.email));

  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, ...rest] = h.split('/');
    return { path: path || 'home', params: rest };
  }
  function go(h) { location.hash = h; }
  window.addEventListener('hashchange', render);

  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  /* ======================================================================
     HELPERS: stats
     ====================================================================== */
  function exerciseHistory(sessions) {
    // name → [{date, best, volume, sets:[{weight_kg,reps}]}] sorted by date asc
    const map = {};
    sessions.forEach(s => {
      const groups = {};
      (s.sets || []).forEach(x => { if (!x.exercise_name) return; (groups[x.exercise_name] = groups[x.exercise_name] || []).push(x); });
      Object.keys(groups).forEach(name => {
        const sets = groups[name].filter(x => x.weight_kg != null || x.reps != null);
        if (!sets.length) return;
        const best = Math.max(...sets.map(x => Number(x.weight_kg) || 0));
        const volume = sets.reduce((a, x) => a + (Number(x.weight_kg) || 0) * (Number(x.reps) || 0), 0);
        (map[name] = map[name] || []).push({ date: s.date, best, volume, sets });
      });
    });
    Object.values(map).forEach(arr => arr.sort(by('date')));
    return map;
  }
  function streakWeeks(sessions) {
    if (!sessions.length) return 0;
    const weeks = new Set(sessions.map(s => { const d = new Date(s.date); const onejan = new Date(d.getFullYear(), 0, 1); return d.getFullYear() * 100 + Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7); }));
    let n = 0; const now = new Date();
    for (let i = 0; i < 52; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i * 7);
      const onejan = new Date(d.getFullYear(), 0, 1); const key = d.getFullYear() * 100 + Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
      if (weeks.has(key)) n++; else if (i > 0) break;
    }
    return n;
  }
  function chartSVG(points, unit = 'kg') {
    if (!points.length) return `<div class="empty">No data yet.</div>`;
    const W = 600, H = 160, px = 28, py = 18;
    const vals = points.map(p => p.v); const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || 1;
    const x = i => px + (points.length === 1 ? (W - 2 * px) / 2 : (i / (points.length - 1)) * (W - 2 * px));
    const y = v => H - py - ((v - min) / span) * (H - 2 * py);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const dots = points.map((p, i) => `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.5"><title>${esc(fmtDate(p.date))}: ${p.v} ${unit}</title></circle>`).join('');
    const first = points[0], last = points[points.length - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Progress chart">
      <line class="axis" x1="${px}" y1="${H - py}" x2="${W - px}" y2="${H - py}"/>
      <path class="line" d="${d}"/>${dots}
      <text class="lbl" x="${px}" y="${H - 4}">${esc(fmtDate(first.date))}</text>
      <text class="lbl" x="${W - px}" y="${H - 4}" text-anchor="end">${esc(fmtDate(last.date))}</text>
      <text class="lbl" x="${W - px}" y="12" text-anchor="end">${max} ${unit}</text>
    </svg>`;
  }

  /* ======================================================================
     LAYOUT
     ====================================================================== */
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    train: '<svg viewBox="0 0 24 24"><path d="M3 10v4M21 10v4M6 8v8M18 8v8M8 12h8"/></svg>',
    progress: '<svg viewBox="0 0 24 24"><path d="M3 19h18M5 15l4-5 4 3 6-8"/></svg>',
    notes: '<svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5zM8 10h8M8 14h8"/></svg>',
    admin: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg>'
  };
  function layout(title, body, opts = {}) {
    const r = route().path;
    const u = state.user;
    const memberLinks = [['home', 'Home', ICON.home], ['workouts', 'Train', ICON.train], ['progress', 'Progress', ICON.progress], ['notes', 'Notes', ICON.notes]];
    const adminLinks = isAdmin() ? [['admin', 'Admin', ICON.admin]] : [];
    const active = p => (r === p || (p === 'workouts' && r === 'workout') || (p === 'admin' && r.startsWith('admin')) ? 'is-active' : '');
    const side = memberLinks.map(([p, l, i]) => `<a href="#/${p}" class="${active(p)}">${i}${l}</a>`).join('')
      + (adminLinks.length ? `<span class="label sep">Coach</span>` + adminLinks.map(([p, l, i]) => `<a href="#/${p}" class="${active(p)}">${i}${l}</a>`).join('') : '');
    root.innerHTML = `
      <div class="shell">
        <aside class="side">
          <a href="#/home" class="wordmark">THE<b>BETTER</b>SELF</a>
          <nav class="side-nav">${side}</nav>
          <div class="side-user">
            <span class="label">${isAdmin() ? 'Admin' : esc(u.program || 'Member')}</span>
            <strong>${esc(u.full_name || u.email)}</strong>
            <button class="btn btn-line btn-sm" data-act="logout">Log out</button>
            ${api.mode === 'demo' ? '<span class="badge gold"><i></i>Demo mode</span>' : ''}
          </div>
        </aside>
        <main class="main">
          <div class="topbar"><h1 class="h1">${title}</h1>${opts.right || ''}</div>
          ${body}
        </main>
      </div>
      <nav class="tabbar" aria-label="Sections">
        ${memberLinks.concat(adminLinks).map(([p, l, i]) => `<a href="#/${p}" class="${active(p)}">${i}<span>${l}</span></a>`).join('')}
      </nav>`;
    root.querySelector('[data-act="logout"]').addEventListener('click', async () => { await api.signOut(); state.user = null; state.cache = {}; go('/login'); });
  }
  const sideIcons = () => { root.querySelectorAll('.side-nav svg, .tabbar svg').forEach(s => { s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.6'); }); };

  /* ======================================================================
     VIEWS — AUTH
     ====================================================================== */
  function viewLogin(err = '') {
    const demo = api.mode === 'demo';
    const st = state.login || { mode: 'login', email: '', msg: '' };
    const isSignup = st.mode === 'signup', isReset = st.mode === 'reset';
    const googleBtn = CFG.GOOGLE_LOGIN && !demo ? `<button type="button" class="btn btn-line btn-block" id="google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.8 6.1C12.2 13.6 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.3 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.4 0-11.8-4.1-13.7-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continue with Google</button><div class="label" style="text-align:center">or</div>` : '';
    root.innerHTML = `
      <div class="login">
        <div class="login-side">
          <video autoplay muted loop playsinline poster="../assets/img/stock/plate-1600.webp" src="../assets/video/method.mp4"></video>
          <div class="login-side-inner">
            <a href="../" class="wordmark">THE<b>BETTER</b>SELF</a>
            <div><p class="label" style="margin-bottom:14px">Members</p><h1 class="h1">Show up. Log it. <em>Get better.</em></h1></div>
            <span class="label">Personalized · 1-on-1 · Remote</span>
          </div>
        </div>
        <div class="login-form">
          <form class="form" id="loginForm" novalidate>
            <div class="login-tabs" role="tablist">
              <button type="button" class="login-tab ${!isSignup && !isReset ? 'is-on' : ''}" data-mode="login">Log in</button>
              <button type="button" class="login-tab ${isSignup ? 'is-on' : ''}" data-mode="signup">Create account</button>
            </div>
            ${isReset
              ? `<div><p class="label" style="margin-bottom:10px">Password</p><h2 class="h2" style="font-size:1.8rem">Reset your password.</h2><p class="muted small" style="margin-top:10px">We email you a link to choose a new password.</p></div>`
              : isSignup
                ? `<div><p class="label" style="margin-bottom:10px">VIP Zone</p><h2 class="h2" style="font-size:1.8rem">Create your account.</h2><p class="muted small" style="margin-top:10px">Takes 20 seconds. Your coach activates it after your application.</p></div>`
                : `<div><p class="label" style="margin-bottom:10px">VIP Zone</p><h2 class="h2" style="font-size:1.8rem">Welcome back.</h2></div>`}
            ${isReset ? '' : googleBtn}
            ${isSignup ? `<div class="field"><label for="name">Name</label><input id="name" name="name" type="text" autocomplete="name" required /></div>` : ''}
            <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" value="${esc(st.email)}" required /></div>
            ${isReset ? '' : `<div class="field"><label for="password">Password${isSignup ? ' <span class="muted">(min. 6 characters)</span>' : ''}</label><input id="password" name="password" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" minlength="6" required /></div>`}
            <p class="form-error" id="loginErr" ${err ? '' : 'hidden'}>${esc(err)}</p>
            <p class="small" id="loginMsg" ${st.msg ? '' : 'hidden'}>${esc(st.msg)}</p>
            <button class="btn btn-fill btn-block" type="submit">${isReset ? 'Send reset link' : isSignup ? 'Create my account' : 'Log in'}</button>
            ${isReset
              ? `<button type="button" class="small muted" data-mode="login" style="justify-self:start;text-decoration:underline">← Back to log in</button>`
              : isSignup ? '' : `<button type="button" class="small muted" data-mode="reset" style="justify-self:start;text-decoration:underline">Forgot your password?</button>`}
            ${demo ? `<div class="demo-hint"><strong>Demo mode</strong> (no database connected). Use <code>${esc(CFG.DEMO_ACCOUNTS[0].email)}</code> (admin) or <code>${esc(CFG.DEMO_ACCOUNTS[2].email)}</code> (member). Password: <code>tbs-demo</code>.</div>` : ''}
            <a href="../" class="small muted">← Back to the site</a>
          </form>
        </div>
      </div>`;
    const form = root.querySelector('#loginForm');
    root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { state.login = { mode: b.dataset.mode, email: form.email.value.trim(), msg: '' }; viewLogin(); }));
    const g = root.querySelector('#google');
    if (g) g.addEventListener('click', async () => { try { await api.signInWithGoogle(); } catch (err) { const el = root.querySelector('#loginErr'); el.textContent = err.message; el.hidden = false; } });
    (root.querySelector('#name') || root.querySelector('#email')).focus();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]'); const el = root.querySelector('#loginErr'); const label = btn.textContent;
      const email = form.email.value.trim().toLowerCase();
      btn.disabled = true; el.hidden = true;
      try {
        if (!email) throw new Error('Type your email.');
        if (isReset) {
          btn.textContent = 'Sending…';
          await api.resetPassword(email);
          state.login = { mode: 'login', email, msg: 'Reset link sent. Check your email.' };
          viewLogin(); return;
        }
        const password = form.password.value;
        if (password.length < 6) throw new Error('Password needs at least 6 characters.');
        btn.textContent = isSignup ? 'Creating…' : 'Entering…';
        state.user = isSignup ? await api.signUp(email, password, form.name.value.trim()) : await api.signIn(email, password);
        state.login = null; state.cache = {};
        go(isAdmin() ? '/admin' : '/home');
      } catch (err) {
        el.textContent = err.message || 'Could not sign in.'; el.hidden = false;
        btn.disabled = false; btn.textContent = label;
      }
    });
  }

  function viewPassword() {
    root.innerHTML = `
      <div class="boot" style="gap:18px;padding:24px;text-align:center">
        <span class="wordmark">THE<b>BETTER</b>SELF</span>
        <h1 class="h1" style="font-size:2rem">Choose a <em>new password.</em></h1>
        <form class="form" id="pwForm" novalidate style="width:min(100%,380px);text-align:left">
          <div class="field"><label for="pw">New password</label><input id="pw" name="pw" type="password" autocomplete="new-password" minlength="6" required /></div>
          <p class="form-error" id="pwErr" hidden></p>
          <button class="btn btn-fill btn-block" type="submit">Save password</button>
        </form>
      </div>`;
    const f = root.querySelector('#pwForm');
    f.addEventListener('submit', async e => {
      e.preventDefault(); const el = root.querySelector('#pwErr');
      try {
        if (f.pw.value.length < 6) throw new Error('Password needs at least 6 characters.');
        await api.updatePassword(f.pw.value);
        state.user = await api.getUser(); state.cache = {};
        go(isAdmin() ? '/admin' : '/home');
      } catch (err) { el.textContent = err.message; el.hidden = false; }
    });
  }

  function viewPending() {
    root.innerHTML = `
      <div class="boot" style="gap:18px;padding:24px;text-align:center">
        <span class="wordmark">THE<b>BETTER</b>SELF</span>
        <h1 class="h1" style="font-size:2rem">Almost <em>there.</em></h1>
        <p class="muted" style="max-width:40ch">Your account (${esc(state.user.email)}) is waiting for your coach to activate it. You will be able to enter as soon as your application is accepted.</p>
        <button class="btn btn-line btn-sm" data-act="logout">Log out</button>
      </div>`;
    root.querySelector('[data-act="logout"]').addEventListener('click', async () => { await api.signOut(); state.user = null; go('/login'); });
  }

  /* ======================================================================
     VIEWS — MEMBER
     ====================================================================== */
  async function loadMember(userId) {
    const [workouts, sessions, notes] = await Promise.all([api.listWorkouts(userId), api.listSessions(userId), api.listNotes(userId)]);
    return { workouts, sessions, notes };
  }

  async function viewHome() {
    const u = state.user;
    const { workouts, sessions, notes } = await loadMember(u.id);
    const hist = exerciseHistory(sessions);
    const last = sessions[0];
    const thisWeek = sessions.filter(s => (Date.now() - new Date(s.date).getTime()) < 7 * 86400000).length;
    const coachNotes = notes.filter(n => n.kind === 'coach').slice(0, 2);
    const prs = Object.entries(hist).map(([name, arr]) => ({ name, best: Math.max(...arr.map(a => a.best)) })).filter(p => p.best > 0).sort(by('best', -1)).slice(0, 4);
    const next = workouts.length ? (last && last.workout_id ? workouts[(workouts.findIndex(w => w.id === last.workout_id) + 1) % workouts.length] : workouts[0]) : null;
    layout(`Hi, <em>${esc((u.full_name || '').split(' ')[0] || 'there')}.</em>`, `
      <div class="grid grid-4">
        <div class="card stat"><strong>${sessions.length}</strong><span>Workouts logged</span></div>
        <div class="card stat"><strong>${thisWeek}</strong><span>This week</span></div>
        <div class="card stat"><strong>${streakWeeks(sessions)}</strong><span>Week streak</span></div>
        <div class="card stat"><strong>${esc(u.program || '—')}</strong><span>Program</span></div>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Next up</h2><a href="#/workouts" class="label">All workouts →</a></div>
        ${next ? `<a href="#/workout/${esc(next.id)}" class="card link"><span class="label">${esc(next.day_label || 'Workout')}</span><strong class="h2" style="font-size:1.6rem">${esc(next.title)}</strong><span class="muted small">${next.exercises.length} exercises · ${esc(next.exercises.map(e => e.name).slice(0, 3).join(', '))}${next.exercises.length > 3 ? '…' : ''}</span><span class="btn btn-fill btn-sm" style="justify-self:start;margin-top:6px">Start workout</span></a>`
              : `<div class="empty">Your coach has not assigned workouts yet.</div>`}
      </div>
      <div class="grid grid-2" style="margin-top:36px">
        <div class="section" style="margin-top:0">
          <div class="section-title"><h2 class="h2">Personal bests</h2><a href="#/progress" class="label">Progress →</a></div>
          <div class="list">${prs.length ? prs.map(p => `<div class="row cols-2"><strong>${esc(p.name)}</strong><span class="num">${p.best} kg</span></div>`).join('') : '<div class="empty">Log your first workout to see bests.</div>'}</div>
        </div>
        <div class="section" style="margin-top:0">
          <div class="section-title"><h2 class="h2">From your coach</h2><a href="#/notes" class="label">Notes →</a></div>
          ${coachNotes.length ? coachNotes.map(n => `<div class="note coach"><div class="note-meta"><span>Coach</span><span>${esc(fmtWhen(n.created_at))}</span></div><p>${esc(n.body)}</p></div>`).join('') : '<div class="empty">No coach notes yet.</div>'}
        </div>
      </div>`);
    sideIcons();
  }

  async function viewWorkouts() {
    const u = state.user;
    const { workouts, sessions } = await loadMember(u.id);
    const lastFor = id => sessions.find(s => s.workout_id === id);
    layout('Train.', `
      <div class="grid grid-3">
        ${workouts.length ? workouts.map(w => { const l = lastFor(w.id); return `
          <a href="#/workout/${esc(w.id)}" class="card link">
            <span class="label">${esc(w.day_label || 'Workout')}</span>
            <strong class="h2">${esc(w.title)}</strong>
            <span class="muted small">${w.exercises.length} exercises</span>
            <span class="muted small">Last done: ${l ? esc(fmtDate(l.date)) : 'never'}</span>
          </a>`; }).join('') : '<div class="empty">Your coach has not assigned workouts yet.</div>'}
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">History</h2><span class="label">${sessions.length} sessions</span></div>
        <div class="list">${sessions.slice(0, 12).map(s => `<div class="row cols-3"><div><strong>${esc(s.workout_title || 'Workout')}</strong><div class="muted">${(s.sets || []).length} sets${s.notes ? ' · ' + esc(s.notes) : ''}</div></div><span class="muted num">${esc(fmtDate(s.date))}</span><button class="btn btn-line btn-sm btn-danger" data-del="${esc(s.id)}">Delete</button></div>`).join('') || '<div class="empty">Nothing logged yet.</div>'}</div>
      </div>`);
    sideIcons();
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this session?')) return; await api.deleteSession(b.dataset.del); toast('Session deleted'); render(); }));
  }

  async function viewWorkout(id) {
    const u = state.user;
    const { workouts, sessions } = await loadMember(u.id);
    const w = workouts.find(x => x.id === id);
    if (!w) { go('/workouts'); return; }
    const hist = exerciseHistory(sessions);
    const lastSets = name => { const h = hist[name]; return h && h.length ? h[h.length - 1].sets : []; };
    const bestOf = name => { const h = hist[name]; return h && h.length ? Math.max(...h.map(a => a.best)) : 0; };
    const exHTML = w.exercises.map((ex, i) => {
      const last = lastSets(ex.name);
      const rows = Array.from({ length: Math.max(ex.target_sets, 1) }, (_, n) => {
        const prev = last[n];
        return `<div class="set" data-ex="${i}" data-set="${n + 1}">
          <span class="n">${n + 1}</span>
          <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="${prev && prev.weight_kg != null ? prev.weight_kg : 'kg'}" data-kg aria-label="Weight in kg, set ${n + 1}" />
          <input type="number" inputmode="numeric" step="1" min="0" placeholder="${prev && prev.reps != null ? prev.reps : 'reps'}" data-reps aria-label="Reps, set ${n + 1}" />
          <button type="button" class="ok" data-done aria-label="Mark set done">✓</button>
        </div>`;
      }).join('');
      return `<div class="ex" data-exbox="${i}">
        <div class="ex-head"><strong class="h2" style="font-size:1.1rem">${esc(ex.name)}</strong><span class="target">${ex.target_sets} × ${esc(ex.target_reps)}</span></div>
        <div class="ex-last">${last.length ? `Last time: ${esc(last.map(s => `${s.weight_kg ?? '–'}×${s.reps ?? '–'}`).join(' · '))}` : 'First time logging this exercise'}${bestOf(ex.name) ? ` · <span class="pr">Best ${bestOf(ex.name)} kg</span>` : ''}</div>
        <div class="set-head"><span>Set</span><span>Kg</span><span>Reps</span><span></span></div>
        <div class="sets">${rows}</div>
        <button type="button" class="btn btn-line btn-sm add-set" data-add="${i}">+ Add set</button>
      </div>`;
    }).join('');
    layout(`<em>${esc(w.day_label || 'Workout')}</em> ${esc(w.title)}`, `
      ${w.coach_notes ? `<div class="note coach" style="margin-bottom:18px"><div class="note-meta"><span>Coach notes</span></div><p>${esc(w.coach_notes)}</p></div>` : ''}
      <form id="logForm" class="grid" style="gap:14px">
        <div class="field" style="max-width:220px"><label for="date">Date</label><input id="date" type="date" value="${todayISO()}" /></div>
        ${exHTML}
        <div class="field"><label for="snotes">Session notes</label><textarea id="snotes" rows="2" placeholder="How did it feel?"></textarea></div>
        <div class="sticky-save"><button class="btn btn-fill btn-block" type="submit">Save workout</button></div>
      </form>`, { right: `<a href="#/workouts" class="btn btn-line btn-sm">← Back</a>` });
    sideIcons();
    const form = root.querySelector('#logForm');
    form.addEventListener('input', e => { if (e.target.matches('input[type=number]')) e.target.classList.toggle('filled', e.target.value !== ''); });
    form.addEventListener('click', e => {
      const done = e.target.closest('[data-done]');
      if (done) { const row = done.closest('.set'); row.querySelectorAll('input').forEach(inp => { if (!inp.value && inp.placeholder && !isNaN(parseFloat(inp.placeholder))) { inp.value = inp.placeholder; inp.classList.add('filled'); } }); done.classList.toggle('is-done'); return; }
      const add = e.target.closest('[data-add]');
      if (add) {
        const box = root.querySelector(`[data-exbox="${add.dataset.add}"] .sets`); const n = box.children.length + 1;
        box.insertAdjacentHTML('beforeend', `<div class="set" data-ex="${add.dataset.add}" data-set="${n}"><span class="n">${n}</span><input type="number" inputmode="decimal" step="0.5" min="0" placeholder="kg" data-kg aria-label="Weight in kg, set ${n}" /><input type="number" inputmode="numeric" step="1" min="0" placeholder="reps" data-reps aria-label="Reps, set ${n}" /><button type="button" class="ok" data-done aria-label="Mark set done">✓</button></div>`);
      }
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const sets = [];
      form.querySelectorAll('.set').forEach(row => {
        const kg = row.querySelector('[data-kg]').value, reps = row.querySelector('[data-reps]').value;
        if (kg === '' && reps === '') return;
        const ex = w.exercises[Number(row.dataset.ex)];
        sets.push({ exercise_id: ex.id, exercise_name: ex.name, set_no: Number(row.dataset.set), weight_kg: kg === '' ? null : Number(kg), reps: reps === '' ? null : Number(reps) });
      });
      if (!sets.length) { toast('Fill in at least one set'); return; }
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Saving…';
      try {
        await api.saveSession({ user_id: u.id, workout_id: w.id, workout_title: w.title, date: form.querySelector('#date').value || todayISO(), notes: form.querySelector('#snotes').value.trim(), sets });
        const newPRs = w.exercises.filter(ex => { const b = bestOf(ex.name); const m = Math.max(0, ...sets.filter(s => s.exercise_name === ex.name).map(s => s.weight_kg || 0)); return m > b && m > 0; });
        toast(newPRs.length ? `Saved · New best: ${newPRs.map(x => x.name).join(', ')}` : 'Workout saved');
        go('/workouts');
      } catch (err) { toast('Could not save: ' + err.message); btn.disabled = false; btn.textContent = 'Save workout'; }
    });
  }

  async function viewProgress(selected) {
    const u = state.user;
    const { sessions } = await loadMember(u.id);
    const hist = exerciseHistory(sessions);
    const names = Object.keys(hist).sort();
    const name = selected && hist[selected] ? selected : names[0];
    const arr = name ? hist[name] : [];
    layout('Progress.', `
      ${names.length ? `
      <div class="field" style="max-width:320px"><label for="exsel">Exercise</label><select id="exsel">${names.map(n => `<option value="${esc(n)}" ${n === name ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
      <div class="grid grid-3" style="margin-top:18px">
        <div class="card stat"><strong>${Math.max(...arr.map(a => a.best))} kg</strong><span>Best weight</span></div>
        <div class="card stat"><strong>${arr.length}</strong><span>Sessions</span></div>
        <div class="card stat"><strong>${arr.length > 1 ? (arr[arr.length - 1].best - arr[0].best >= 0 ? '+' : '') + (arr[arr.length - 1].best - arr[0].best) + ' kg' : '—'}</strong><span>Since first log</span></div>
      </div>
      <div class="card" style="margin-top:14px"><span class="label">Best weight per session</span>${chartSVG(arr.map(a => ({ date: a.date, v: a.best })))}</div>
      <div class="section"><div class="section-title"><h2 class="h2">History</h2></div>
        <table class="table keep-all"><thead><tr><th>Date</th><th>Sets</th><th>Best</th><th>Volume</th></tr></thead><tbody>
        ${arr.slice().reverse().map(a => `<tr><td class="num">${esc(fmtDate(a.date))}</td><td>${esc(a.sets.map(s => `${s.weight_kg ?? '–'}×${s.reps ?? '–'}`).join(' · '))}</td><td class="num">${a.best} kg</td><td class="num">${Math.round(a.volume)} kg</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">Log a workout and your progress shows up here.</div>'}`);
    sideIcons();
    const sel = root.querySelector('#exsel'); if (sel) sel.addEventListener('change', () => go('/progress/' + encodeURIComponent(sel.value)));
  }

  async function viewNotes() {
    const u = state.user;
    const notes = await api.listNotes(u.id);
    layout('Notes.', `
      <form class="form" id="noteForm" style="max-width:640px">
        <div class="field"><label for="nbody">New note</label><textarea id="nbody" rows="3" placeholder="Sleep, energy, nutrition, how training felt…" required></textarea></div>
        <button class="btn btn-fill" type="submit" style="justify-self:start">Save note</button>
      </form>
      <div class="section"><div class="section-title"><h2 class="h2">All notes</h2></div>
        <div class="grid">${notes.length ? notes.map(n => `<div class="note ${n.kind === 'coach' ? 'coach' : ''}"><div class="note-meta"><span>${n.kind === 'coach' ? 'Coach' : 'You'}</span><span>${esc(fmtWhen(n.created_at))}${n.author_id === u.id ? ` · <button class="label" data-deln="${esc(n.id)}" style="color:inherit">Delete</button>` : ''}</span></div><p>${esc(n.body)}</p></div>`).join('') : '<div class="empty">No notes yet.</div>'}</div>
      </div>`);
    sideIcons();
    root.querySelector('#noteForm').addEventListener('submit', async e => { e.preventDefault(); const body = root.querySelector('#nbody').value.trim(); if (!body) return; await api.addNote({ user_id: u.id, author_id: u.id, kind: 'member', body }); toast('Note saved'); render(); });
    root.querySelectorAll('[data-deln]').forEach(b => b.addEventListener('click', async () => { await api.deleteNote(b.dataset.deln); render(); }));
  }

  /* ======================================================================
     VIEWS — ADMIN
     ====================================================================== */
  async function adminData() {
    const [profiles, logins, allSessions] = await Promise.all([api.listProfiles(), api.listLogins(200), api.listAllSessions(200)]);
    const lastLogin = {}; logins.forEach(l => { if (!lastLogin[l.user_id]) lastLogin[l.user_id] = l.at; });
    const sessCount = {}, lastSess = {}; allSessions.forEach(s => { sessCount[s.user_id] = (sessCount[s.user_id] || 0) + 1; if (!lastSess[s.user_id] || s.date > lastSess[s.user_id]) lastSess[s.user_id] = s.date; });
    return { profiles, logins, allSessions, lastLogin, sessCount, lastSess };
  }

  async function viewAdmin() {
    const d = await adminData();
    const clients = d.profiles.filter(p => p.role !== 'admin');
    const active7 = clients.filter(p => d.lastLogin[p.id] && (Date.now() - new Date(d.lastLogin[p.id]).getTime()) < 7 * 86400000).length;
    layout('Admin.', `
      <div class="grid grid-4">
        <div class="card stat"><strong>${clients.length}</strong><span>Clients</span></div>
        <div class="card stat"><strong>${active7}</strong><span>Active last 7 days</span></div>
        <div class="card stat"><strong>${d.allSessions.filter(s => (Date.now() - new Date(s.created_at || s.date).getTime()) < 7 * 86400000).length}</strong><span>Workouts this week</span></div>
        <div class="card stat"><strong>${d.logins.filter(l => (Date.now() - new Date(l.at).getTime()) < 86400000).length}</strong><span>Logins today</span></div>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Clients</h2><a href="#/admin/activity" class="label">Activity log →</a></div>
        <table class="table"><thead><tr><th>Client</th><th>Status</th><th>Last login</th><th>Workouts</th><th>Last workout</th></tr></thead><tbody>
          ${clients.length ? clients.map(p => `<tr class="link" data-go="/admin/client/${esc(p.id)}"><td><strong>${esc(p.full_name || p.email)}</strong><div class="muted small">${esc(p.email)}</div></td><td>${p.approved === false ? '<span class="badge gold"><i></i>Pending</span>' : `<span class="badge ok"><i></i>${esc(p.program || 'Active')}</span>`}</td><td>${esc(fmtWhen(d.lastLogin[p.id]))}</td><td class="num">${d.sessCount[p.id] || 0}</td><td>${d.lastSess[p.id] ? esc(fmtDate(d.lastSess[p.id])) : '—'}</td></tr>`).join('') : '<tr><td colspan="5"><div class="empty">No clients yet. When someone signs in with their email for the first time they appear here as Pending; open them and activate the account.</div></td></tr>'}
        </tbody></table>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Team</h2></div>
        <div class="list">${d.profiles.filter(p => p.role === 'admin').map(p => `<div class="row cols-2"><div><strong>${esc(p.full_name || p.email)}</strong><div class="muted">${esc(p.email)}</div></div><span class="badge gold">Admin</span></div>`).join('')}</div>
      </div>
      ${api.mode === 'demo' ? `<div class="section"><button class="btn btn-line btn-sm" id="resetDemo">Reset demo data</button></div>` : ''}`);
    sideIcons();
    root.querySelectorAll('[data-go]').forEach(tr => tr.addEventListener('click', () => go(tr.dataset.go)));
    const rd = root.querySelector('#resetDemo'); if (rd) rd.addEventListener('click', async () => { await api.resetDemo(); location.reload(); });
  }

  async function viewClient(id) {
    const d = await adminData();
    const p = d.profiles.find(x => x.id === id);
    if (!p) { go('/admin'); return; }
    const { workouts, sessions, notes } = await loadMember(id);
    const hist = exerciseHistory(sessions);
    const prs = Object.entries(hist).map(([name, arr]) => ({ name, best: Math.max(...arr.map(a => a.best)) })).filter(x => x.best > 0).sort(by('best', -1)).slice(0, 6);
    const myLogins = d.logins.filter(l => l.user_id === id).slice(0, 8);
    layout(esc(p.full_name || p.email), `
      <div class="grid grid-2">
        <form class="card form" id="profForm">
          <span class="label">Profile</span>
          <div class="field"><label for="pname">Name</label><input id="pname" value="${esc(p.full_name || '')}" /></div>
          <div class="field"><label for="pprog">Program</label><select id="pprog">${PROGRAMS.map(x => `<option ${p.program === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="muted small">${esc(p.email)} · joined ${esc(fmtDate(p.created_at))} · last login ${esc(fmtWhen(d.lastLogin[id]))}</div>
          <div class="inline-actions"><button class="btn btn-fill btn-sm" type="submit">Save profile</button><button class="btn ${p.approved === false ? 'btn-gold' : 'btn-line btn-danger'} btn-sm" type="button" id="toggleApproved">${p.approved === false ? 'Activate account' : 'Deactivate account'}</button></div>
        </form>
        <div class="grid grid-2">
          <div class="card stat"><strong>${sessions.length}</strong><span>Workouts logged</span></div>
          <div class="card stat"><strong>${streakWeeks(sessions)}</strong><span>Week streak</span></div>
          <div class="card stat"><strong>${workouts.length}</strong><span>Workouts in plan</span></div>
          <div class="card stat"><strong>${myLogins.length}</strong><span>Recent logins</span></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Training plan</h2><a href="#/admin/plan/${esc(id)}" class="btn btn-fill btn-sm">Edit plan</a></div>
        <div class="list">${workouts.length ? workouts.map(w => `<div class="row cols-2"><div><strong>${esc(w.day_label ? w.day_label + ' · ' : '')}${esc(w.title)}</strong><div class="muted">${esc(w.exercises.map(e => `${e.name} ${e.target_sets}×${e.target_reps}`).join(' · '))}</div></div></div>`).join('') : '<div class="empty">No workouts assigned yet.</div>'}</div>
      </div>
      <div class="grid grid-2" style="margin-top:36px">
        <div class="section" style="margin-top:0"><div class="section-title"><h2 class="h2">Personal bests</h2></div>
          <div class="list">${prs.length ? prs.map(x => `<div class="row cols-2"><strong>${esc(x.name)}</strong><span class="num">${x.best} kg</span></div>`).join('') : '<div class="empty">No logs yet.</div>'}</div></div>
        <div class="section" style="margin-top:0"><div class="section-title"><h2 class="h2">Logins</h2></div>
          <div class="list">${myLogins.length ? myLogins.map(l => `<div class="row cols-2"><span class="num">${esc(fmtWhen(l.at))}</span><span class="muted small">${esc((l.user_agent || '').slice(0, 40))}</span></div>`).join('') : '<div class="empty">No logins yet.</div>'}</div></div>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Recent sessions</h2></div>
        <div class="grid">${sessions.slice(0, 6).map(s => `<div class="card"><div class="section-title"><strong class="h2" style="font-size:1rem">${esc(s.workout_title || 'Workout')}</strong><span class="muted num small">${esc(fmtDate(s.date))}</span></div>
          <div class="muted small">${esc(Object.entries((s.sets || []).reduce((m, x) => { (m[x.exercise_name] = m[x.exercise_name] || []).push(`${x.weight_kg ?? '–'}×${x.reps ?? '–'}`); return m; }, {})).map(([n, arr]) => `${n}: ${arr.join(' ')}`).join(' · '))}</div>
          ${s.notes ? `<p class="small">“${esc(s.notes)}”</p>` : ''}</div>`).join('') || '<div class="empty">Nothing logged yet.</div>'}</div>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Notes</h2></div>
        <form class="form" id="coachNote" style="max-width:640px"><div class="field"><label for="cbody">Note to ${esc((p.full_name || '').split(' ')[0] || 'client')}</label><textarea id="cbody" rows="3" placeholder="Feedback, adjustments, encouragement…" required></textarea></div><button class="btn btn-gold btn-sm" type="submit" style="justify-self:start">Send note</button></form>
        <div class="grid">${notes.map(n => `<div class="note ${n.kind === 'coach' ? 'coach' : ''}"><div class="note-meta"><span>${n.kind === 'coach' ? 'Coach' : esc((p.full_name || 'Client').split(' ')[0])}</span><span>${esc(fmtWhen(n.created_at))} · <button class="label" data-deln="${esc(n.id)}" style="color:inherit">Delete</button></span></div><p>${esc(n.body)}</p></div>`).join('') || '<div class="empty">No notes yet.</div>'}</div>
      </div>`, { right: `<a href="#/admin" class="btn btn-line btn-sm">← Clients</a>` });
    sideIcons();
    root.querySelector('#profForm').addEventListener('submit', async e => { e.preventDefault(); await api.updateProfile(id, { full_name: root.querySelector('#pname').value.trim(), program: root.querySelector('#pprog').value }); toast('Profile saved'); render(); });
    root.querySelector('#toggleApproved').addEventListener('click', async () => { await api.updateProfile(id, { approved: p.approved === false }); toast(p.approved === false ? 'Account activated' : 'Account deactivated'); render(); });
    root.querySelector('#coachNote').addEventListener('submit', async e => { e.preventDefault(); const body = root.querySelector('#cbody').value.trim(); if (!body) return; await api.addNote({ user_id: id, author_id: state.user.id, kind: 'coach', body }); toast('Note sent'); render(); });
    root.querySelectorAll('[data-deln]').forEach(b => b.addEventListener('click', async () => { await api.deleteNote(b.dataset.deln); render(); }));
  }

  async function viewPlan(userId) {
    const profiles = await api.listProfiles();
    const p = profiles.find(x => x.id === userId); if (!p) { go('/admin'); return; }
    let workouts = await api.listWorkouts(userId);
    const draft = workouts.map(w => ({ ...w, exercises: w.exercises.map(e => ({ ...e })) }));
    function renderEditor() {
      const html = draft.map((w, wi) => `
        <div class="card" data-w="${wi}">
          <div class="ex-editor" style="grid-template-columns: 1fr 2fr auto">
            <div class="field"><label>Day label</label><input data-f="day_label" value="${esc(w.day_label || '')}" placeholder="Day A" /></div>
            <div class="field"><label>Workout title</label><input data-f="title" value="${esc(w.title || '')}" placeholder="Upper body" required /></div>
            <button type="button" class="btn btn-line btn-sm btn-danger" data-delw="${wi}">Remove</button>
          </div>
          <div class="field"><label>Coach notes for this workout</label><textarea data-f="coach_notes" rows="2">${esc(w.coach_notes || '')}</textarea></div>
          <span class="label">Exercises</span>
          <div class="grid" data-exlist>
            ${w.exercises.map((e, ei) => `<div class="ex-editor" data-e="${ei}">
              <div class="field"><label>Exercise</label><input data-ef="name" value="${esc(e.name)}" placeholder="Bench press" /></div>
              <div class="field"><label>Sets</label><input data-ef="target_sets" type="number" min="1" max="12" value="${esc(e.target_sets)}" /></div>
              <div class="field"><label>Reps</label><input data-ef="target_reps" value="${esc(e.target_reps)}" placeholder="8-12" /></div>
              <button type="button" class="btn btn-line btn-sm" data-dele="${ei}">✕</button>
            </div>`).join('')}
          </div>
          <button type="button" class="btn btn-line btn-sm" data-adde="${wi}" style="justify-self:start">+ Add exercise</button>
        </div>`).join('');
      root.querySelector('#planList').innerHTML = html || '<div class="empty">No workouts yet. Add the first one.</div>';
    }
    function readDraft() {
      root.querySelectorAll('[data-w]').forEach(card => {
        const w = draft[Number(card.dataset.w)];
        card.querySelectorAll('[data-f]').forEach(i => { w[i.dataset.f] = i.value; });
        card.querySelectorAll('[data-e]').forEach(row => { const e = w.exercises[Number(row.dataset.e)]; row.querySelectorAll('[data-ef]').forEach(i => { e[i.dataset.ef] = i.dataset.ef === 'target_sets' ? Number(i.value) || 3 : i.value; }); });
      });
    }
    layout(`Plan · <em>${esc((p.full_name || p.email).split(' ')[0])}</em>`, `
      <div id="planList" class="grid"></div>
      <div class="inline-actions" style="margin-top:18px">
        <button type="button" class="btn btn-line" id="addW">+ Add workout</button>
        <button type="button" class="btn btn-fill" id="saveAll">Save plan</button>
      </div>`, { right: `<a href="#/admin/client/${esc(userId)}" class="btn btn-line btn-sm">← Client</a>` });
    sideIcons();
    renderEditor();
    const list = root.querySelector('#planList');
    list.addEventListener('click', e => {
      const t = e.target;
      if (t.matches('[data-delw]')) { readDraft(); draft.splice(Number(t.dataset.delw), 1); renderEditor(); }
      else if (t.matches('[data-adde]')) { readDraft(); draft[Number(t.dataset.adde)].exercises.push({ name: '', target_sets: 3, target_reps: '8-12' }); renderEditor(); }
      else if (t.matches('[data-dele]')) { readDraft(); const wi = Number(t.closest('[data-w]').dataset.w); draft[wi].exercises.splice(Number(t.dataset.dele), 1); renderEditor(); }
    });
    root.querySelector('#addW').addEventListener('click', () => { readDraft(); draft.push({ id: uid(), user_id: userId, title: '', day_label: `Day ${String.fromCharCode(65 + draft.length)}`, coach_notes: '', sort: draft.length, created_by: state.user.id, exercises: [{ name: '', target_sets: 3, target_reps: '8-12' }] }); renderEditor(); });
    root.querySelector('#saveAll').addEventListener('click', async () => {
      readDraft();
      const btn = root.querySelector('#saveAll'); btn.disabled = true; btn.textContent = 'Saving…';
      try {
        const keep = new Set(draft.map(w => w.id));
        for (const w of workouts) if (!keep.has(w.id)) await api.deleteWorkout(w.id);
        for (let i = 0; i < draft.length; i++) {
          const w = draft[i]; w.sort = i; w.exercises = w.exercises.filter(e => e.name && e.name.trim());
          if (!w.title.trim()) w.title = w.day_label || `Workout ${i + 1}`;
          await api.saveWorkout(w);
        }
        toast('Plan saved'); go(`/admin/client/${userId}`);
      } catch (err) { toast('Could not save: ' + err.message); btn.disabled = false; btn.textContent = 'Save plan'; }
    });
  }

  async function viewActivity() {
    const d = await adminData();
    const name = id => { const p = d.profiles.find(x => x.id === id); return p ? (p.full_name || p.email) : 'Unknown'; };
    layout('Activity.', `
      <div class="grid grid-2">
        <div class="section" style="margin-top:0"><div class="section-title"><h2 class="h2">Logins</h2></div>
          <div class="list">${d.logins.slice(0, 40).map(l => `<div class="row cols-2"><div><strong>${esc(l.profile ? (l.profile.full_name || l.profile.email) : name(l.user_id))}</strong><div class="muted">${esc((l.user_agent || '').slice(0, 50))}</div></div><span class="num muted">${esc(fmtWhen(l.at))}</span></div>`).join('') || '<div class="empty">No logins yet.</div>'}</div></div>
        <div class="section" style="margin-top:0"><div class="section-title"><h2 class="h2">Workouts logged</h2></div>
          <div class="list">${d.allSessions.slice(0, 40).map(s => `<div class="row cols-2"><div><strong>${esc(s.profile ? (s.profile.full_name || s.profile.email) : name(s.user_id))}</strong><div class="muted">${esc(s.workout_title || 'Workout')} · ${(s.sets || []).length} sets</div></div><span class="num muted">${esc(fmtDate(s.date))}</span></div>`).join('') || '<div class="empty">Nothing logged yet.</div>'}</div></div>
      </div>`, { right: `<a href="#/admin" class="btn btn-line btn-sm">← Admin</a>` });
    sideIcons();
  }

  /* ======================================================================
     RENDER
     ====================================================================== */
  async function render() {
    const { path, params } = route();
    try {
      if (!state.user) { if (path !== 'login') { go('/login'); return; } viewLogin(); return; }
      if (path === 'password') { viewPassword(); return; }
      if (!isAdmin() && state.user.approved === false) { viewPending(); return; }
      if (path === 'login') { go(isAdmin() ? '/admin' : '/home'); return; }
      if (path.startsWith('admin') && !isAdmin()) { go('/home'); return; }
      switch (path) {
        case 'home': return await viewHome();
        case 'workouts': return await viewWorkouts();
        case 'workout': return await viewWorkout(params[0]);
        case 'progress': return await viewProgress(params[0] ? decodeURIComponent(params[0]) : null);
        case 'notes': return await viewNotes();
        case 'admin':
          if (params[0] === 'client') return await viewClient(params[1]);
          if (params[0] === 'plan') return await viewPlan(params[1]);
          if (params[0] === 'activity') return await viewActivity();
          return await viewAdmin();
        default: go('/home');
      }
    } catch (err) {
      console.error(err);
      root.innerHTML = `<div class="boot"><span class="wordmark">THE<b>BETTER</b>SELF</span><p class="form-error">${esc(err.message || 'Something went wrong.')}</p><a href="#/home" class="btn btn-line btn-sm">Retry</a></div>`;
    }
  }

  (async function boot() {
    if (api.mode === 'supabase' && /access_token=|code=/.test(location.href)) { await new Promise(r => setTimeout(r, 800)); }
    state.user = await api.getUser();
    if (state.user && api.mode === 'supabase' && /access_token=|code=/.test(location.href)) { try { await api.recordLogin(); } catch (e) {} history.replaceState(null, '', location.pathname + (/type=recovery/.test(location.href) ? '#/password' : '#/home')); }
    if (!location.hash) go(state.user ? (isAdmin() ? '/admin' : '/home') : '/login');
    render();
  })();
})();
