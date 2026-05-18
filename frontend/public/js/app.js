const API = '/api';
let selectedColor = '#22c55e';
let charts = {};

async function api(path, options) {
  const r = await fetch(API + path, options);
  return r.json();
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'analytics') loadAnalytics();
}

document.querySelectorAll('.nav-item').forEach(n =>
  n.addEventListener('click', () => showView(n.dataset.view))
);

document.getElementById('menuBtn').addEventListener('click', () =>
  document.getElementById('sidebar').classList.toggle('open')
);

async function loadQuote() {
  try {
    const d = await api('/quote');
    document.getElementById('quoteText').textContent = '💡 ' + d.quote;
  } catch(_) {}
}

async function loadStats() {
  try {
    const s = await api('/stats');
    document.getElementById('totalXP').textContent = s.totalXP + ' XP';
    document.getElementById('streakBadge').textContent = '🔥 ' + s.currentStreak + ' day streak';
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-value">${s.totalHabits}</div><div class="stat-label">Total Habits</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${s.todayCompletions}</div><div class="stat-label">Done Today</div></div>
      <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-value">${s.weeklyCompletions}</div><div class="stat-label">This Week</div></div>
      <div class="stat-card"><div class="stat-icon">⚡</div><div class="stat-value">${s.totalXP}</div><div class="stat-label">Total XP</div></div>
    `;
  } catch(_) {}
}

async function loadTodayList() {
  try {
    const habits = await api('/habits');
    const today = new Date().toISOString().split('T')[0];
    const el = document.getElementById('todayList');
    if (!habits.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🌱</div><p>No habits yet. Add your first one!</p></div>';
      return;
    }
    el.innerHTML = '';
    for (const h of habits) {
      const logs = await api('/logs/' + h.id);
      const done = logs.some(l => l.log_date && l.log_date.startsWith(today) && l.completed);
      const div = document.createElement('div');
      div.className = 'today-item';
      div.innerHTML = `
        <div class="today-icon" style="background:${h.color}22">${h.icon}</div>
        <div class="today-info">
          <div class="today-name">${h.name}</div>
          <div class="today-desc">${h.description || 'Keep it up!'}</div>
        </div>
        <button class="log-btn ${done ? 'done' : 'todo'}" onclick="logHabit(${h.id}, this)" ${done ? 'disabled' : ''}>
          ${done ? '✓ Done' : 'Log Now'}
        </button>`;
      el.appendChild(div);
    }
  } catch(_) {}
}

async function logHabit(id, btn) {
  btn.disabled = true;
  btn.textContent = '...';
  await api('/logs', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ habitId: id, completed: true }) });
  btn.className = 'log-btn done';
  btn.textContent = '✓ Done';
  loadStats();
}

async function loadHabitsGrid() {
  try {
    const habits = await api('/habits');
    const el = document.getElementById('habitsGrid');
    if (!habits.length) {
      el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🌱</div><p>No habits yet. Click <b>New Habit</b> to begin.</p></div>';
      return;
    }
    el.innerHTML = '';
    for (const h of habits) {
      const logs = await api('/logs/' + h.id);
      const completions = logs.filter(l => l.completed).length;
      const div = document.createElement('div');
      div.className = 'habit-card';
      div.style.setProperty('--c', h.color);
      div.innerHTML = `
        <div class="habit-top">
          <span class="habit-emoji">${h.icon}</span>
          <span class="habit-xp">${completions * 10} XP</span>
        </div>
        <div class="habit-name">${h.name}</div>
        <div class="habit-desc">${h.description || 'No description'}</div>
        <div class="habit-completions"><strong>${completions}</strong> total completions</div>
        <div class="habit-actions">
          <button class="btn-log" onclick="logFromGrid(${h.id})"><i class="bi bi-check2-circle"></i> Log Today</button>
          <button class="btn-edit" onclick="openEdit(${h.id},'${h.name}','${h.description||''}','${h.color}','${h.icon}')"><i class="bi bi-pencil"></i></button>
          <button class="btn-del" onclick="deleteHabit(${h.id})"><i class="bi bi-trash"></i></button>
        </div>`;
      el.appendChild(div);
    }
  } catch(_) {}
}

async function logFromGrid(id) {
  await api('/logs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({habitId:id,completed:true}) });
  loadHabitsGrid();
  loadStats();
}

async function deleteHabit(id) {
  if (!confirm('Delete this habit permanently?')) return;
  await api('/habits/' + id, { method: 'DELETE' });
  loadHabitsGrid();
  loadStats();
  loadTodayList();
}

function openModal() {
  document.getElementById('editId').value = '';
  document.getElementById('habitForm').reset();
  document.getElementById('modalTitle').textContent = 'New Habit';
  document.getElementById('submitBtn').textContent = 'Create Habit';
  selectedColor = '#22c55e';
  document.querySelectorAll('.color-dot').forEach(d => d.classList.toggle('selected', d.dataset.color === selectedColor));
  document.getElementById('modalOverlay').classList.add('open');
}

function openEdit(id, name, desc, color, icon) {
  document.getElementById('editId').value = id;
  document.getElementById('habitName').value = name;
  document.getElementById('habitDesc').value = desc;
  document.getElementById('habitIcon').value = icon;
  document.getElementById('modalTitle').textContent = 'Edit Habit';
  document.getElementById('submitBtn').textContent = 'Save Changes';
  selectedColor = color;
  document.querySelectorAll('.color-dot').forEach(d => d.classList.toggle('selected', d.dataset.color === color));
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

document.getElementById('openModalBtn').addEventListener('click', openModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    selectedColor = dot.dataset.color;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
  });
});

document.getElementById('habitForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const body = {
    name: document.getElementById('habitName').value.trim(),
    description: document.getElementById('habitDesc').value.trim(),
    color: selectedColor,
    icon: document.getElementById('habitIcon').value,
  };
  if (id) {
    await api('/habits/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  } else {
    await api('/habits', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  }
  closeModal();
  loadHabitsGrid();
  loadStats();
  loadTodayList();
});

async function loadAnalytics() {
  try {
    const data = await api('/analytics');
    const labels = data.timeline.map(d => d.date.slice(5));
    const counts = data.timeline.map(d => parseInt(d.count));

    if (charts.timeline) charts.timeline.destroy();
    charts.timeline = new Chart(document.getElementById('timelineChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{ label:'Completions', data:counts, borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,0.1)', fill:true, tension:0.4, pointBackgroundColor:'#22c55e' }]
      },
      options: { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748b'}}, y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748b'}} } }
    });

    if (charts.habit) charts.habit.destroy();
    charts.habit = new Chart(document.getElementById('habitChart'), {
      type: 'bar',
      data: {
        labels: data.perHabit.map(h => h.name),
        datasets: [{ label:'Completions', data: data.perHabit.map(h => parseInt(h.completions)), backgroundColor:['#22c55e','#8b5cf6','#f59e0b','#06b6d4','#ef4444','#ec4899'], borderRadius:6 }]
      },
      options: { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748b'}}, y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#64748b'}} } }
    });
  } catch(_) {}
}

async function init() {
  await loadQuote();
  await loadStats();
  await loadTodayList();
  loadHabitsGrid();
  setInterval(loadQuote, 20000);
}

init();
