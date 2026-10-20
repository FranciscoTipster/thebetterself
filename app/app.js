/* ==========================================================================
   THEBETTERSELF — área de membros
   SPA em JavaScript puro. Dados: Supabase (produção) ou demo em localStorage
   quando config.js não tem chaves.
   ========================================================================== */
(function () {
  'use strict';

  const CFG = window.TBS_CONFIG || {};
  const root = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmtDate = d => { if (!d) return '—'; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }); };
  const fmtWhen = d => { if (!d) return 'nunca'; const x = new Date(d); const diff = (Date.now() - x.getTime()) / 1000; if (diff < 60) return 'agora mesmo'; if (diff < 3600) return `há ${Math.floor(diff / 60)} min`; if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`; if (diff < 86400 * 7) return `há ${Math.floor(diff / 86400)} d`; return fmtDate(x); };
  const by = (k, dir = 1) => (a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0);
  const PROGRAMS = ['START', 'EVOLVE', 'PRIME', 'NOT SURE'];
  const PROGRAM_LABEL = { START: 'Start', EVOLVE: 'Evolve', PRIME: 'Prime', 'NOT SURE': 'Por definir' };
  const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dayName = n => (n >= 1 && n <= 7 ? WEEKDAYS[n - 1] : '');
  const todayWeekday = () => { const d = new Date().getDay(); return d === 0 ? 7 : d; };
  const weekStart = () => { const d = new Date(); const wd = d.getDay() === 0 ? 7 : d.getDay(); d.setDate(d.getDate() - (wd - 1)); d.setHours(0, 0, 0, 0); return d; };
  const isAdminEmail = e => (CFG.ADMIN_EMAILS || []).map(x => x.toLowerCase()).includes(String(e || '').toLowerCase());
  const COACH = CFG.COACH || { name: 'Juan', photo: '../assets/img/juan-hero-800.webp' };
  const EXDB = CFG.EXDB || { json: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json', img: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/' };
  const firstName = p => ((p && (p.full_name || '')).trim().split(' ')[0]) || '';

  /* ======================================================================
     CAMADA DE DADOS — DEMO (localStorage)
     ====================================================================== */
  function demoApi() {
    const KEY = 'tbs-demo-db-v2', SKEY = 'tbs-demo-session';
    const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
    const dateAgo = n => daysAgo(n).slice(0, 10);

    function seed() {
      const accounts = CFG.DEMO_ACCOUNTS || [];
      const profiles = accounts.map((a, i) => ({ id: `u${i + 1}`, email: a.email, full_name: a.full_name, role: a.role, program: a.program, approved: true, claimed_at: daysAgo(40 - i), created_at: daysAgo(40 - i) }));
      const member = profiles.find(p => p.role === 'member') || profiles[0];
      const admin = profiles.find(p => p.role === 'admin') || profiles[0];
      const mk = (title, weekday, sort, ex) => ({ id: uid(), user_id: member.id, title, weekday, day_label: null, coach_notes: '', sort, created_by: admin.id, created_at: daysAgo(30), exercises: ex.map((e, i) => ({ id: uid(), name: e[0], target_sets: e[1], target_reps: e[2], media_id: e[3] || null, media_url: null, cues: e[4] || null, rest_sec: 90, sort: i })) });
      const workouts = [
        mk('Peito e costas', 1, 0, [['Supino com barra', 4, '6-8', 'Barbell_Bench_Press_-_Medium_Grip', 'Controla a descida, 2 segundos.'], ['Elevações', 4, '6-10', 'Pullups'], ['Press militar', 3, '8-10', 'Barbell_Shoulder_Press'], ['Remada sentado', 3, '10-12', 'Seated_Cable_Rows'], ['Face pulls', 3, '15', 'Face_Pull']]),
        mk('Pernas', 3, 1, [['Agachamento', 4, '5-8', 'Barbell_Squat'], ['Peso morto romeno', 3, '8-10', 'Romanian_Deadlift'], ['Afundos a andar', 3, '12 / perna', 'Dumbbell_Lunges'], ['Leg curl', 3, '12', 'Lying_Leg_Curls'], ['Gémeos', 4, '12-15', 'Standing_Calf_Raises']]),
        mk('Corpo inteiro', 5, 2, [['Peso morto', 3, '3-5', 'Barbell_Deadlift'], ['Supino inclinado halteres', 3, '8-10', 'Incline_Dumbbell_Press'], ['Puxada lat', 3, '10-12', 'Wide-Grip_Lat_Pulldown'], ['Prancha', 3, '45 s', 'Plank']])
      ];
      workouts[0].coach_notes = 'Controla a fase excêntrica em todos os presses. Descansa 2 a 3 minutos nas séries pesadas.';
      const sessions = [];
      const addSession = (w, daysBack, kgs) => {
        const s = { id: uid(), user_id: member.id, workout_id: w.id, workout_title: w.title, date: dateAgo(daysBack), notes: '', created_at: daysAgo(daysBack), sets: [] };
        w.exercises.forEach((ex, i) => { const base = kgs[i]; if (base == null) return; for (let n = 1; n <= ex.target_sets; n++) s.sets.push({ exercise_id: ex.id, exercise_name: ex.name, set_no: n, weight_kg: base, reps: 8 }); });
        sessions.push(s);
      };
      addSession(workouts[0], 20, [60, 0, 35, 50, 15]); addSession(workouts[1], 18, [80, 70, 16, 40, 60]);
      addSession(workouts[0], 13, [62.5, 0, 37.5, 55, 15]); addSession(workouts[1], 11, [85, 75, 18, 45, 60]);
      addSession(workouts[0], 6, [65, 0, 40, 55, 17.5]); addSession(workouts[1], 4, [90, 80, 20, 45, 65]);
      addSession(workouts[2], 1, [110, 26, 60, 0]);
      const notes = [
        { id: uid(), user_id: member.id, author_id: admin.id, kind: 'coach', body: 'Boa semana. O supino está a subir: na próxima tenta 67,5 kg nas duas primeiras séries e mantém 65 nas restantes.', created_at: daysAgo(3) },
        { id: uid(), user_id: member.id, author_id: member.id, kind: 'member', body: 'Dormi mal na terça, agachamento pesado. Alimentação em dia o resto da semana.', created_at: daysAgo(5) }
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
        if (!acc || acc.password !== password) throw new Error('Modo demo: email ou password errados.');
        const p = db.profiles.find(x => x.email.toLowerCase() === acc.email.toLowerCase());
        sessionStorage.setItem(SKEY, p.id);
        db.logins.unshift({ id: uid(), user_id: p.id, at: new Date().toISOString(), user_agent: navigator.userAgent.slice(0, 80) }); persist();
        return wait(p);
      },
      async signUp() { throw new Error('Modo demo: usa uma das contas de demonstração.'); },
      async resetPassword() { throw new Error('Modo demo: a password é tbs-demo.'); },
      async updatePassword() { return true; },
      async signOut() { sessionStorage.removeItem(SKEY); },
      async getUser() { return me(); },
      async listProfiles() { return wait(db.profiles.map(p => ({ ...p }))); },
      async createProfile(p) { if (db.profiles.some(x => x.email.toLowerCase() === p.email.toLowerCase())) throw new Error('Já existe um cliente com esse email.'); const rec = { id: uid(), role: 'member', approved: false, claimed_at: null, created_at: new Date().toISOString(), ...p }; db.profiles.push(rec); persist(); return wait(rec); },
      async updateProfile(id, patch) { Object.assign(prof(id), patch); persist(); return wait(prof(id)); },
      async deleteProfile(id) { db.profiles = db.profiles.filter(p => p.id !== id); db.workouts = db.workouts.filter(w => w.user_id !== id); persist(); return wait(true); },
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
     CAMADA DE DADOS — SUPABASE
     ====================================================================== */
  function supabaseApi(sb) {
    const profileOf = async id => { const { data, error } = await sb.from('profiles').select('*').eq('id', id).single(); if (error) throw error; return data; };
    const shapeWorkout = w => ({ ...w, exercises: (w.workout_exercises || []).slice().sort(by('sort')) });
    const shapeSession = s => ({ ...s, sets: (s.session_sets || []).slice().sort((a, b) => a.set_no - b.set_no) });
    const finish = async userId => {
      let p = null;
      for (let i = 0; i < 6 && !p; i++) { try { p = await profileOf(userId); } catch (e) { await new Promise(r => setTimeout(r, 400)); } }
      if (!p) throw new Error('O teu perfil ainda não está pronto. Tenta outra vez daqui a instantes.');
      await sb.from('logins').insert({ user_id: p.id, user_agent: navigator.userAgent.slice(0, 120) });
      return p;
    };
    return {
      mode: 'supabase',
      async signIn(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error(/invalid login/i.test(error.message) ? 'Email ou password errados.' : error.message);
        return finish(data.user.id);
      },
      async signUp(email, password, fullName) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw new Error(/already registered/i.test(error.message) ? 'Este email já tem conta. Entra em "Entrar".' : /rate limit/i.test(error.message) ? 'Limite de emails atingido. Tenta outra vez daqui a uma hora.' : error.message);
        if (!data.session) throw new Error('Conta criada. Confirma o email que te enviámos e depois entra.');
        return finish(data.user.id);
      },
      async resetPassword(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
        if (error) throw new Error(error.message);
      },
      async updatePassword(password) { const { error } = await sb.auth.updateUser({ password }); if (error) throw new Error(error.message); },
      async signInWithGoogle() { const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } }); if (error) throw new Error(error.message); },
      onAuth(fn) { sb.auth.onAuthStateChange(ev => fn(ev)); },
      async signOut() { await sb.auth.signOut(); },
      async recordLogin() { const { data } = await sb.auth.getSession(); if (data.session) await sb.from('logins').insert({ user_id: data.session.user.id, user_agent: navigator.userAgent.slice(0, 120) }); },

      async getUser() { const { data } = await sb.auth.getSession(); if (!data.session) return null; try { return await profileOf(data.session.user.id); } catch (e) { return null; } },
      async listProfiles() { const { data, error } = await sb.from('profiles').select('*').order('created_at'); if (error) throw error; return data; },
      async createProfile(p) {
        const row = { id: uid(), email: p.email.toLowerCase(), full_name: p.full_name || null, program: p.program || 'NOT SURE', role: 'member', approved: !!p.approved, claimed_at: null };
        const { data, error } = await sb.from('profiles').insert(row).select().single();
        if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'Já existe um cliente com esse email.' : error.message);
        return data;
      },
      async updateProfile(id, patch) { const { data, error } = await sb.from('profiles').update(patch).eq('id', id).select().single(); if (error) throw error; return data; },
      async deleteProfile(id) { const { error } = await sb.from('profiles').delete().eq('id', id); if (error) throw error; return true; },
      async listWorkouts(userId) { const { data, error } = await sb.from('workouts').select('*, workout_exercises(*)').eq('user_id', userId).order('sort'); if (error) throw error; return data.map(shapeWorkout); },
      async saveWorkout(w) {
        const row = { id: w.id, user_id: w.user_id, title: w.title, day_label: w.day_label || null, weekday: w.weekday || null, coach_notes: w.coach_notes || null, sort: w.sort || 0, created_by: w.created_by || null };
        const { error } = await sb.from('workouts').upsert(row); if (error) throw error;
        const { error: e2 } = await sb.from('workout_exercises').delete().eq('workout_id', w.id); if (e2) throw e2;
        const ex = w.exercises.map((e, k) => ({ workout_id: w.id, name: e.name, target_sets: Number(e.target_sets) || 3, target_reps: e.target_reps || '8-12', media_id: e.media_id || null, media_url: e.media_url || null, cues: e.cues || null, rest_sec: e.rest_sec ? Number(e.rest_sec) : null, sort: k }));
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
     ESTADO + ROUTER
     ====================================================================== */
  const forceDemo = /[?&]demo=1/.test(location.search);
  const api = (!forceDemo && CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase)
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
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2400);
  }

  /* ======================================================================
     MEDIA DOS EXERCÍCIOS (free-exercise-db: 2 fotografias por exercício,
     alternadas para parecer uma animação; ou um GIF/URL próprio)
     ====================================================================== */
  const mediaFrames = ex => {
    if (ex.media_url) return [ex.media_url];
    if (ex.media_id) { const b = EXDB.img + encodeURIComponent(ex.media_id).replace(/%2F/g, '/'); return [b + '/0.jpg', b + '/1.jpg']; }
    return [];
  };
  function mediaHTML(ex, cls = 'thumb') {
    const f = mediaFrames(ex);
    if (!f.length) return `<span class="exmedia ${cls} none" aria-hidden="true"></span>`;
    return `<img class="exmedia ${cls}${f.length > 1 ? ' anim' : ''}" src="${esc(f[0])}" ${f.length > 1 ? `data-alt="${esc(f[1])}"` : ''} alt="${esc(ex.name)}" loading="lazy" />`;
  }
  setInterval(() => { document.querySelectorAll('img.anim[data-alt]').forEach(img => { const a = img.dataset.alt; img.dataset.alt = img.getAttribute('src'); img.setAttribute('src', a); }); }, 850);
  function openLightbox(ex) {
    const f = mediaFrames(ex);
    const el = document.createElement('div'); el.className = 'lightbox';
    el.innerHTML = `<div class="lightbox-inner">
      <button class="lightbox-x" aria-label="Fechar">✕</button>
      ${f.length ? `<img class="exmedia big${f.length > 1 ? ' anim' : ''}" src="${esc(f[0])}" ${f.length > 1 ? `data-alt="${esc(f[1])}"` : ''} alt="${esc(ex.name)}" />` : ''}
      <div class="lightbox-text"><strong class="h2">${esc(ex.name)}</strong><span class="muted small">${ex.target_sets} séries × ${esc(ex.target_reps)}${ex.rest_sec ? ` · descanso ${ex.rest_sec} s` : ''}</span>${ex.cues ? `<p class="small">${esc(ex.cues)}</p>` : ''}</div>
    </div>`;
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('.lightbox-x')) el.remove(); });
    document.body.appendChild(el);
  }

  let exdb = null;
  async function loadExdb() {
    if (exdb) return exdb;
    const r = await fetch(EXDB.json); if (!r.ok) throw new Error('Não foi possível carregar a biblioteca de exercícios.');
    const all = await r.json();
    exdb = all.map(e => ({ id: e.id, name: e.name, muscles: (e.primaryMuscles || []).join(', '), equipment: e.equipment || '', category: e.category || '' }));
    return exdb;
  }
  function openPicker(onPick) {
    const el = document.createElement('div'); el.className = 'lightbox';
    el.innerHTML = `<div class="lightbox-inner picker">
      <button class="lightbox-x" aria-label="Fechar">✕</button>
      <div class="field"><label>Procurar exercício (em inglês, ex.: bench press, squat, lat pulldown)</label><input id="pickQ" autofocus placeholder="bench press" /></div>
      <div class="picker-list" id="pickList"><div class="empty">A carregar a biblioteca…</div></div>
    </div>`;
    document.body.appendChild(el);
    const close = () => el.remove();
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('.lightbox-x')) close(); });
    const list = el.querySelector('#pickList'), q = el.querySelector('#pickQ');
    const draw = () => {
      const t = q.value.trim().toLowerCase();
      const items = (exdb || []).filter(e => !t || e.name.toLowerCase().includes(t) || e.muscles.includes(t)).slice(0, 40);
      list.innerHTML = items.length ? items.map(e => `<button type="button" class="pick" data-id="${esc(e.id)}" data-name="${esc(e.name)}">${mediaHTML({ media_id: e.id, name: e.name }, 'thumb')}<span><strong>${esc(e.name)}</strong><small class="muted">${esc(e.muscles)}${e.equipment ? ' · ' + esc(e.equipment) : ''}</small></span></button>`).join('') : '<div class="empty">Sem resultados.</div>';
    };
    loadExdb().then(draw).catch(err => { list.innerHTML = `<div class="empty">${esc(err.message)}</div>`; });
    q.addEventListener('input', draw);
    list.addEventListener('click', e => { const b = e.target.closest('.pick'); if (!b) return; onPick({ id: b.dataset.id, name: b.dataset.name }); close(); });
    setTimeout(() => q.focus(), 50);
  }

  /* ======================================================================
     ESTATÍSTICAS
     ====================================================================== */
  function exerciseHistory(sessions) {
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
    const key = d => { const x = new Date(d); const onejan = new Date(x.getFullYear(), 0, 1); return x.getFullYear() * 100 + Math.ceil((((x - onejan) / 86400000) + onejan.getDay() + 1) / 7); };
    const weeks = new Set(sessions.map(s => key(s.date)));
    let n = 0; const now = new Date();
    for (let i = 0; i < 52; i++) { const d = new Date(now); d.setDate(now.getDate() - i * 7); if (weeks.has(key(d))) n++; else if (i > 0) break; }
    return n;
  }
  function chartSVG(points, unit = 'kg') {
    if (!points.length) return `<div class="empty">Ainda sem dados.</div>`;
    const W = 600, H = 160, px = 28, py = 18;
    const vals = points.map(p => p.v); const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || 1;
    const x = i => px + (points.length === 1 ? (W - 2 * px) / 2 : (i / (points.length - 1)) * (W - 2 * px));
    const y = v => H - py - ((v - min) / span) * (H - 2 * py);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const dots = points.map((p, i) => `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.5"><title>${esc(fmtDate(p.date))}: ${p.v} ${unit}</title></circle>`).join('');
    const first = points[0], last = points[points.length - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Gráfico de progresso">
      <line class="axis" x1="${px}" y1="${H - py}" x2="${W - px}" y2="${H - py}"/>
      <path class="line" d="${d}"/>${dots}
      <text class="lbl" x="${px}" y="${H - 4}">${esc(fmtDate(first.date))}</text>
      <text class="lbl" x="${W - px}" y="${H - 4}" text-anchor="end">${esc(fmtDate(last.date))}</text>
      <text class="lbl" x="${W - px}" y="12" text-anchor="end">${max} ${unit}</text>
    </svg>`;
  }


  /* ======================================================================
     PROGRESSO — componentes partilhados (admin + membro)
     ====================================================================== */
  const fmtShort = d => { const x = new Date(d); return isNaN(x) ? String(d) : `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`; };
  function adherenceWeeks(sessions, planned, n = 8) {
    const start = weekStart(); const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const a = new Date(start); a.setDate(a.getDate() - i * 7); const b = new Date(a); b.setDate(b.getDate() + 7);
      const count = sessions.filter(s => { const d = new Date(s.date + 'T12:00:00'); return d >= a && d < b; }).length;
      out.push({ label: fmtShort(a), count, planned, current: i === 0 });
    }
    return out;
  }
  function barsSVG(weeks) {
    const W = 600, H = 150, px = 10, py = 22, gap = 10;
    const max = Math.max(1, ...weeks.map(w => Math.max(w.count, w.planned || 0)));
    const bw = (W - 2 * px - gap * (weeks.length - 1)) / weeks.length;
    const y = v => H - py - (v / max) * (H - 2 * py);
    const bars = weeks.map((w, i) => {
      const x = px + i * (bw + gap); const h = H - py - y(w.count);
      const goal = w.planned ? `<line class="goal" x1="${x}" x2="${x + bw}" y1="${y(w.planned)}" y2="${y(w.planned)}"/>` : '';
      return `<g class="bar${w.current ? ' is-current' : ''}${w.planned && w.count >= w.planned ? ' is-full' : ''}"><title>Semana de ${w.label}: ${w.count}${w.planned ? ' de ' + w.planned : ''} treinos</title>
        <rect class="hit" x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}"/>
        <rect class="fill" x="${x}" y="${h > 0 ? y(w.count) : H - py - 2}" width="${bw}" height="${h > 0 ? h : 2}" rx="3"/>${goal}
        <text class="val" x="${x + bw / 2}" y="${(h > 0 ? y(w.count) : H - py) - 6}" text-anchor="middle">${w.count}</text>
        <text class="lbl" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${w.label}</text></g>`;
    }).join('');
    return `<svg class="chart bars" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Treinos por semana"><line class="axis" x1="${px}" y1="${H - py}" x2="${W - px}" y2="${H - py}"/>${bars}</svg>`;
  }
  function trendRows(hist, selected, base = '') {
    const rows = Object.entries(hist).map(([name, arr]) => ({ name, n: arr.length, first: arr[0].best, last: arr[arr.length - 1].best, lastDate: arr[arr.length - 1].date, lastSets: arr[arr.length - 1].sets }))
      .filter(r => r.last > 0 || r.first > 0).sort((a, b) => (b.lastDate > a.lastDate ? 1 : b.lastDate < a.lastDate ? -1 : 0));
    if (!rows.length) return '<div class="empty">Ainda sem registos.</div>';
    return `<div class="trend">${rows.map(r => { const d = r.last - r.first; const cls = d > 0 ? 'up' : d < 0 ? 'down' : ''; return `<a href="#${base}/${encodeURIComponent(r.name)}" class="trend-row ${r.name === selected ? 'is-on' : ''}">
      <div class="trend-name"><strong>${esc(r.name)}</strong><span class="muted small">${r.n} ${r.n === 1 ? 'sessão' : 'sessões'} · última ${esc(fmtDate(r.lastDate))}</span></div>
      <div class="trend-last num"><strong>${r.last} kg</strong><span class="muted small">${esc(r.lastSets.map(x => `${x.weight_kg ?? '–'}×${x.reps ?? '–'}`).join(' '))}</span></div>
      <span class="delta ${cls} num">${r.n > 1 ? (d > 0 ? '+' : '') + d + ' kg' : 'novo'}</span></a>`; }).join('')}</div>`;
  }
  function exerciseChart(arr) {
    if (!arr || !arr.length) return '<div class="empty">Escolhe um exercício.</div>';
    const best = Math.max(...arr.map(a => a.best)); const first = arr[0].best, last = arr[arr.length - 1].best;
    return `<div class="grid grid-3 kpis-sm">
        <div class="card stat"><strong>${last} kg</strong><span>Última carga</span></div>
        <div class="card stat"><strong>${best} kg</strong><span>Recorde</span></div>
        <div class="card stat"><strong class="${last - first > 0 ? 'ok' : ''}">${arr.length > 1 ? (last - first >= 0 ? '+' : '') + (last - first) + ' kg' : '—'}</strong><span>Desde o 1.º registo</span></div>
      </div>
      <div class="card" style="margin-top:14px"><span class="label">Melhor carga por sessão</span>${chartSVG(arr.map(a => ({ date: a.date, v: a.best })))}
        <table class="table keep-all"><thead><tr><th>Data</th><th>Séries (kg×reps)</th><th>Melhor</th><th>Volume</th></tr></thead><tbody>
        ${arr.slice().reverse().slice(0, 8).map(a => `<tr><td class="num">${esc(fmtDate(a.date))}</td><td>${esc(a.sets.map(x => `${x.weight_kg ?? '–'}×${x.reps ?? '–'}`).join(' · '))}</td><td class="num">${a.best} kg</td><td class="num">${Math.round(a.volume)} kg</td></tr>`).join('')}
        </tbody></table></div>`;
  }
  function sessionsTimeline(sessions, limit = 8, opts = {}) {
    if (!sessions.length) return '<div class="empty">Ainda não registou nenhum treino.</div>';
    return `<div class="timeline">${sessions.slice(0, limit).map(s => {
      const groups = (s.sets || []).reduce((m, x) => { (m[x.exercise_name] = m[x.exercise_name] || []).push(`${x.weight_kg ?? '–'}×${x.reps ?? '–'}`); return m; }, {});
      return `<div class="tl-item"><div class="tl-date num"><strong>${esc(fmtShort(s.date))}</strong><span class="muted small">${esc(new Date(s.date + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'short' }))}</span></div>
        <div class="tl-body"><div class="section-title"><strong class="h2" style="font-size:1rem">${esc(s.workout_title || 'Treino')}</strong><span class="muted small">${(s.sets || []).length} séries${opts.del ? ` · <button class="label" data-del="${esc(s.id)}" style="color:inherit">Apagar</button>` : ''}</span></div>
        <div class="chips">${Object.entries(groups).map(([n, arr]) => `<span class="chip"><b>${esc(n)}</b> ${esc(arr.join(' · '))}</span>`).join('')}</div>
        ${s.notes ? `<p class="small muted">“${esc(s.notes)}”</p>` : ''}</div></div>`; }).join('')}</div>`;
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
    const memberLinks = [['home', 'Início', ICON.home], ['workouts', 'Treinar', ICON.train], ['progress', 'Progresso', ICON.progress], ['notes', 'Notas', ICON.notes]];
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
            <span class="label">${isAdmin() ? 'Admin' : esc(PROGRAM_LABEL[u.program] || u.program || 'Membro')}</span>
            <strong>${esc(u.full_name || u.email)}</strong>
            <button class="btn btn-line btn-sm" data-act="logout">Sair</button>
            ${api.mode === 'demo' ? '<span class="badge gold"><i></i>Modo demo</span>' : ''}
          </div>
        </aside>
        <main class="main">
          <div class="topbar"><h1 class="h1">${title}</h1>${opts.right || ''}</div>
          ${body}
        </main>
      </div>
      <nav class="tabbar" aria-label="Secções">
        ${memberLinks.concat(adminLinks).map(([p, l, i]) => `<a href="#/${p}" class="${active(p)}">${i}<span>${l}</span></a>`).join('')}
      </nav>`;
    root.querySelector('[data-act="logout"]').addEventListener('click', async () => { await api.signOut(); state.user = null; state.cache = {}; go('/login'); });
    root.querySelectorAll('.side-nav svg, .tabbar svg').forEach(s => { s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.6'); });
  }
  const coachCard = (extra = '') => `<div class="coach-card"><img src="${esc(COACH.photo)}" alt="${esc(COACH.name)}" /><div><span class="label">O teu coach</span><strong class="h2">${esc(COACH.name)}</strong>${extra}</div></div>`;

  /* ======================================================================
     AUTENTICAÇÃO
     ====================================================================== */
  function viewLogin(err = '') {
    const demo = api.mode === 'demo';
    const st = state.login || { mode: 'login', email: '', msg: '' };
    const isSignup = st.mode === 'signup', isReset = st.mode === 'reset';
    const googleBtn = CFG.GOOGLE_LOGIN && !demo ? `<button type="button" class="btn btn-line btn-block" id="google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.8 6.1C12.2 13.6 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.3 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.4 0-11.8-4.1-13.7-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continuar com Google</button><div class="label" style="text-align:center">ou</div>` : '';
    root.innerHTML = `
      <div class="login">
        <div class="login-side">
          <video autoplay muted loop playsinline poster="../assets/img/stock/plate-1600.webp" src="../assets/video/method.mp4"></video>
          <div class="login-side-inner">
            <a href="../" class="wordmark">THE<b>BETTER</b>SELF</a>
            <div><p class="label" style="margin-bottom:14px">Membros</p><h1 class="h1">Aparece. Regista. <em>Evolui.</em></h1></div>
            <span class="label">Personalizado · 1-para-1 · Online</span>
          </div>
        </div>
        <div class="login-form">
          <form class="form" id="loginForm" novalidate>
            <div class="login-tabs" role="tablist">
              <button type="button" class="login-tab ${!isSignup && !isReset ? 'is-on' : ''}" data-mode="login">Entrar</button>
              <button type="button" class="login-tab ${isSignup ? 'is-on' : ''}" data-mode="signup">Criar conta</button>
            </div>
            ${isReset
              ? `<div><p class="label" style="margin-bottom:10px">Password</p><h2 class="h2" style="font-size:1.8rem">Recuperar password.</h2><p class="muted small" style="margin-top:10px">Enviamos-te um link por email para escolheres uma nova password.</p></div>`
              : isSignup
                ? `<div><p class="label" style="margin-bottom:10px">Zona VIP</p><h2 class="h2" style="font-size:1.8rem">Cria a tua conta.</h2><p class="muted small" style="margin-top:10px">Demora 20 segundos. O teu coach ativa o plano assim que estiver pronto.</p></div>`
                : `<div><p class="label" style="margin-bottom:10px">Zona VIP</p><h2 class="h2" style="font-size:1.8rem">Bem-vindo de volta.</h2></div>`}
            ${isReset ? '' : googleBtn}
            ${isSignup ? `<div class="field"><label for="name">Nome</label><input id="name" name="name" type="text" autocomplete="name" required /></div>` : ''}
            <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" value="${esc(st.email)}" required /></div>
            ${isReset ? '' : `<div class="field"><label for="password">Password${isSignup ? ' <span class="muted">(mín. 6 caracteres)</span>' : ''}</label><input id="password" name="password" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" minlength="6" required /></div>`}
            <p class="form-error" id="loginErr" ${err ? '' : 'hidden'}>${esc(err)}</p>
            <p class="form-ok" id="loginMsg" ${st.msg ? '' : 'hidden'}>${esc(st.msg)}</p>
            <button class="btn btn-fill btn-block" type="submit">${isReset ? 'Enviar link' : isSignup ? 'Criar a minha conta' : 'Entrar'}</button>
            ${isReset
              ? `<button type="button" class="small muted" data-mode="login" style="justify-self:start;text-decoration:underline">← Voltar a entrar</button>`
              : isSignup ? '' : `<button type="button" class="small muted" data-mode="reset" style="justify-self:start;text-decoration:underline">Esqueceste a password?</button>`}
            ${demo ? `<div class="demo-hint"><strong>Modo demo</strong> (sem base de dados). Usa <code>${esc(CFG.DEMO_ACCOUNTS[0].email)}</code> (admin) ou <code>${esc(CFG.DEMO_ACCOUNTS[2].email)}</code> (membro). Password: <code>tbs-demo</code>.</div>` : ''}
            <a href="../" class="small muted">← Voltar ao site</a>
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
        if (!email) throw new Error('Escreve o teu email.');
        if (isReset) {
          btn.textContent = 'A enviar…';
          await api.resetPassword(email);
          state.login = { mode: 'login', email, msg: 'Link enviado. Vê o teu email.' };
          viewLogin(); return;
        }
        const password = form.password.value;
        if (password.length < 6) throw new Error('A password precisa de pelo menos 6 caracteres.');
        btn.textContent = isSignup ? 'A criar…' : 'A entrar…';
        state.user = isSignup ? await api.signUp(email, password, form.name.value.trim()) : await api.signIn(email, password);
        state.login = null; state.cache = {};
        go(isAdmin() ? '/admin' : '/home');
      } catch (err) {
        el.textContent = err.message || 'Não foi possível entrar.'; el.hidden = false;
        btn.disabled = false; btn.textContent = label;
      }
    });
  }

  function viewPassword() {
    root.innerHTML = `
      <div class="boot" style="gap:18px;padding:24px;text-align:center">
        <span class="wordmark">THE<b>BETTER</b>SELF</span>
        <h1 class="h1" style="font-size:2rem">Escolhe uma <em>nova password.</em></h1>
        <form class="form" id="pwForm" novalidate style="width:min(100%,380px);text-align:left">
          <div class="field"><label for="pw">Nova password</label><input id="pw" name="pw" type="password" autocomplete="new-password" minlength="6" required /></div>
          <p class="form-error" id="pwErr" hidden></p>
          <button class="btn btn-fill btn-block" type="submit">Guardar password</button>
        </form>
      </div>`;
    const f = root.querySelector('#pwForm');
    f.addEventListener('submit', async e => {
      e.preventDefault(); const el = root.querySelector('#pwErr');
      try {
        if (f.pw.value.length < 6) throw new Error('A password precisa de pelo menos 6 caracteres.');
        await api.updatePassword(f.pw.value);
        state.user = await api.getUser(); state.cache = {};
        go(isAdmin() ? '/admin' : '/home');
      } catch (err) { el.textContent = err.message; el.hidden = false; }
    });
  }

  function viewPending() {
    root.innerHTML = `
      <div class="boot pending">
        <span class="wordmark">THE<b>BETTER</b>SELF</span>
        <h1 class="h1" style="font-size:clamp(1.8rem,5vw,2.6rem);max-width:14ch">O teu plano está a ser <em>criado para ti.</em></h1>
        <p class="muted" style="max-width:42ch">Olá${firstName(state.user) ? ', ' + esc(firstName(state.user)) : ''}. A tua conta (${esc(state.user.email)}) está criada. O ${esc(COACH.name)} está a montar o teu plano de treino e ativa-o assim que estiver pronto. Volta aqui em breve.</p>
        ${coachCard()}
        <div class="inline-actions"><a href="../#apply" class="btn btn-line btn-sm">Ainda não fizeste a candidatura?</a><button class="btn btn-line btn-sm" data-act="logout">Sair</button></div>
      </div>`;
    root.querySelector('[data-act="logout"]').addEventListener('click', async () => { await api.signOut(); state.user = null; go('/login'); });
  }

  /* ======================================================================
     MEMBRO
     ====================================================================== */
  async function loadMember(userId) {
    const [workouts, sessions, notes] = await Promise.all([api.listWorkouts(userId), api.listSessions(userId), api.listNotes(userId)]);
    workouts.sort((a, b) => (a.weekday || 9) - (b.weekday || 9) || a.sort - b.sort);
    return { workouts, sessions, notes };
  }
  const doneThisWeek = (sessions, workoutId) => { const ws = weekStart(); return sessions.some(s => s.workout_id === workoutId && new Date(s.date + 'T12:00:00') >= ws); };
  function weekStrip(workouts, sessions) {
    const t = todayWeekday();
    return `<div class="week">${WEEKDAYS_SHORT.map((d, i) => {
      const n = i + 1; const ws = workouts.filter(w => w.weekday === n);
      const done = ws.some(w => doneThisWeek(sessions, w.id));
      return `<a href="${ws.length ? '#/workout/' + esc(ws[0].id) : '#/workouts'}" class="day ${n === t ? 'is-today' : ''} ${ws.length ? 'has' : ''} ${done ? 'is-done' : ''}"><span class="label">${d}</span><strong>${ws.length ? esc(ws.map(w => w.title).join(' + ')) : 'Descanso'}</strong>${done ? '<i>✓</i>' : ''}</a>`;
    }).join('')}</div>`;
  }

  async function viewHome() {
    const u = state.user;
    const { workouts, sessions, notes } = await loadMember(u.id);
    const hist = exerciseHistory(sessions);
    const thisWeek = sessions.filter(s => new Date(s.date + 'T12:00:00') >= weekStart()).length;
    const coachNotes = notes.filter(n => n.kind === 'coach').slice(0, 2);
    const prs = Object.entries(hist).map(([name, arr]) => ({ name, best: Math.max(...arr.map(a => a.best)) })).filter(p => p.best > 0).sort(by('best', -1)).slice(0, 4);
    const t = todayWeekday();
    const today = workouts.find(w => w.weekday === t);
    const upcoming = workouts.find(w => w.weekday && w.weekday > t) || workouts.find(w => w.weekday);
    const next = today || upcoming || workouts[0] || null;
    const planned = workouts.filter(w => w.weekday).length;
    layout(`Olá, <em>${esc(firstName(u) || 'atleta')}.</em>`, `
      <div class="grid grid-4">
        <div class="card stat"><strong>${thisWeek}${planned ? `<small>/${planned}</small>` : ''}</strong><span>Treinos esta semana</span></div>
        <div class="card stat"><strong>${sessions.length}</strong><span>Treinos registados</span></div>
        <div class="card stat"><strong>${streakWeeks(sessions)}</strong><span>Semanas seguidas</span></div>
        <div class="card stat"><strong>${esc(PROGRAM_LABEL[u.program] || u.program || '—')}</strong><span>Plano</span></div>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">A tua semana</h2><a href="#/workouts" class="label">Todos os treinos →</a></div>
        ${workouts.length ? weekStrip(workouts, sessions) : ''}
        ${next ? `<a href="#/workout/${esc(next.id)}" class="card link today">
            <span class="label">${today ? 'Hoje · ' + esc(dayName(t)) : next.weekday ? 'Próximo · ' + esc(dayName(next.weekday)) : 'Treino'}${doneThisWeek(sessions, next.id) ? ' · feito ✓' : ''}</span>
            <strong class="h2" style="font-size:1.6rem">${esc(next.title)}</strong>
            <div class="thumbs">${next.exercises.slice(0, 5).map(e => mediaHTML(e, 'thumb')).join('')}</div>
            <span class="muted small">${next.exercises.length} exercícios · ${esc(next.exercises.map(e => e.name).slice(0, 3).join(', '))}${next.exercises.length > 3 ? '…' : ''}</span>
            <span class="btn btn-fill btn-sm" style="justify-self:start;margin-top:6px">${doneThisWeek(sessions, next.id) ? 'Registar outra vez' : 'Começar treino'}</span></a>`
          : `<div class="empty">O teu plano ainda não tem treinos. O ${esc(COACH.name)} está a tratar disso.</div>`}
      </div>
      <div class="grid grid-2" style="margin-top:36px">
        <div class="section" style="margin-top:0">
          <div class="section-title"><h2 class="h2">Do teu coach</h2><a href="#/notes" class="label">Notas →</a></div>
          ${coachCard()}
          ${coachNotes.length ? coachNotes.map(n => `<div class="note coach"><div class="note-meta"><span>${esc(COACH.name)}</span><span>${esc(fmtWhen(n.created_at))}</span></div><p>${esc(n.body)}</p></div>`).join('') : '<div class="empty">Ainda sem notas do coach.</div>'}
        </div>
        <div class="section" style="margin-top:0">
          <div class="section-title"><h2 class="h2">Recordes</h2><a href="#/progress" class="label">Progresso →</a></div>
          <div class="list">${prs.length ? prs.map(p => `<div class="row cols-2"><strong>${esc(p.name)}</strong><span class="num">${p.best} kg</span></div>`).join('') : '<div class="empty">Regista o primeiro treino para veres os teus recordes.</div>'}</div>
        </div>
      </div>`);
  }

  async function viewWorkouts() {
    const u = state.user;
    const { workouts, sessions } = await loadMember(u.id);
    const lastFor = id => sessions.find(s => s.workout_id === id);
    layout('Treinar.', `
      ${workouts.length ? weekStrip(workouts, sessions) : ''}
      <div class="grid grid-3" style="margin-top:14px">
        ${workouts.length ? workouts.map(w => { const l = lastFor(w.id); return `
          <a href="#/workout/${esc(w.id)}" class="card link">
            <span class="label">${esc(w.weekday ? dayName(w.weekday) : (w.day_label || 'Treino'))}${doneThisWeek(sessions, w.id) ? ' · feito ✓' : ''}</span>
            <strong class="h2">${esc(w.title)}</strong>
            <div class="thumbs">${w.exercises.slice(0, 4).map(e => mediaHTML(e, 'thumb')).join('')}</div>
            <span class="muted small">${w.exercises.length} exercícios · última vez: ${l ? esc(fmtDate(l.date)) : 'nunca'}</span>
          </a>`; }).join('') : `<div class="empty">O teu plano ainda não tem treinos. O ${esc(COACH.name)} está a tratar disso.</div>`}
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Histórico</h2><span class="label">${sessions.length} sessões</span></div>
        <div class="list">${sessions.slice(0, 12).map(s => `<div class="row cols-3"><div><strong>${esc(s.workout_title || 'Treino')}</strong><div class="muted">${(s.sets || []).length} séries${s.notes ? ' · ' + esc(s.notes) : ''}</div></div><span class="muted num">${esc(fmtDate(s.date))}</span><button class="btn btn-line btn-sm btn-danger" data-del="${esc(s.id)}">Apagar</button></div>`).join('') || '<div class="empty">Ainda não registaste nenhum treino.</div>'}</div>
      </div>`);
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Apagar esta sessão?')) return; await api.deleteSession(b.dataset.del); toast('Sessão apagada'); render(); }));
  }

  async function viewWorkout(id) {
    const u = state.user;
    const { workouts, sessions } = await loadMember(u.id);
    const w = workouts.find(x => x.id === id);
    if (!w) { go('/workouts'); return; }
    const hist = exerciseHistory(sessions);
    const lastSets = name => { const h = hist[name]; return h && h.length ? h[h.length - 1].sets : []; };
    const bestOf = name => { const h = hist[name]; return h && h.length ? Math.max(...h.map(a => a.best)) : 0; };
    const setRow = (i, n, prev) => `<div class="set" data-ex="${i}" data-set="${n}">
          <span class="n">${n}</span>
          <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="${prev && prev.weight_kg != null ? prev.weight_kg : 'kg'}" data-kg aria-label="Peso em kg, série ${n}" />
          <input type="number" inputmode="numeric" step="1" min="0" placeholder="${prev && prev.reps != null ? prev.reps : 'reps'}" data-reps aria-label="Repetições, série ${n}" />
          <button type="button" class="ok" data-done aria-label="Marcar série feita">✓</button>
        </div>`;
    const exHTML = w.exercises.map((ex, i) => {
      const last = lastSets(ex.name);
      const rows = Array.from({ length: Math.max(ex.target_sets, 1) }, (_, n) => setRow(i, n + 1, last[n])).join('');
      return `<div class="ex" data-exbox="${i}">
        <div class="ex-top">
          <button type="button" class="ex-media" data-media="${i}" aria-label="Ver exercício">${mediaHTML(ex, 'card')}</button>
          <div class="ex-info">
            <div class="ex-head"><strong class="h2" style="font-size:1.1rem">${esc(ex.name)}</strong><span class="target">${ex.target_sets} × ${esc(ex.target_reps)}</span></div>
            ${ex.cues ? `<p class="ex-cues">${esc(ex.cues)}</p>` : ''}
            <div class="ex-last">${ex.rest_sec ? `Descanso ${ex.rest_sec} s · ` : ''}${last.length ? `Última vez: ${esc(last.map(s => `${s.weight_kg ?? '–'}×${s.reps ?? '–'}`).join(' · '))}` : 'Primeira vez a registar'}${bestOf(ex.name) ? ` · <span class="pr">Recorde ${bestOf(ex.name)} kg</span>` : ''}</div>
          </div>
        </div>
        <div class="set-head"><span>Série</span><span>Kg</span><span>Reps</span><span></span></div>
        <div class="sets">${rows}</div>
        <button type="button" class="btn btn-line btn-sm add-set" data-add="${i}">+ Série</button>
      </div>`;
    }).join('');
    layout(`<em>${esc(w.weekday ? dayName(w.weekday) : (w.day_label || 'Treino'))}</em> ${esc(w.title)}`, `
      ${w.coach_notes ? `<div class="note coach" style="margin-bottom:18px"><div class="note-meta"><span>Notas do ${esc(COACH.name)}</span></div><p>${esc(w.coach_notes)}</p></div>` : ''}
      <form id="logForm" class="grid" style="gap:14px">
        <div class="field" style="max-width:220px"><label for="date">Data</label><input id="date" type="date" value="${todayISO()}" /></div>
        ${exHTML || '<div class="empty">Este treino ainda não tem exercícios.</div>'}
        <div class="field"><label for="snotes">Notas da sessão</label><textarea id="snotes" rows="2" placeholder="Como correu?"></textarea></div>
        <div class="sticky-save"><button class="btn btn-fill btn-block" type="submit">Guardar treino</button></div>
      </form>`, { right: `<a href="#/workouts" class="btn btn-line btn-sm">← Voltar</a>` });
    const form = root.querySelector('#logForm');
    form.addEventListener('input', e => { if (e.target.matches('input[type=number]')) e.target.classList.toggle('filled', e.target.value !== ''); });
    form.addEventListener('click', e => {
      const m = e.target.closest('[data-media]'); if (m) { openLightbox(w.exercises[Number(m.dataset.media)]); return; }
      const done = e.target.closest('[data-done]');
      if (done) { const row = done.closest('.set'); row.querySelectorAll('input').forEach(inp => { if (!inp.value && inp.placeholder && !isNaN(parseFloat(inp.placeholder))) { inp.value = inp.placeholder; inp.classList.add('filled'); } }); done.classList.toggle('is-done'); return; }
      const add = e.target.closest('[data-add]');
      if (add) { const box = root.querySelector(`[data-exbox="${add.dataset.add}"] .sets`); box.insertAdjacentHTML('beforeend', setRow(Number(add.dataset.add), box.children.length + 1, null)); }
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
      if (!sets.length) { toast('Preenche pelo menos uma série'); return; }
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'A guardar…';
      try {
        await api.saveSession({ user_id: u.id, workout_id: w.id, workout_title: w.title, date: form.querySelector('#date').value || todayISO(), notes: form.querySelector('#snotes').value.trim(), sets });
        const newPRs = w.exercises.filter(ex => { const b = bestOf(ex.name); const m = Math.max(0, ...sets.filter(s => s.exercise_name === ex.name).map(s => s.weight_kg || 0)); return m > b && m > 0; });
        toast(newPRs.length ? `Guardado · Novo recorde: ${newPRs.map(x => x.name).join(', ')}` : 'Treino guardado');
        go('/home');
      } catch (err) { toast('Não foi possível guardar: ' + err.message); btn.disabled = false; btn.textContent = 'Guardar treino'; }
    });
  }

  async function viewProgress(selected) {
    const u = state.user;
    const { workouts, sessions } = await loadMember(u.id);
    const hist = exerciseHistory(sessions);
    const names = Object.keys(hist);
    const name = selected && hist[selected] ? selected : (Object.entries(hist).sort((a, b) => b[1].length - a[1].length)[0] || [null])[0];
    const planned = workouts.filter(w => w.weekday).length;
    layout('Progresso.', `
      <div class="section" style="margin-top:0">
        <div class="section-title"><h2 class="h2">Adesão</h2><span class="muted small">treinos por semana, últimas 8 semanas${planned ? ' · linha = objetivo' : ''}</span></div>
        <div class="card">${barsSVG(adherenceWeeks(sessions, planned))}</div>
      </div>
      <div class="section">
        <div class="section-title" id="progress"><h2 class="h2">Por exercício</h2><span class="muted small">${names.length} exercícios</span></div>
        ${names.length ? `<div class="progress-grid"><div>${trendRows(hist, name, '/progress')}</div><div>${exerciseChart(hist[name])}</div></div>` : '<div class="empty">Regista um treino e o teu progresso aparece aqui.</div>'}
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Sessões</h2><span class="muted small">${sessions.length} no total</span></div>
        ${sessionsTimeline(sessions, 10, { del: true })}
      </div>`);
    if (selected) { const el = root.querySelector('#progress'); if (el) el.scrollIntoView({ block: 'start' }); }
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Apagar esta sessão?')) return; await api.deleteSession(b.dataset.del); toast('Sessão apagada'); render(); }));
  }

  async function viewNotes() {
    const u = state.user;
    const notes = await api.listNotes(u.id);
    layout('Notas.', `
      <form class="form" id="noteForm" style="max-width:640px">
        <div class="field"><label for="nbody">Nova nota</label><textarea id="nbody" rows="3" placeholder="Sono, energia, alimentação, como correu o treino…" required></textarea></div>
        <button class="btn btn-fill" type="submit" style="justify-self:start">Guardar nota</button>
      </form>
      <div class="section"><div class="section-title"><h2 class="h2">Todas as notas</h2></div>
        <div class="grid">${notes.length ? notes.map(n => `<div class="note ${n.kind === 'coach' ? 'coach' : ''}"><div class="note-meta"><span>${n.kind === 'coach' ? esc(COACH.name) : 'Tu'}</span><span>${esc(fmtWhen(n.created_at))}${n.author_id === u.id ? ` · <button class="label" data-deln="${esc(n.id)}" style="color:inherit">Apagar</button>` : ''}</span></div><p>${esc(n.body)}</p></div>`).join('') : '<div class="empty">Ainda sem notas.</div>'}</div>
      </div>`);
    root.querySelector('#noteForm').addEventListener('submit', async e => { e.preventDefault(); const body = root.querySelector('#nbody').value.trim(); if (!body) return; await api.addNote({ user_id: u.id, author_id: u.id, kind: 'member', body }); toast('Nota guardada'); render(); });
    root.querySelectorAll('[data-deln]').forEach(b => b.addEventListener('click', async () => { await api.deleteNote(b.dataset.deln); render(); }));
  }

  /* ======================================================================
     ADMIN
     ====================================================================== */
  const statusOf = p => !p.claimed_at ? { key: 'invited', label: 'Ainda não entrou', cls: 'badge' } : p.approved === false ? { key: 'pending', label: 'Plano em criação', cls: 'badge gold' } : { key: 'active', label: 'Ativo', cls: 'badge ok' };

  async function adminData() {
    const [profiles, logins, allSessions] = await Promise.all([api.listProfiles(), api.listLogins(200), api.listAllSessions(200)]);
    const lastLogin = {}; logins.forEach(l => { if (!lastLogin[l.user_id]) lastLogin[l.user_id] = l.at; });
    const sessCount = {}, lastSess = {}; allSessions.forEach(s => { sessCount[s.user_id] = (sessCount[s.user_id] || 0) + 1; if (!lastSess[s.user_id] || s.date > lastSess[s.user_id]) lastSess[s.user_id] = s.date; });
    return { profiles, logins, allSessions, lastLogin, sessCount, lastSess };
  }

  async function viewAdmin() {
    const d = await adminData();
    const clients = d.profiles.filter(p => p.role !== 'admin').sort((a, b) => (statusOf(a).key === 'pending' ? -1 : 0) - (statusOf(b).key === 'pending' ? -1 : 0) || (b.created_at > a.created_at ? 1 : -1));
    const pending = clients.filter(p => statusOf(p).key === 'pending').length;
    const active7 = clients.filter(p => d.lastLogin[p.id] && (Date.now() - new Date(d.lastLogin[p.id]).getTime()) < 7 * 86400000).length;
    layout('Admin.', `
      <div class="grid grid-4">
        <div class="card stat"><strong>${clients.length}</strong><span>Clientes</span></div>
        <div class="card stat"><strong>${pending}</strong><span>À espera de plano</span></div>
        <div class="card stat"><strong>${active7}</strong><span>Ativos nos últimos 7 dias</span></div>
        <div class="card stat"><strong>${d.allSessions.filter(s => (Date.now() - new Date(s.created_at || s.date).getTime()) < 7 * 86400000).length}</strong><span>Treinos esta semana</span></div>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Novo cliente</h2><span class="muted small">Cria pelo email. Quando a pessoa criar conta com esse email, já tem o plano.</span></div>
        <form class="card" id="newClient">
          <div class="ex-editor" style="grid-template-columns: 1.4fr 1.2fr 1fr auto">
            <div class="field"><label for="ncEmail">Email</label><input id="ncEmail" type="email" required placeholder="cliente@email.com" /></div>
            <div class="field"><label for="ncName">Nome</label><input id="ncName" placeholder="Nome do cliente" /></div>
            <div class="field"><label for="ncProg">Plano</label><select id="ncProg">${PROGRAMS.map(x => `<option value="${x}">${PROGRAM_LABEL[x]}</option>`).join('')}</select></div>
            <button class="btn btn-fill btn-sm" type="submit">Criar e montar plano</button>
          </div>
          <p class="form-error" id="ncErr" hidden></p>
        </form>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Clientes</h2><a href="#/admin/activity" class="label">Atividade →</a></div>
        <table class="table"><thead><tr><th>Cliente</th><th>Estado</th><th>Plano</th><th>Último login</th><th>Treinos</th></tr></thead><tbody>
          ${clients.length ? clients.map(p => { const s = statusOf(p); return `<tr class="link" data-go="/admin/client/${esc(p.id)}"><td><strong>${esc(p.full_name || p.email)}</strong><div class="muted small">${esc(p.email)}</div></td><td><span class="${s.cls}"><i></i>${s.label}</span></td><td>${esc(PROGRAM_LABEL[p.program] || p.program || '—')}</td><td>${esc(fmtWhen(d.lastLogin[p.id]))}</td><td class="num">${d.sessCount[p.id] || 0}</td></tr>`; }).join('') : '<tr><td colspan="5"><div class="empty">Ainda sem clientes. Cria um pelo email acima, ou espera que alguém crie conta no site: aparece aqui como "Plano em criação".</div></td></tr>'}
        </tbody></table>
      </div>
      <div class="section">
        <div class="section-title"><h2 class="h2">Equipa</h2></div>
        <div class="list">${d.profiles.filter(p => p.role === 'admin').map(p => `<div class="row cols-2"><div><strong>${esc(p.full_name || p.email)}</strong><div class="muted">${esc(p.email)}</div></div><span class="badge gold">Admin</span></div>`).join('')}</div>
      </div>
      ${api.mode === 'demo' ? `<div class="section"><button class="btn btn-line btn-sm" id="resetDemo">Repor dados demo</button></div>` : ''}`);
    root.querySelectorAll('[data-go]').forEach(tr => tr.addEventListener('click', () => go(tr.dataset.go)));
    const rd = root.querySelector('#resetDemo'); if (rd) rd.addEventListener('click', async () => { await api.resetDemo(); location.reload(); });
    root.querySelector('#newClient').addEventListener('submit', async e => {
      e.preventDefault(); const err = root.querySelector('#ncErr'); err.hidden = true;
      const email = root.querySelector('#ncEmail').value.trim().toLowerCase();
      if (!email) { err.textContent = 'Escreve o email.'; err.hidden = false; return; }
      try {
        const p = await api.createProfile({ email, full_name: root.querySelector('#ncName').value.trim(), program: root.querySelector('#ncProg').value, approved: false });
        toast('Cliente criado'); go(`/admin/plan/${p.id}`);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
  }

  async function viewClient(id, selectedEx) {
    const d = await adminData();
    const p = d.profiles.find(x => x.id === id);
    if (!p) { go('/admin'); return; }
    const { workouts, sessions, notes } = await loadMember(id);
    const st = statusOf(p);
    const hist = exerciseHistory(sessions);
    const names = Object.keys(hist);
    const exName = selectedEx && hist[selectedEx] ? selectedEx : (Object.entries(hist).sort((a, b) => b[1].length - a[1].length)[0] || [null])[0];
    const planned = workouts.filter(w => w.weekday).length;
    const thisWeek = sessions.filter(x => new Date(x.date + 'T12:00:00') >= weekStart()).length;
    const lastLogin = d.lastLogin[id];
    const base = `/admin/client/${id}`;
    layout(esc(p.full_name || p.email), `
      <div class="client-head card">
        <div class="client-meta">
          <span class="${st.cls}"><i></i>${st.label}</span>
          <span class="badge">${esc(PROGRAM_LABEL[p.program] || p.program || 'Plano por definir')}</span>
          <span class="muted small">${esc(p.email)}</span>
          <span class="muted small">${p.claimed_at ? 'na plataforma desde ' + esc(fmtDate(p.claimed_at)) : 'ainda não criou conta'}</span>
        </div>
        <div class="inline-actions">
          <button class="btn ${p.approved ? 'btn-line btn-danger' : 'btn-gold'} btn-sm" type="button" id="toggleApproved">${p.approved ? 'Desativar plano' : 'Ativar plano'}</button>
          <a href="#/admin/plan/${esc(id)}" class="btn btn-fill btn-sm">Editar plano</a>
          <button class="btn btn-line btn-sm" type="button" id="editToggle">Dados</button>
        </div>
        <form class="form client-edit" id="profForm" hidden>
          <div class="ex-editor" style="grid-template-columns: 2fr 1fr auto auto">
            <div class="field"><label for="pname">Nome</label><input id="pname" value="${esc(p.full_name || '')}" /></div>
            <div class="field"><label for="pprog">Plano adquirido</label><select id="pprog">${PROGRAMS.map(x => `<option value="${x}" ${p.program === x ? 'selected' : ''}>${PROGRAM_LABEL[x]}</option>`).join('')}</select></div>
            <button class="btn btn-fill btn-sm" type="submit">Guardar</button>
            <button class="btn btn-line btn-sm btn-danger" type="button" id="delClient">Remover cliente</button>
          </div>
        </form>
        ${!p.approved ? `<p class="muted small">Enquanto o plano estiver desativado, o cliente vê "O teu plano está a ser criado para ti."</p>` : ''}
      </div>

      <div class="grid grid-5 kpis">
        <div class="card stat"><strong>${thisWeek}${planned ? `<small>/${planned}</small>` : ''}</strong><span>Esta semana</span></div>
        <div class="card stat"><strong>${sessions.length}</strong><span>Treinos registados</span></div>
        <div class="card stat"><strong>${streakWeeks(sessions)}</strong><span>Semanas seguidas</span></div>
        <div class="card stat"><strong class="sm">${sessions[0] ? esc(fmtShort(sessions[0].date)) : '—'}</strong><span>Último treino</span></div>
        <div class="card stat"><strong class="sm">${esc(fmtWhen(lastLogin))}</strong><span>Último login</span></div>
      </div>

      <div class="section">
        <div class="section-title"><h2 class="h2">Esta semana</h2><span class="muted small">${planned ? `${planned} treinos planeados` : 'sem dias definidos'}</span></div>
        ${workouts.length ? weekStrip(workouts, sessions) : '<div class="empty">Ainda sem treinos no plano. <a href="#/admin/plan/' + esc(id) + '" style="text-decoration:underline">Montar plano</a>.</div>'}
      </div>

      <div class="section">
        <div class="section-title"><h2 class="h2">Adesão</h2><span class="muted small">treinos por semana, últimas 8 semanas${planned ? ' · linha = objetivo' : ''}</span></div>
        <div class="card">${barsSVG(adherenceWeeks(sessions, planned))}</div>
      </div>

      <div class="section">
        <div class="section-title" id="progress"><h2 class="h2">Progresso por exercício</h2><span class="muted small">${names.length} exercícios com registos</span></div>
        ${names.length ? `<div class="progress-grid">
          <div>${trendRows(hist, exName, base)}</div>
          <div>${exerciseChart(hist[exName])}</div>
        </div>` : '<div class="empty">Quando o cliente registar treinos, o progresso aparece aqui.</div>'}
      </div>

      <div class="section">
        <div class="section-title"><h2 class="h2">Sessões</h2><span class="muted small">${sessions.length} no total</span></div>
        ${sessionsTimeline(sessions, 10)}
      </div>

      <div class="section">
        <div class="section-title"><h2 class="h2">Plano de treino</h2><a href="#/admin/plan/${esc(id)}" class="label">Editar →</a></div>
        <div class="list">${workouts.length ? workouts.map(w => `<div class="row cols-2"><div><strong>${esc(w.weekday ? dayName(w.weekday) + ' · ' : (w.day_label ? w.day_label + ' · ' : ''))}${esc(w.title)}</strong><div class="muted">${esc(w.exercises.map(e => `${e.name} ${e.target_sets}×${e.target_reps}`).join(' · '))}</div></div><div class="thumbs">${w.exercises.slice(0, 5).map(e => mediaHTML(e, 'thumb')).join('')}</div></div>`).join('') : '<div class="empty">Ainda sem treinos.</div>'}</div>
      </div>

      <div class="section">
        <div class="section-title"><h2 class="h2">Notas</h2></div>
        <form class="form" id="coachNote" style="max-width:640px"><div class="field"><label for="cbody">Nota para ${esc(firstName(p) || 'o cliente')}</label><textarea id="cbody" rows="3" placeholder="Feedback, ajustes, motivação…" required></textarea></div><button class="btn btn-gold btn-sm" type="submit" style="justify-self:start">Enviar nota</button></form>
        <div class="grid">${notes.map(n => `<div class="note ${n.kind === 'coach' ? 'coach' : ''}"><div class="note-meta"><span>${n.kind === 'coach' ? 'Coach' : esc(firstName(p) || 'Cliente')}</span><span>${esc(fmtWhen(n.created_at))} · <button class="label" data-deln="${esc(n.id)}" style="color:inherit">Apagar</button></span></div><p>${esc(n.body)}</p></div>`).join('') || '<div class="empty">Ainda sem notas.</div>'}</div>
      </div>`, { right: `<a href="#/admin" class="btn btn-line btn-sm">← Clientes</a>` });
    if (selectedEx) { const el = root.querySelector('#progress'); if (el) el.scrollIntoView({ block: 'start' }); }
    root.querySelector('#editToggle').addEventListener('click', () => { const f = root.querySelector('#profForm'); f.hidden = !f.hidden; if (!f.hidden) f.querySelector('#pname').focus(); });
    root.querySelector('#profForm').addEventListener('submit', async e => { e.preventDefault(); await api.updateProfile(id, { full_name: root.querySelector('#pname').value.trim(), program: root.querySelector('#pprog').value }); toast('Guardado'); render(); });
    root.querySelector('#toggleApproved').addEventListener('click', async () => { await api.updateProfile(id, { approved: !p.approved }); toast(!p.approved ? 'Plano ativado' : 'Plano desativado'); render(); });
    root.querySelector('#delClient').addEventListener('click', async () => {
      if (!confirm(`Remover ${p.full_name || p.email}? O plano e os registos deste cliente são apagados.`)) return;
      try { await api.deleteProfile(id); toast('Cliente removido'); go('/admin'); } catch (err) { toast('Não foi possível remover: ' + err.message); }
    });
    root.querySelector('#coachNote').addEventListener('submit', async e => { e.preventDefault(); const body = root.querySelector('#cbody').value.trim(); if (!body) return; await api.addNote({ user_id: id, author_id: state.user.id, kind: 'coach', body }); toast('Nota enviada'); render(); });
    root.querySelectorAll('[data-deln]').forEach(b => b.addEventListener('click', async () => { await api.deleteNote(b.dataset.deln); render(); }));
  }

  async function viewPlan(userId) {
    const profiles = await api.listProfiles();
    const p = profiles.find(x => x.id === userId); if (!p) { go('/admin'); return; }
    let workouts = await api.listWorkouts(userId);
    const draft = workouts.map(w => ({ ...w, exercises: w.exercises.map(e => ({ ...e })) }));
    const blankEx = () => ({ name: '', target_sets: 3, target_reps: '8-12', rest_sec: 90, cues: '', media_id: null, media_url: '' });
    function renderEditor() {
      const html = draft.map((w, wi) => `
        <div class="card" data-w="${wi}">
          <div class="ex-editor" style="grid-template-columns: 1fr 2fr auto">
            <div class="field"><label>Dia da semana</label><select data-f="weekday"><option value="">Sem dia fixo</option>${WEEKDAYS.map((d, i) => `<option value="${i + 1}" ${Number(w.weekday) === i + 1 ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
            <div class="field"><label>Nome do treino</label><input data-f="title" value="${esc(w.title || '')}" placeholder="Peito e costas" required /></div>
            <button type="button" class="btn btn-line btn-sm btn-danger" data-delw="${wi}">Remover treino</button>
          </div>
          <div class="field"><label>Notas do coach para este treino</label><textarea data-f="coach_notes" rows="2">${esc(w.coach_notes || '')}</textarea></div>
          <span class="label">Exercícios</span>
          <div class="grid" data-exlist>
            ${w.exercises.map((e, ei) => `<div class="exrow" data-e="${ei}">
              <button type="button" class="ex-media" data-pick="${ei}" title="Escolher animação">${mediaHTML(e, 'card')}<span class="pick-hint">${mediaFrames(e).length ? 'Trocar' : 'Animação'}</span></button>
              <div class="exrow-fields">
                <div class="ex-editor">
                  <div class="field"><label>Exercício</label><input data-ef="name" value="${esc(e.name)}" placeholder="Supino com barra" /></div>
                  <div class="field"><label>Séries</label><input data-ef="target_sets" type="number" min="1" max="12" value="${esc(e.target_sets)}" /></div>
                  <div class="field"><label>Reps</label><input data-ef="target_reps" value="${esc(e.target_reps)}" placeholder="8-12" /></div>
                  <div class="field"><label>Descanso (s)</label><input data-ef="rest_sec" type="number" min="0" step="15" value="${esc(e.rest_sec ?? '')}" placeholder="90" /></div>
                </div>
                <div class="ex-editor" style="grid-template-columns: 2fr 1.4fr auto">
                  <div class="field"><label>Dicas de execução</label><input data-ef="cues" value="${esc(e.cues || '')}" placeholder="Cotovelos a 45º, controla a descida" /></div>
                  <div class="field"><label>GIF/URL próprio (opcional)</label><input data-ef="media_url" value="${esc(e.media_url || '')}" placeholder="https://…gif" /></div>
                  <button type="button" class="btn btn-line btn-sm" data-dele="${ei}">✕</button>
                </div>
              </div>
            </div>`).join('')}
          </div>
          <button type="button" class="btn btn-line btn-sm" data-adde="${wi}" style="justify-self:start">+ Exercício</button>
        </div>`).join('');
      root.querySelector('#planList').innerHTML = html || '<div class="empty">Ainda sem treinos. Adiciona o primeiro.</div>';
    }
    function readDraft() {
      root.querySelectorAll('[data-w]').forEach(card => {
        const w = draft[Number(card.dataset.w)];
        card.querySelectorAll('[data-f]').forEach(i => { w[i.dataset.f] = i.dataset.f === 'weekday' ? (i.value ? Number(i.value) : null) : i.value; });
        card.querySelectorAll('[data-e]').forEach(row => { const e = w.exercises[Number(row.dataset.e)]; row.querySelectorAll('[data-ef]').forEach(i => { e[i.dataset.ef] = i.dataset.ef === 'target_sets' ? (Number(i.value) || 3) : i.dataset.ef === 'rest_sec' ? (i.value === '' ? null : Number(i.value)) : i.value; }); });
      });
    }
    layout(`Plano · <em>${esc(firstName(p) || p.email)}</em>`, `
      <p class="muted small" style="margin:-10px 0 18px">Define o dia da semana de cada treino. Para cada exercício podes escolher uma animação da biblioteca (botão à esquerda) ou colar um GIF próprio.</p>
      <div id="planList" class="grid"></div>
      <div class="inline-actions" style="margin-top:18px">
        <button type="button" class="btn btn-line" id="addW">+ Treino</button>
        <button type="button" class="btn btn-fill" id="saveAll">Guardar plano</button>
        ${!p.approved ? `<button type="button" class="btn btn-gold" id="saveActivate">Guardar e ativar plano</button>` : ''}
      </div>`, { right: `<a href="#/admin/client/${esc(userId)}" class="btn btn-line btn-sm">← Cliente</a>` });
    renderEditor();
    const list = root.querySelector('#planList');
    list.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-delw]')) { readDraft(); draft.splice(Number(t.dataset.delw), 1); renderEditor(); }
      else if (t.matches('[data-adde]')) { readDraft(); draft[Number(t.dataset.adde)].exercises.push(blankEx()); renderEditor(); }
      else if (t.matches('[data-dele]')) { readDraft(); const wi = Number(t.closest('[data-w]').dataset.w); draft[wi].exercises.splice(Number(t.dataset.dele), 1); renderEditor(); }
      else if (t.matches('[data-pick]')) {
        readDraft(); const wi = Number(t.closest('[data-w]').dataset.w); const ex = draft[wi].exercises[Number(t.dataset.pick)];
        openPicker(pick => { ex.media_id = pick.id; ex.media_url = ''; if (!ex.name.trim()) ex.name = pick.name; renderEditor(); });
      }
    });
    root.querySelector('#addW').addEventListener('click', () => { readDraft(); const used = new Set(draft.map(w => w.weekday)); const free = [1, 2, 3, 4, 5, 6, 7].find(n => !used.has(n)) || null; draft.push({ id: uid(), user_id: userId, title: '', weekday: free, coach_notes: '', sort: draft.length, created_by: state.user.id, exercises: [blankEx()] }); renderEditor(); });
    async function save(activate) {
      readDraft();
      const btns = root.querySelectorAll('#saveAll, #saveActivate'); btns.forEach(b => { b.disabled = true; });
      try {
        const keep = new Set(draft.map(w => w.id));
        for (const w of workouts) if (!keep.has(w.id)) await api.deleteWorkout(w.id);
        for (let i = 0; i < draft.length; i++) {
          const w = draft[i]; w.sort = i; w.exercises = w.exercises.filter(e => e.name && e.name.trim());
          if (!w.title.trim()) w.title = w.weekday ? dayName(w.weekday) : `Treino ${i + 1}`;
          await api.saveWorkout(w);
        }
        if (activate) await api.updateProfile(userId, { approved: true });
        toast(activate ? 'Plano guardado e ativado' : 'Plano guardado'); go(`/admin/client/${userId}`);
      } catch (err) { toast('Não foi possível guardar: ' + err.message); btns.forEach(b => { b.disabled = false; }); }
    }
    root.querySelector('#saveAll').addEventListener('click', () => save(false));
    const sa = root.querySelector('#saveActivate'); if (sa) sa.addEventListener('click', () => save(true));
  }

  async function viewActivity() {
    const d = await adminData();
    const name = id => { const p = d.profiles.find(x => x.id === id); return p ? (p.full_name || p.email) : 'Desconhecido'; };
    layout('Atividade.', `
      <div class="grid grid-2">
        <div class="section" style="margin-top:0"><div class="section-title"><h2 class="h2">Logins</h2></div>
          <div class="list">${d.logins.slice(0, 40).map(l => `<div class="row cols-2"><div><strong>${esc(l.profile ? (l.profile.full_name || l.profile.email) : name(l.user_id))}</strong><div class="muted">${esc((l.user_agent || '').slice(0, 50))}</div></div><span class="num muted">${esc(fmtWhen(l.at))}</span></div>`).join('') || '<div class="empty">Ainda sem logins.</div>'}</div></div>
        <div class="section" style="margin-top:0"><div class="section-title"><h2 class="h2">Treinos registados</h2></div>
          <div class="list">${d.allSessions.slice(0, 40).map(s => `<div class="row cols-2"><div><strong>${esc(s.profile ? (s.profile.full_name || s.profile.email) : name(s.user_id))}</strong><div class="muted">${esc(s.workout_title || 'Treino')} · ${(s.sets || []).length} séries</div></div><span class="num muted">${esc(fmtDate(s.date))}</span></div>`).join('') || '<div class="empty">Ainda nada registado.</div>'}</div></div>
      </div>`, { right: `<a href="#/admin" class="btn btn-line btn-sm">← Admin</a>` });
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
          if (params[0] === 'client') return await viewClient(params[1], params[2] ? decodeURIComponent(params[2]) : null);
          if (params[0] === 'plan') return await viewPlan(params[1]);
          if (params[0] === 'activity') return await viewActivity();
          return await viewAdmin();
        default: go('/home');
      }
    } catch (err) {
      console.error(err);
      root.innerHTML = `<div class="boot"><span class="wordmark">THE<b>BETTER</b>SELF</span><p class="form-error">${esc(err.message || 'Algo correu mal.')}</p><a href="#/home" class="btn btn-line btn-sm">Tentar outra vez</a></div>`;
    }
  }

  let recovery = /type=recovery/.test(location.href);
  if (api.mode === 'supabase' && api.onAuth) api.onAuth(ev => { if (ev === 'PASSWORD_RECOVERY') { recovery = true; if (state.user) go('/password'); } });
  (async function boot() {
    if (api.mode === 'supabase' && /access_token=|code=/.test(location.href)) { await new Promise(r => setTimeout(r, 800)); }
    state.user = await api.getUser();
    if (state.user && api.mode === 'supabase' && /access_token=|code=/.test(location.href)) { try { await api.recordLogin(); } catch (e) {} history.replaceState(null, '', location.pathname + (recovery ? '#/password' : '#/home')); }
    if (!location.hash) go(state.user ? (isAdmin() ? '/admin' : '/home') : '/login');
    render();
  })();
})();
