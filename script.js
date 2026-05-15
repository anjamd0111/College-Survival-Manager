/* ================================================
   COLLEGE SURVIVAL MANAGER — script.js
   Complete vanilla JS application logic
   ================================================ */

'use strict';

// ── STATE ──────────────────────────────────────────
let state = {
  assignments: [],
  attendance: [],
  notes: [],
  exams: [],
  schedule: [],
  productivity: [],
  settings: {
    theme: 'dark',
    accent: '#7C3AED',
    collegeName: 'College',
    studentName: 'Student',
    pomodoroSessions: 0
  }
};

// ── LOCAL STORAGE ───────────────────────────────────
function save() {
  localStorage.setItem('csm_data', JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem('csm_data');
  if (raw) {
    try {
      const loaded = JSON.parse(raw);
      // Deep merge to preserve defaults
      state = { ...state, ...loaded, settings: { ...state.settings, ...(loaded.settings || {}) } };
    } catch (e) { /* ignore */ }
  }
}

// ── UTILITY ─────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLeft(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.ceil((d - now) / 86400000);
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) o.classList.remove('open');
  });
});

// ── NAVIGATION ──────────────────────────────────────
function navigate(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('section-' + sectionId)?.classList.add('active');
  document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

  const renderers = {
    dashboard: renderDashboard,
    assignments: renderAssignments,
    attendance: renderAttendance,
    notes: renderNotes,
    exams: renderExams,
    schedule: renderSchedule,
    productivity: renderProductivity
  };
  renderers[sectionId]?.();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigate(item.dataset.section);
    // Auto-collapse on mobile
    if (window.innerWidth <= 768) return;
  });
});

// Sidebar toggle
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

// ── CLOCK ────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('currentDateTime');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }) + ' · ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ── QUOTES ───────────────────────────────────────────
const QUOTES = [
  { q: "Success is the sum of small efforts, repeated day in and day out.", a: "Robert Collier" },
  { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
  { q: "It always seems impossible until it's done.", a: "Nelson Mandela" },
  { q: "Don't watch the clock; do what it does. Keep going.", a: "Sam Levenson" },
  { q: "You don't have to be great to start, but you have to start to be great.", a: "Zig Ziglar" },
  { q: "The expert in anything was once a beginner.", a: "Helen Hayes" },
  { q: "Education is the most powerful weapon you can use to change the world.", a: "Nelson Mandela" },
  { q: "Strive for progress, not perfection.", a: "Unknown" },
  { q: "Small daily improvements are the key to staggering long-term results.", a: "Robin Sharma" },
  { q: "The harder I work, the luckier I get.", a: "Samuel Goldwyn" },
  { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
  { q: "Learning is not attained by chance, it must be sought with ardor.", a: "Abigail Adams" }
];

function loadQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('dailyQuote').textContent = `"${q.q}"`;
  document.getElementById('quoteAuthor').textContent = `— ${q.a}`;
}

// ── DASHBOARD ────────────────────────────────────────
function renderDashboard() {
  // Stats
  const assignments = state.assignments;
  const completed = assignments.filter(a => a.completed).length;
  document.getElementById('statTotalAssignments').textContent = assignments.length;
  document.getElementById('statCompletedAssignments').textContent = `${completed} completed`;

  const now = new Date(); now.setHours(0,0,0,0);
  const upcoming = state.exams.filter(e => new Date(e.date + 'T00:00:00') >= now);
  document.getElementById('statUpcomingExams').textContent = upcoming.length;

  // Avg attendance
  let avgAtt = 0;
  if (state.attendance.length > 0) {
    const total = state.attendance.reduce((s, a) => s + (a.attended / a.total * 100), 0);
    avgAtt = Math.round(total / state.attendance.length);
  }
  document.getElementById('statAttendance').textContent = avgAtt + '%';
  document.getElementById('statAttendanceStatus').textContent =
    state.attendance.length ? (avgAtt >= 75 ? '✓ Good standing' : '⚠ Below threshold') : 'No subjects';

  // Productivity
  const today = new Date().toDateString();
  const todayProd = state.productivity.find(p => new Date(p.date).toDateString() === today);
  document.getElementById('statProductivity').textContent = todayProd ? todayProd.score : 0;
  const streak = calcStreak();
  document.getElementById('statStreak').textContent = `${streak} day streak 🔥`;

  // Assignment progress bar
  const pct = assignments.length ? Math.round(completed / assignments.length * 100) : 0;
  document.getElementById('dashAssignmentBar').style.width = pct + '%';
  document.getElementById('dashAssignmentPct').textContent = pct + '%';

  // Pending assignments mini list
  const pending = assignments.filter(a => !a.completed).slice(0, 4);
  const pendingList = document.getElementById('dashPendingList');
  pendingList.innerHTML = pending.length
    ? pending.map(a => `
        <div class="mini-item">
          <span>${a.title}</span>
          <span class="priority-badge priority-${a.priority}">${a.priority}</span>
        </div>`).join('')
    : '<p class="empty-hint">No pending assignments 🎉</p>';

  // Upcoming exams mini list
  const examList = document.getElementById('dashExamList');
  const nextExams = upcoming.slice(0, 4);
  examList.innerHTML = nextExams.length
    ? nextExams.map(e => {
        const dl = daysLeft(e.date);
        return `<div class="mini-item">
          <span>${e.subject}</span>
          <span style="color:${dl <= 3 ? 'var(--danger)' : dl <= 7 ? 'var(--warning)' : 'var(--text-muted)'}">${dl}d left</span>
        </div>`;
      }).join('')
    : '<p class="empty-hint">No upcoming exams</p>';
}

// ── ASSIGNMENTS ──────────────────────────────────────
function renderAssignments() {
  const search = document.getElementById('assignmentSearch').value.toLowerCase();
  const filter = document.getElementById('assignmentFilter').value;
  const priFilter = document.getElementById('assignmentPriorityFilter').value;

  let list = state.assignments.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search) || a.subject.toLowerCase().includes(search);
    const matchFilter = filter === 'all' || (filter === 'completed' ? a.completed : !a.completed);
    const matchPri = priFilter === 'all' || a.priority === priFilter;
    return matchSearch && matchFilter && matchPri;
  });

  // Sort: pending first, then by deadline
  list.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const container = document.getElementById('assignmentList');
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✦</div><p>No assignments found</p></div>`;
    return;
  }
  container.innerHTML = list.map(a => {
    const dl = a.deadline ? daysLeft(a.deadline) : null;
    const isOverdue = dl !== null && dl < 0 && !a.completed;
    return `
    <div class="assignment-card ${a.completed ? 'completed' : ''}">
      <div class="ac-header">
        <div>
          <div class="ac-subject">${escHtml(a.subject)}</div>
          <div class="ac-title">${escHtml(a.title)}</div>
        </div>
        <span class="priority-badge priority-${a.priority}">${a.priority}</span>
      </div>
      ${a.desc ? `<div class="ac-desc">${escHtml(a.desc)}</div>` : ''}
      <div class="ac-meta">
        ${a.deadline ? `<span class="ac-deadline ${isOverdue ? 'overdue' : ''}">
          ${isOverdue ? '⚠ Overdue · ' : ''}${fmt(a.deadline)}${!isOverdue && dl !== null ? ` (${dl}d)` : ''}
        </span>` : ''}
      </div>
      <div class="ac-actions">
        <button class="btn-check ${a.completed ? 'checked' : ''}" onclick="toggleAssignment('${a.id}')" title="Toggle complete">✓</button>
        <button class="btn-icon" onclick="editAssignment('${a.id}')" title="Edit">✏</button>
        <button class="btn-icon danger" onclick="deleteAssignment('${a.id}')" title="Delete">✕</button>
      </div>
    </div>`;
  }).join('');
}

function filterAssignments() { renderAssignments(); }

function openAssignmentModal(reset = true) {
  if (reset) {
    document.getElementById('assignmentId').value = '';
    document.getElementById('assignmentSubject').value = '';
    document.getElementById('assignmentTitle').value = '';
    document.getElementById('assignmentDesc').value = '';
    document.getElementById('assignmentDeadline').value = '';
    document.getElementById('assignmentPriority').value = 'medium';
    document.getElementById('assignmentModalTitle').textContent = 'New Assignment';
  }
  openModal('assignmentModal');
}

function saveAssignment() {
  const id = document.getElementById('assignmentId').value;
  const subject = document.getElementById('assignmentSubject').value.trim();
  const title = document.getElementById('assignmentTitle').value.trim();
  const desc = document.getElementById('assignmentDesc').value.trim();
  const deadline = document.getElementById('assignmentDeadline').value;
  const priority = document.getElementById('assignmentPriority').value;

  if (!subject || !title) { toast('Please fill Subject and Title', 'error'); return; }

  if (id) {
    const idx = state.assignments.findIndex(a => a.id === id);
    if (idx !== -1) Object.assign(state.assignments[idx], { subject, title, desc, deadline, priority });
    toast('Assignment updated', 'success');
  } else {
    state.assignments.push({ id: uid(), subject, title, desc, deadline, priority, completed: false, createdAt: new Date().toISOString() });
    toast('Assignment added', 'success');
  }
  save(); closeModal('assignmentModal'); renderAssignments(); renderDashboard();
}

function editAssignment(id) {
  const a = state.assignments.find(x => x.id === id);
  if (!a) return;
  document.getElementById('assignmentId').value = a.id;
  document.getElementById('assignmentSubject').value = a.subject;
  document.getElementById('assignmentTitle').value = a.title;
  document.getElementById('assignmentDesc').value = a.desc || '';
  document.getElementById('assignmentDeadline').value = a.deadline || '';
  document.getElementById('assignmentPriority').value = a.priority;
  document.getElementById('assignmentModalTitle').textContent = 'Edit Assignment';
  openModal('assignmentModal');
}

function deleteAssignment(id) {
  state.assignments = state.assignments.filter(a => a.id !== id);
  save(); renderAssignments(); renderDashboard();
  toast('Assignment deleted', 'info');
}

function toggleAssignment(id) {
  const a = state.assignments.find(x => x.id === id);
  if (a) { a.completed = !a.completed; save(); renderAssignments(); renderDashboard(); }
}

// ── ATTENDANCE ────────────────────────────────────────
function renderAttendance() {
  const container = document.getElementById('attendanceList');
  if (!state.attendance.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">◎</div><p>No subjects added yet</p></div>`;
    return;
  }
  container.innerHTML = state.attendance.map(a => {
    const pct = Math.round(a.attended / a.total * 100);
    const cls = pct >= 75 ? 'ok' : pct >= 60 ? 'warn' : 'bad';
    const barCls = pct >= 75 ? 'success' : pct >= 60 ? 'warning' : 'danger';
    return `
    <div class="att-card">
      <div class="att-subject">${escHtml(a.subject)}</div>
      <div class="att-pct ${cls}">${pct}%</div>
      <div class="att-detail">${a.attended} of ${a.total} classes attended</div>
      ${pct < 75 ? `<div class="att-warning">⚠ Below 75% — You need ${calcNeeded(a)} more classes</div>` : ''}
      <div class="progress-wrap" style="margin-bottom:.75rem">
        <div class="progress-bar-outer" style="flex:1">
          <div class="progress-bar-inner ${barCls}" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="att-actions">
        <button class="btn btn-sm btn-ghost" onclick="quickAtt('${a.id}', 1, 1)">+ Attended</button>
        <button class="btn btn-sm btn-ghost" onclick="quickAtt('${a.id}', 0, 1)">+ Missed</button>
        <button class="btn-icon" onclick="editAttendance('${a.id}')" title="Edit">✏</button>
        <button class="btn-icon danger" onclick="deleteAttendance('${a.id}')" title="Delete">✕</button>
      </div>
    </div>`;
  }).join('');
}

function calcNeeded(a) {
  // n = classes needed so (attended + n) / (total + n) >= 0.75
  let n = 0;
  while ((a.attended + n) / (a.total + n) < 0.75 && n < 1000) n++;
  return n;
}

function quickAtt(id, addAtt, addTotal) {
  const a = state.attendance.find(x => x.id === id);
  if (!a) return;
  a.attended += addAtt;
  a.total += addTotal;
  if (a.attended > a.total) a.attended = a.total;
  save(); renderAttendance(); renderDashboard();
}

function saveAttendance() {
  const id = document.getElementById('attendanceId').value;
  const subject = document.getElementById('attendanceSubject').value.trim();
  const attended = parseInt(document.getElementById('attendanceAttended').value) || 0;
  const total = parseInt(document.getElementById('attendanceTotal').value) || 1;

  if (!subject) { toast('Please enter subject name', 'error'); return; }
  if (attended > total) { toast('Attended cannot exceed total', 'error'); return; }

  if (id) {
    const idx = state.attendance.findIndex(a => a.id === id);
    if (idx !== -1) Object.assign(state.attendance[idx], { subject, attended, total });
    toast('Subject updated', 'success');
  } else {
    state.attendance.push({ id: uid(), subject, attended, total });
    toast('Subject added', 'success');
  }
  save(); closeModal('attendanceModal'); renderAttendance(); renderDashboard();
}

function editAttendance(id) {
  const a = state.attendance.find(x => x.id === id);
  if (!a) return;
  document.getElementById('attendanceId').value = a.id;
  document.getElementById('attendanceSubject').value = a.subject;
  document.getElementById('attendanceAttended').value = a.attended;
  document.getElementById('attendanceTotal').value = a.total;
  document.getElementById('attendanceModalTitle').textContent = 'Edit Subject';
  openModal('attendanceModal');
}

function deleteAttendance(id) {
  state.attendance = state.attendance.filter(a => a.id !== id);
  save(); renderAttendance(); renderDashboard();
  toast('Subject removed', 'info');
}

// Reset modal on open
document.getElementById('attendanceModal').querySelector('.btn-accent').addEventListener('click', () => {});
function openAttendanceModal() {
  document.getElementById('attendanceId').value = '';
  document.getElementById('attendanceSubject').value = '';
  document.getElementById('attendanceAttended').value = 0;
  document.getElementById('attendanceTotal').value = 1;
  document.getElementById('attendanceModalTitle').textContent = 'Add Subject';
  openModal('attendanceModal');
}

// ── NOTES ────────────────────────────────────────────
function renderNotes() {
  const search = document.getElementById('noteSearch').value.toLowerCase();
  const cat = document.getElementById('noteCategoryFilter').value;

  let list = state.notes.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search);
    const matchCat = cat === 'all' || n.category === cat;
    return matchSearch && matchCat;
  });
  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const container = document.getElementById('notesList');
  if (!list.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">❋</div><p>No notes found</p></div>`;
    return;
  }
  container.innerHTML = list.map(n => `
    <div class="note-card" onclick="editNote('${n.id}')">
      <span class="note-cat-badge">${n.category}</span>
      <div class="note-title">${escHtml(n.title)}</div>
      <div class="note-preview">${escHtml(n.content)}</div>
      <div class="note-footer">
        <span class="note-date">${new Date(n.updatedAt).toLocaleDateString('en-IN', { day:'numeric',month:'short' })}</span>
        <button class="btn-icon danger" onclick="event.stopPropagation();deleteNote('${n.id}')" title="Delete">✕</button>
      </div>
    </div>`).join('');
}

function filterNotes() { renderNotes(); }

function updateCharCount() {
  const len = document.getElementById('noteContent').value.length;
  document.getElementById('charCount').textContent = len;
}

function saveNote() {
  const id = document.getElementById('noteId').value;
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  const category = document.getElementById('noteCategory').value;

  if (!title) { toast('Please enter a title', 'error'); return; }

  const now = new Date().toISOString();
  if (id) {
    const idx = state.notes.findIndex(n => n.id === id);
    if (idx !== -1) Object.assign(state.notes[idx], { title, content, category, updatedAt: now });
    toast('Note updated', 'success');
  } else {
    state.notes.push({ id: uid(), title, content, category, createdAt: now, updatedAt: now });
    toast('Note saved', 'success');
  }
  save(); closeModal('noteModal'); renderNotes();
}

function editNote(id) {
  const n = state.notes.find(x => x.id === id);
  if (!n) return;
  document.getElementById('noteId').value = n.id;
  document.getElementById('noteTitle').value = n.title;
  document.getElementById('noteContent').value = n.content;
  document.getElementById('noteCategory').value = n.category;
  document.getElementById('charCount').textContent = n.content.length;
  document.getElementById('noteModalTitle').textContent = 'Edit Note';
  openModal('noteModal');
}

function deleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  save(); renderNotes();
  toast('Note deleted', 'info');
}

function openNoteModal() {
  document.getElementById('noteId').value = '';
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').value = '';
  document.getElementById('noteCategory').value = 'lecture';
  document.getElementById('charCount').textContent = 0;
  document.getElementById('noteModalTitle').textContent = 'New Note';
  openModal('noteModal');
}

// ── EXAMS ─────────────────────────────────────────────
function renderExams() {
  const container = document.getElementById('examList');
  const now = new Date();

  if (!state.exams.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">◷</div><p>No exams scheduled</p></div>`;
    return;
  }

  const sorted = [...state.exams].sort((a, b) => new Date(a.date) - new Date(b.date));
  container.innerHTML = sorted.map(e => {
    const examDt = new Date(e.date + 'T' + (e.time || '10:00') + ':00');
    const diff = examDt - now;
    const isPast = diff <= 0;

    let countdownHtml = '';
    if (!isPast) {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      countdownHtml = `
        <div class="exam-countdown">
          ${[['d', days], ['h', hours], ['m', mins], ['s', secs]].map(([l, v]) => `
            <div class="countdown-unit">
              <span class="countdown-val" id="ec_${e.id}_${l}">${String(v).padStart(2,'0')}</span>
              <div class="countdown-lbl">${l}</div>
            </div>`).join('')}
        </div>`;
    }

    return `
    <div class="exam-card">
      <div class="exam-subject">${escHtml(e.subject)}</div>
      <div class="exam-date-label">${fmt(e.date)} · ${e.time || '10:00'}</div>
      ${isPast
        ? `<div class="exam-past">This exam has passed ✓</div>`
        : countdownHtml}
      ${e.venue ? `<div class="exam-venue">📍 ${escHtml(e.venue)}</div>` : ''}
      <button class="btn btn-sm btn-ghost" style="margin-top:.5rem" onclick="deleteExam('${e.id}')">✕ Remove</button>
    </div>`;
  }).join('');
}

// Live countdown update
setInterval(() => {
  state.exams.forEach(e => {
    const examDt = new Date(e.date + 'T' + (e.time || '10:00') + ':00');
    const diff = examDt - new Date();
    if (diff <= 0) return;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    [['d', days], ['h', hours], ['m', mins], ['s', secs]].forEach(([l, v]) => {
      const el = document.getElementById(`ec_${e.id}_${l}`);
      if (el) el.textContent = String(v).padStart(2, '0');
    });
  });
}, 1000);

function saveExam() {
  const subject = document.getElementById('examSubject').value.trim();
  const date = document.getElementById('examDate').value;
  const time = document.getElementById('examTime').value;
  const venue = document.getElementById('examVenue').value.trim();

  if (!subject || !date) { toast('Subject and date are required', 'error'); return; }

  state.exams.push({ id: uid(), subject, date, time, venue });
  save(); closeModal('examModal'); renderExams(); renderDashboard();
  toast('Exam added', 'success');
  // Clear
  document.getElementById('examSubject').value = '';
  document.getElementById('examDate').value = '';
  document.getElementById('examVenue').value = '';
}

function deleteExam(id) {
  state.exams = state.exams.filter(e => e.id !== id);
  save(); renderExams(); renderDashboard();
  toast('Exam removed', 'info');
}

// ── SCHEDULE ──────────────────────────────────────────
function renderSchedule() {
  const container = document.getElementById('scheduleList');
  if (!state.schedule.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">▦</div><p>No tasks in your schedule</p></div>`;
    return;
  }
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const sorted = [...state.schedule].sort((a, b) => {
    const di = days.indexOf(a.day) - days.indexOf(b.day);
    if (di !== 0) return di;
    return a.start.localeCompare(b.start);
  });

  let lastDay = '';
  container.innerHTML = sorted.map(t => {
    const dayHeader = t.day !== lastDay
      ? `<div style="font-family:var(--font-display);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin:1.25rem 0 .5rem;padding-left:.5rem">${t.day}</div>`
      : '';
    lastDay = t.day;
    return `${dayHeader}
    <div class="schedule-item ${t.completed ? 'completed-sched' : ''}">
      <span class="schedule-time">${t.start} – ${t.end}</span>
      <span class="sched-task">${escHtml(t.task)}</span>
      <span class="sched-day">${t.day.slice(0,3)}</span>
      <div class="sched-actions">
        <button class="btn-check ${t.completed ? 'checked' : ''}" onclick="toggleSchedule('${t.id}')">✓</button>
        <button class="btn-icon" onclick="editSchedule('${t.id}')">✏</button>
        <button class="btn-icon danger" onclick="deleteSchedule('${t.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function saveSchedule() {
  const id = document.getElementById('scheduleId').value;
  const task = document.getElementById('scheduleTask').value.trim();
  const start = document.getElementById('scheduleStart').value;
  const end = document.getElementById('scheduleEnd').value;
  const day = document.getElementById('scheduleDay').value;

  if (!task || !start || !end) { toast('All fields required', 'error'); return; }

  if (id) {
    const idx = state.schedule.findIndex(s => s.id === id);
    if (idx !== -1) Object.assign(state.schedule[idx], { task, start, end, day });
    toast('Task updated', 'success');
  } else {
    state.schedule.push({ id: uid(), task, start, end, day, completed: false });
    toast('Task added', 'success');
  }
  save(); closeModal('scheduleModal'); renderSchedule();
}

function editSchedule(id) {
  const s = state.schedule.find(x => x.id === id);
  if (!s) return;
  document.getElementById('scheduleId').value = s.id;
  document.getElementById('scheduleTask').value = s.task;
  document.getElementById('scheduleStart').value = s.start;
  document.getElementById('scheduleEnd').value = s.end;
  document.getElementById('scheduleDay').value = s.day;
  document.getElementById('scheduleModalTitle').textContent = 'Edit Task';
  openModal('scheduleModal');
}

function deleteSchedule(id) {
  state.schedule = state.schedule.filter(s => s.id !== id);
  save(); renderSchedule(); toast('Task removed', 'info');
}

function toggleSchedule(id) {
  const s = state.schedule.find(x => x.id === id);
  if (s) { s.completed = !s.completed; save(); renderSchedule(); }
}

function openScheduleModal() {
  document.getElementById('scheduleId').value = '';
  document.getElementById('scheduleTask').value = '';
  document.getElementById('scheduleStart').value = '';
  document.getElementById('scheduleEnd').value = '';
  document.getElementById('scheduleModalTitle').textContent = 'Add Schedule Task';
  openModal('scheduleModal');
}

// ── PRODUCTIVITY ──────────────────────────────────────
function calcStreak() {
  if (!state.productivity.length) return 0;
  const sorted = [...state.productivity].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0,0,0,0);

  for (const p of sorted) {
    const pDate = new Date(p.date);
    pDate.setHours(0,0,0,0);
    const diff = (checkDate - pDate) / 86400000;
    if (diff <= 1) { streak++; checkDate = pDate; }
    else break;
  }
  return streak;
}

function renderProductivity() {
  const today = new Date().toDateString();
  const todayProd = state.productivity.find(p => new Date(p.date).toDateString() === today);

  document.getElementById('prodScore').textContent = todayProd ? todayProd.score : 0;
  document.getElementById('prodTasks').textContent = todayProd ? todayProd.tasks : 0;
  document.getElementById('prodHours').textContent = todayProd ? todayProd.hours + 'h' : '0h';
  document.getElementById('prodStreak').textContent = calcStreak();

  // Circular
  const score = todayProd ? todayProd.score : 0;
  const offset = 314 - (314 * score / 100);
  document.getElementById('circularFg').style.strokeDashoffset = offset;
  document.getElementById('circularLabel').textContent = score + '%';

  // Weekly bars
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const now = new Date();
  const weekData = days.map((d, i) => {
    const target = new Date(now);
    const day = now.getDay() || 7;
    target.setDate(now.getDate() - day + 1 + i);
    const match = state.productivity.find(p => new Date(p.date).toDateString() === target.toDateString());
    return { label: d, score: match ? match.score : 0 };
  });
  document.getElementById('weekBars').innerHTML = weekData.map(w => `
    <div class="week-bar-wrap">
      <div class="week-bar" style="height:${w.score}%"></div>
      <div class="week-day-lbl">${w.label}</div>
    </div>`).join('');

  // History
  const hist = [...state.productivity].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  document.getElementById('prodHistory').innerHTML = hist.length
    ? hist.map(p => `
        <div class="prod-history-item">
          <span>${new Date(p.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}</span>
          <span>${p.tasks} tasks · ${p.hours}h study</span>
          <span style="color:var(--accent);font-weight:700">${p.score}/100</span>
          <button class="btn-icon danger" onclick="deleteProd('${p.id}')">✕</button>
        </div>`).join('')
    : '<p class="empty-hint">No entries yet</p>';
}

function saveProductivity() {
  const tasks = parseInt(document.getElementById('prodTasksInput').value) || 0;
  const hours = parseFloat(document.getElementById('prodHoursInput').value) || 0;
  const score = parseInt(document.getElementById('prodScoreInput').value) || 50;

  const today = new Date();
  today.setHours(0,0,0,0);
  const existing = state.productivity.findIndex(p => new Date(p.date).toDateString() === today.toDateString());

  const entry = { id: uid(), date: today.toISOString(), tasks, hours, score };
  if (existing !== -1) state.productivity[existing] = entry;
  else state.productivity.push(entry);

  save(); closeModal('productivityModal'); renderProductivity(); renderDashboard();
  toast('Productivity logged!', 'success');
}

function deleteProd(id) {
  state.productivity = state.productivity.filter(p => p.id !== id);
  save(); renderProductivity();
}

// ── SETTINGS ─────────────────────────────────────────
function applySettings() {
  // Theme
  document.documentElement.setAttribute('data-theme', state.settings.theme);
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = state.settings.theme === 'dark';

  // Accent color
  document.documentElement.style.setProperty('--accent', state.settings.accent);
  const r = hexToRgb(state.settings.accent);
  if (r) {
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r.r},${r.g},${r.b},0.35)`);
    document.documentElement.style.setProperty('--accent-soft', `rgba(${r.r},${r.g},${r.b},0.15)`);
  }
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === state.settings.accent);
  });

  // Profile
  document.getElementById('collegeNameDisplay').textContent = state.settings.collegeName || 'College';
  const cni = document.getElementById('collegeNameInput');
  const sni = document.getElementById('studentNameInput');
  if (cni) cni.value = state.settings.collegeName || '';
  if (sni) sni.value = state.settings.studentName || '';
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
}

function toggleDarkMode() {
  const isDark = document.getElementById('darkModeToggle').checked;
  state.settings.theme = isDark ? 'dark' : 'light';
  save(); applySettings();
}

function setAccent(color, el) {
  state.settings.accent = color;
  save(); applySettings();
}

function saveCollegeName() {
  state.settings.collegeName = document.getElementById('collegeNameInput').value;
  document.getElementById('collegeNameDisplay').textContent = state.settings.collegeName || 'College';
  save();
}

function saveStudentName() {
  state.settings.studentName = document.getElementById('studentNameInput').value;
  save();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `college_survival_data_${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast('Data exported!', 'success');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      state = { ...state, ...imported, settings: { ...state.settings, ...(imported.settings || {}) } };
      save(); applySettings(); renderDashboard();
      toast('Data imported successfully!', 'success');
    } catch { toast('Invalid JSON file', 'error'); }
  };
  reader.readAsText(file);
}

function confirmReset() {
  if (confirm('Are you sure? This will permanently delete ALL your data.')) {
    localStorage.removeItem('csm_data');
    location.reload();
  }
}

// ── POMODORO ──────────────────────────────────────────
let pomodoroInterval = null;
let pomodoroSeconds = 25 * 60;
let pomodoroRunning = false;
let pomodoroPhase = 'focus'; // 'focus' | 'break'
const POMODORO_PHASES = {
  focus: { duration: 25 * 60, label: 'Focus Session' },
  break: { duration: 5 * 60, label: 'Short Break' }
};

function formatPomodoroTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function updatePomodoroDisplay() {
  document.getElementById('pomodoroTime').textContent = formatPomodoroTime(pomodoroSeconds);
}

function pomodoroStart() {
  if (pomodoroRunning) return;
  pomodoroRunning = true;
  pomodoroInterval = setInterval(() => {
    pomodoroSeconds--;
    updatePomodoroDisplay();
    if (pomodoroSeconds <= 0) {
      clearInterval(pomodoroInterval);
      pomodoroRunning = false;
      if (pomodoroPhase === 'focus') {
        state.settings.pomodoroSessions = (state.settings.pomodoroSessions || 0) + 1;
        save();
        document.getElementById('pomodoroSessions').textContent = state.settings.pomodoroSessions;
        toast('Pomodoro done! Take a break 🎉', 'success');
        pomodoroPhase = 'break';
      } else {
        toast('Break over! Back to focus 💪', 'info');
        pomodoroPhase = 'focus';
      }
      pomodoroSeconds = POMODORO_PHASES[pomodoroPhase].duration;
      document.getElementById('pomodoroLabel').textContent = POMODORO_PHASES[pomodoroPhase].label;
      updatePomodoroDisplay();
    }
  }, 1000);
}

function pomodoroPause() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
}

function pomodoroReset() {
  pomodoroPause();
  pomodoroPhase = 'focus';
  pomodoroSeconds = 25 * 60;
  document.getElementById('pomodoroLabel').textContent = 'Focus Session';
  updatePomodoroDisplay();
}

// ── SECURITY: escape HTML ─────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── MODAL BUTTON OVERRIDES ────────────────────────────
// Wire up modal open buttons that need extra reset logic
document.querySelector('[data-section="assignments"]')?.addEventListener('click', () => {});
// Already wired via onclick in HTML, but fix attendance/note/schedule opens:
// These functions are called from inline onclick in HTML:
// openModal('attendanceModal') — we intercept by resetting in saveAttendance / openAttendanceModal
// openModal('noteModal') — openNoteModal
// openModal('scheduleModal') — openScheduleModal

// Patch button opens to use reset functions
document.querySelectorAll('.btn-accent[onclick]').forEach(b => {
  const oc = b.getAttribute('onclick');
  if (oc === "openModal('attendanceModal')") b.setAttribute('onclick', "openAttendanceModal()");
  if (oc === "openModal('noteModal')") b.setAttribute('onclick', "openNoteModal()");
  if (oc === "openModal('scheduleModal')") b.setAttribute('onclick', "openScheduleModal()");
  if (oc === "openModal('assignmentModal')") b.setAttribute('onclick', "openAssignmentModal()");
});

// ── KEYBOARD SHORTCUTS ────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
  // Ctrl+D = Dashboard
  if (e.ctrlKey && e.key === 'd') { e.preventDefault(); navigate('dashboard'); }
});

// ── INIT ──────────────────────────────────────────────
function init() {
  load();
  applySettings();
  loadQuote();
  renderDashboard();
  document.getElementById('pomodoroSessions').textContent = state.settings.pomodoroSessions || 0;
  updatePomodoroDisplay();
}

init();

