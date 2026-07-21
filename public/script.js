/* ---------- Sidebar menu ---------- */
(function initSidebar() {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const closeBtn = document.getElementById('sidebarClose');
  if (!menuBtn || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  menuBtn.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
})();

/* ---------- Falling starfield (signature header animation) ---------- */
(function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function makeStars() {
    const count = Math.floor((canvas.width * canvas.height) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.4,
      speed: Math.random() * 0.4 + 0.15,
      twinkle: Math.random() * Math.PI * 2
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.y += s.speed;
      s.twinkle += 0.03;
      if (s.y > canvas.height) { s.y = -2; s.x = Math.random() * canvas.width; }
      const opacity = 0.4 + Math.sin(s.twinkle) * 0.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(opacity, 0.15)})`;
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }

  resize();
  makeStars();
  window.addEventListener('resize', () => { resize(); makeStars(); });
  if (!prefersReducedMotion) requestAnimationFrame(frame);
})();

/* ---------- Extraction logic ---------- */
const urlInput = document.getElementById('ytUrl');
const extractBtn = document.getElementById('extractBtn');
const errorMsg = document.getElementById('errorMsg');
const scrubber = document.getElementById('scrubber');
const results = document.getElementById('results');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.hidden = true;
  errorMsg.textContent = '';
}

async function extract() {
  const url = urlInput.value.trim();
  clearError();
  results.hidden = true;

  if (!url) {
    showError('Please paste a video link first.');
    return;
  }

  scrubber.hidden = false;
  extractBtn.disabled = true;

  try {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.limitReached ? `⏳ ${data.error}` : (data.error || 'Something went wrong.'));
      return;
    }

    document.getElementById('outTitle').textContent = data.title;
    document.getElementById('outDescription').textContent = data.description || '(No description)';

    const tagsWrap = document.getElementById('outTags');
    tagsWrap.innerHTML = '';
    data.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = tag;
      tagsWrap.appendChild(chip);
    });
    if (data.tags.length === 0) tagsWrap.textContent = 'No public tags found for this video.';

    const hashtagsWrap = document.getElementById('outHashtags');
    hashtagsWrap.innerHTML = '';
    data.hashtags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = tag;
      hashtagsWrap.appendChild(chip);
    });
    if (data.hashtags.length === 0) hashtagsWrap.textContent = 'No hashtags found for this video.';

    document.getElementById('outThumb').src = data.thumbnail;

    const thumbOptions = document.getElementById('thumbOptions');
    thumbOptions.innerHTML = '';
    (data.thumbnailOptions || []).forEach(opt => {
      const a = document.createElement('a');
      a.className = 'thumb-download-btn';
      const label = opt.label.split(' ')[0].toLowerCase();
      a.href = `/api/download-thumbnail?url=${encodeURIComponent(opt.url)}&label=${encodeURIComponent(label)}`;
      a.textContent = `Download ${opt.label}`;
      thumbOptions.appendChild(a);
    });

    const transcriptBox = document.getElementById('outTranscript');
    transcriptBox.textContent = data.transcriptError ? data.transcriptError : data.transcript;

    const topicsList = document.getElementById('outTopics');
    topicsList.innerHTML = '';
    data.relatedTopics.forEach(topic => {
      const li = document.createElement('li');
      li.textContent = topic;
      topicsList.appendChild(li);
    });

    results.hidden = false;
  } catch (err) {
    showError('Could not connect to the server. Please try again.');
  } finally {
    scrubber.hidden = true;
    extractBtn.disabled = false;
  }
}

extractBtn.addEventListener('click', extract);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') extract(); });

/* ---------- Copy buttons ---------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;

  const targetId = btn.dataset.copyTarget;
  const mode = btn.dataset.copyMode;
  const targetEl = document.getElementById(targetId);
  if (!targetEl) return;

  let textToCopy;
  if (mode === 'chips') {
    textToCopy = Array.from(targetEl.querySelectorAll('.chip')).map(c => c.textContent).join(', ');
  } else {
    textToCopy = targetEl.textContent;
  }

  if (!textToCopy) return;

  navigator.clipboard.writeText(textToCopy).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 1500);
  });
});
