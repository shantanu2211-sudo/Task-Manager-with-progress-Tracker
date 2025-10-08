document.addEventListener('DOMContentLoaded', () => {
  // sync header progress with the app's progress percent
  const headerProgress = document.getElementById('headerProgress');
  const progText = document.getElementById('progressPercent');
  function syncProgress(){
    if (progText && headerProgress) headerProgress.textContent = progText.textContent;
  }
  syncProgress();
  // observe progressBar style changes to keep the header sync'd
  const progressBar = document.getElementById('progressBar');
  if (progressBar && window.MutationObserver) {
    new MutationObserver(syncProgress).observe(progressBar, { attributes: true, attributeFilter: ['style'] });
  }

  // theme toggle (persist in localStorage)
  const themeToggle = document.getElementById('themeToggle');
  const storedTheme = localStorage.getItem('tm_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', storedTheme);
  if (themeToggle) themeToggle.textContent = storedTheme === 'dark' ? '🌙' : '☀️';
  if (themeToggle) themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tm_theme', next);
    themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
    themeToggle.setAttribute('aria-pressed', next === 'dark' ? 'false' : 'true');
  });

  // small mobile menu handler (optional)
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      const open = document.body.classList.toggle('mobile-menu-open');
      mobileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Particle burst when a task checkbox is clicked
  const taskList = document.getElementById('taskList');
  if (taskList) {
    taskList.addEventListener('click', (ev) => {
      const check = ev.target.closest('.check');
      if (!check) return;
      // visual pop
      check.classList.add('pop');
      setTimeout(() => check.classList.remove('pop'), 260);
      // small burst
      createBurst(check);
    });
  }

  function createBurst(el) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width/2 + window.scrollX;
    const cy = rect.top + rect.height/2 + window.scrollY;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.className = 'particle c' + (Math.floor(Math.random()*4) + 1);
      // position at center
      p.style.left = (cx - 6) + 'px';
      p.style.top = (cy - 6) + 'px';
      // random direction
      const ang = Math.random() * Math.PI * 2;
      const dist = 26 + Math.random() * 36;
      p.style.setProperty('--tx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--ty', Math.sin(ang) * dist + 'px');
      document.body.appendChild(p);
      // trigger css animation
      p.style.animation = 'burst 720ms cubic-bezier(.2,.8,.2,1)';
      p.addEventListener('animationend', () => p.remove());
    }
  }
});
