/* app.js
   JavaScript logic for Task Manager — Progress Tracker
   - Uses localStorage (key = tm_tasks_v1)
   - Supports add / edit / delete / complete, filters, search, sort, drag & drop reorder
   - Export / import JSON and quick backup link
   - Accessible: aria attributes, focus handling, keyboard shortcuts
*/

(() => {
  // ---------- Configuration ----------
  const STORAGE_KEY = 'tm_tasks_v1';
  // ---------- DOM Elements ----------
  const addForm = document.getElementById('addForm');
  const titleIn = document.getElementById('title');
  const descIn = document.getElementById('description');
  const dueDateIn = document.getElementById('dueDate');
  const priorityIn = document.getElementById('priority');
  const tagsIn = document.getElementById('tags');

  const taskListEl = document.getElementById('taskList');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const statTotal = document.getElementById('stat-total');
  const statActive = document.getElementById('stat-active');
  const statCompleted = document.getElementById('stat-completed');

  const filters = document.querySelectorAll('.filter-btn[data-filter]');
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');
  const sortBy = document.getElementById('sortBy');
  const toggleShowDetails = document.getElementById('toggleShowDetails');

  const btnExport = document.getElementById('btnExport');
  const importFile = document.getElementById('importFile');
  const clearCompleted = document.getElementById('clearCompleted');
  const clearAll = document.getElementById('clearAll');
  const downloadBackup = document.getElementById('downloadBackup');
  const helpBtn = document.getElementById('helpBtn');

  // Modal elements
  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('closeModal');
  const editForm = document.getElementById('editForm');
  const editTitle = document.getElementById('editTitle');
  const editDescription = document.getElementById('editDescription');
  const editDueDate = document.getElementById('editDueDate');
  const editPriority = document.getElementById('editPriority');
  const editTags = document.getElementById('editTags');
  const deleteTaskBtn = document.getElementById('deleteTaskBtn');

  // ---------- State ----------
  let tasks = [];              // array of task objects
  let currentFilter = 'all';   // 'all' | 'active' | 'completed'
  let showDetails = true;      // whether to show descriptions in list
  let editingId = null;        // id of task currently being edited

  // ---------- Utilities ----------
  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    // update backup link when saving
    updateBackupLink();
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(tasks)) tasks = [];
    } catch (e) {
      console.error('Failed to load tasks', e);
      tasks = [];
    }
  }

  // Seed example tasks when user has nothing (helps presentation during demo)
  function seedIfEmpty() {
    if (tasks.length === 0) {
      tasks = [
        { id: uid(), title: 'Finish project README', description: 'Write features & usage', due: '', priority: 'medium', tags: ['internship'], done: false },
        { id: uid(), title: 'Create demo video', description: '1–2 minute overview', due: '', priority: 'high', tags: ['demo'], done: false },
      ];
      save();
    }
  }

  // ---------- Rendering ----------
  function render() {
    // Work on a copy for filtering/sorting
    let list = [...tasks];

    // Search
    const q = (searchInput.value || '').trim().toLowerCase();
    if (q) {
      list = list.filter(t => {
        const join = (t.title || '') + ' ' + (t.description || '') + ' ' + (t.tags || []).join(' ');
        return join.toLowerCase().includes(q);
      });
    }

    // Filter
    if (currentFilter === 'active') list = list.filter(t => !t.done);
    if (currentFilter === 'completed') list = list.filter(t => t.done);

    // Sort
    const s = sortBy.value;
    if (s === 'dueAsc') list.sort((a, b) => (a.due || '') > (b.due || '') ? 1 : -1);
    if (s === 'dueDesc') list.sort((a, b) => (a.due || '') < (b.due || '') ? 1 : -1);
    if (s === 'prioDesc') {
      const rank = { high: 3, medium: 2, low: 1 };
      list.sort((a, b) => (rank[b.priority] || 0) - (rank[a.priority] || 0));
    }
    if (s === 'prioAsc') {
      const rank = { high: 3, medium: 2, low: 1 };
      list.sort((a, b) => (rank[a.priority] || 0) - (rank[b.priority] || 0));
    }
    // order: manual (the tasks array order)

    // Build DOM
    taskListEl.innerHTML = '';
    if (list.length === 0) {
      taskListEl.innerHTML = `<div class="empty-note" style="padding:24px;color:var(--muted)">No tasks — add one on the left.</div>`;
    } else {
      list.forEach((t) => {
        const item = document.createElement('div');
        item.className = 'task' + (t.done ? ' done' : '');
        item.dataset.id = t.id;
        item.draggable = true;

        // Checkbox / toggle
        const check = document.createElement('div');
        check.className = 'check' + (t.done ? ' done' : '');
        check.title = t.done ? 'Mark as not done' : 'Mark as done';
        check.innerHTML = t.done ? '✓' : '';
        check.onclick = () => toggleDone(t.id);

        // Main column
        const main = document.createElement('div');
        main.style.minWidth = '0';

        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'center';

        // Left (title + meta)
        const left = document.createElement('div');
        left.style.minWidth = 0;

        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = t.title;
        title.title = t.title;
        left.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'meta';
        const dueText = t.due ? `Due: ${t.due}` : '';
        meta.textContent = `${dueText} ${t.due && t.priority ? ' · ' : ''}`;
        if (t.priority) {
          const pr = document.createElement('span');
          pr.className = 'pill ' + (t.priority === 'high' ? 'priority-high' : t.priority === 'medium' ? 'priority-medium' : 'priority-low');
          pr.style.marginLeft = '6px';
          pr.textContent = t.priority.charAt(0).toUpperCase() + t.priority.slice(1);
          meta.appendChild(pr);
        }
        left.appendChild(meta);

        topRow.appendChild(left);

        // Right (tags & actions)
        const right = document.createElement('div');
        right.className = 'actions';
        const tagP = document.createElement('div');
        tagP.className = 'tiny muted';
        if (t.tags && t.tags.length) tagP.textContent = t.tags.join(', ');
        right.appendChild(tagP);

        const editBtn = document.createElement('button');
        editBtn.className = 'filter-btn';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => openEdit(t.id);
        right.appendChild(editBtn);

        // Move up/down controls for keyboard-friendly reordering
        const moveUp = document.createElement('button');
        moveUp.className = 'filter-btn';
        moveUp.innerHTML = '↑';
        moveUp.title = 'Move up';
        moveUp.onclick = () => moveTask(t.id, -1);
        right.appendChild(moveUp);

        const moveDown = document.createElement('button');
        moveDown.className = 'filter-btn';
        moveDown.innerHTML = '↓';
        moveDown.title = 'Move down';
        moveDown.onclick = () => moveTask(t.id, 1);
        right.appendChild(moveDown);

        topRow.appendChild(right);
        main.appendChild(topRow);

        // Description (optional)
        if (showDetails && t.description) {
          const d = document.createElement('div');
          d.className = 'muted-note';
          d.textContent = t.description;
          main.appendChild(d);
        }

        item.appendChild(check);
        item.appendChild(main);

        // Rightmost column (delete, due)
        const colRight = document.createElement('div');
        colRight.style.display = 'flex';
        colRight.style.flexDirection = 'column';
        colRight.style.gap = '6px';
        colRight.style.minWidth = '90px';

        const del = document.createElement('button');
        del.className = 'small-ghost';
        del.textContent = 'Delete';
        del.onclick = () => removeTask(t.id);
        colRight.appendChild(del);

        const when = document.createElement('div');
        when.className = 'tiny';
        when.style.textAlign = 'right';
        when.textContent = t.due ? formatDueBadge(t.due) : '';
        colRight.appendChild(when);

        item.appendChild(colRight);

        // Drag handlers
        item.addEventListener('dragstart', (ev) => {
          ev.dataTransfer.setData('text/plain', t.id);
          item.classList.add('dragging');
        });
        item.addEventListener('dragend', (ev) => {
          item.classList.remove('dragging');
        });

        taskListEl.appendChild(item);
      });
    }

    enableDropToReorder();

    // Update stats and progress
    const total = tasks.length;
    const completed = tasks.filter(t => t.done).length;
    const active = total - completed;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    progressBar.style.width = pct + '%';
    progressPercent.textContent = pct + '%';
    statTotal.textContent = 'Total: ' + total;
    statActive.textContent = 'Active: ' + active;
    statCompleted.textContent = 'Completed: ' + completed;

    // update quick download href (object URL)
    updateBackupLink();
  }

  // Helper: human-friendly due text
  function formatDueBadge(iso) {
    try {
      // Parse date strictly as yyyy-mm-dd
      const d = new Date(iso + 'T00:00:00');
      if (isNaN(d)) return '';
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diff = Math.floor((d - today) / (24 * 3600 * 1000));
      if (diff === 0) return 'Due: Today';
      if (diff === 1) return 'Due: Tomorrow';
      if (diff < 0) return 'Overdue';
      return 'Due: ' + iso;
    } catch (e) { return iso; }
  }

  // ---------- Task operations ----------
  function addTask(data) {
    const t = {
      id: uid(),
      title: data.title,
      description: data.description || '',
      due: data.due || '',
      priority: data.priority || 'low',
      tags: data.tags || [],
      done: false
    };
    tasks.push(t);
    save();
    render();
  }

  function toggleDone(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    save();
    render();
  }

  function removeTask(id) {
    if (!confirm('Delete this task?')) return;
    tasks = tasks.filter(x => x.id !== id);
    save();
    render();
  }

  function openEdit(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    editingId = id;
    editTitle.value = t.title;
    editDescription.value = t.description || '';
    editDueDate.value = t.due || '';
    editPriority.value = t.priority || 'low';
    editTags.value = (t.tags || []).join(',');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    // focus on first input for accessibility
    editTitle.focus();
  }

  function closeEdit() {
    editingId = null;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function saveEdit() {
    if (!editingId) return;
    const t = tasks.find(x => x.id === editingId);
    if (!t) return;
    const newTitle = editTitle.value.trim();
    if (!newTitle) { alert('Title cannot be empty'); return; }
    t.title = newTitle;
    t.description = editDescription.value.trim();
    t.due = editDueDate.value || '';
    t.priority = editPriority.value || 'low';
    t.tags = editTags.value ? editTags.value.split(',').map(s => s.trim()).filter(Boolean) : [];
    save();
    render();
    closeEdit();
  }

  function moveTask(id, dir) {
    const idx = tasks.findIndex(x => x.id === id);
    if (idx === -1) return;
    const newIdx = Math.max(0, Math.min(tasks.length - 1, idx + dir));
    if (newIdx === idx) return;
    const [item] = tasks.splice(idx, 1);
    tasks.splice(newIdx, 0, item);
    save(); render();
  }

  // ---------- Drag & drop reordering ----------
  function enableDropToReorder() {
    // Allow dragover to position the dragging element
    taskListEl.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      const afterEl = getDragAfterElement(taskListEl, ev.clientY);
      const dragging = document.querySelector('.task.dragging');
      if (!dragging) return;
      if (!afterEl) {
        taskListEl.appendChild(dragging);
      } else {
        taskListEl.insertBefore(dragging, afterEl);
      }
    });

    // On drop, read DOM order and re-map tasks
    taskListEl.addEventListener('drop', (ev) => {
      ev.preventDefault();
      // Map DOM order to tasks array
      const ids = Array.from(taskListEl.querySelectorAll('.task')).map(n => n.dataset.id);
      const newOrder = ids.map(i => tasks.find(t => t.id === i)).filter(Boolean);
      if (newOrder.length === tasks.length) {
        tasks = newOrder;
        save();
        render();
      }
    });
  }

  // Helper used during dragover to detect insertion point
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > (closest.offset || Number.NEGATIVE_INFINITY)) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // ---------- Export / Import ----------
  btnExport.addEventListener('click', () => {
    const data = JSON.stringify(tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tasks-export.json'; a.click();
    URL.revokeObjectURL(url);
  });

  importFile.addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!Array.isArray(json)) throw new Error('Invalid format - expected an array of tasks');
        // Normalize and append
        const normalized = json.map(item => ({
          id: item.id || uid(),
          title: item.title || 'Untitled',
          description: item.description || '',
          due: item.due || '',
          priority: item.priority || 'low',
          tags: Array.isArray(item.tags) ? item.tags : (item.tags ? ('' + item.tags).split(',').map(s => s.trim()) : []),
          done: !!item.done
        }));
        tasks = tasks.concat(normalized);
        save(); render();
        alert('Tasks imported: ' + normalized.length);
      } catch (err) {
        alert('Failed to import: ' + err.message);
      }
    };
    r.readAsText(file);
    // reset to allow re-importing same file if needed
    importFile.value = '';
  });

  // ---------- Other controls ----------
  clearCompleted.addEventListener('click', () => {
    if (!confirm('Remove all completed tasks?')) return;
    tasks = tasks.filter(t => !t.done);
    save(); render();
  });

  clearAll.addEventListener('click', () => {
    if (!confirm('Remove ALL tasks? This cannot be undone.')) return;
    tasks = [];
    save(); render();
  });

  addForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const title = titleIn.value.trim();
    if (!title) { alert('Please enter a title'); return; }
    const description = descIn.value.trim();
    const due = dueDateIn.value || '';
    const priority = priorityIn.value || 'low';
    const tags = tagsIn.value ? tagsIn.value.split(',').map(s => s.trim()).filter(Boolean) : [];
    addTask({ title, description, due, priority, tags });
    addForm.reset();
    titleIn.focus();
  });

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  searchInput.addEventListener('input', () => render());
  clearSearch.addEventListener('click', () => { searchInput.value = ''; render(); });

  sortBy.addEventListener('change', () => render());
  toggleShowDetails.addEventListener('click', () => { showDetails = !showDetails; render(); });

  closeModal.addEventListener('click', closeEdit);
  editForm.addEventListener('submit', (ev) => { ev.preventDefault(); saveEdit(); });
  deleteTaskBtn.addEventListener('click', () => {
    if (!editingId) return;
    if (!confirm('Delete this task?')) return;
    tasks = tasks.filter(x => x.id !== editingId);
    save();
    closeEdit();
    render();
  });

  helpBtn.addEventListener('click', () => {
    alert('Usage tips:\n- Add tasks on left\n- Use priority/due date/tags\n- Drag tasks to reorder\n- Edit tasks with Edit button\n- Export/import JSON for backup\n\nKeyboard: Ctrl/Cmd+B => Quick backup download');
  });

  // Keyboard shortcut for quick backup
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      downloadBackup.href = url;
      downloadBackup.click();
      // Not revoking here because some browsers use the link action; we revoke on next save/update
    }
  });

  // ---------- Backup link handling ----------
  let lastBackupObjectURL = null;
  function updateBackupLink() {
    if (lastBackupObjectURL) {
      URL.revokeObjectURL(lastBackupObjectURL);
      lastBackupObjectURL = null;
    }
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    lastBackupObjectURL = URL.createObjectURL(blob);
    downloadBackup.href = lastBackupObjectURL;
  }

  // ---------- Initial load ----------
  load();
  seedIfEmpty();
  render();

  // ---------- Expose for debugging (optional) ----------
  window.TM = {
    get tasks() { return tasks; },
    save, load, render
  };
})();
