/* ---------- Title Analyzer (rule-based, no AI/API needed) ---------- */
(function initTitleAnalyzer() {
  const titleInput = document.getElementById('titleInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const charCount = document.getElementById('charCount');
  const results = document.getElementById('analyzeResults');
  const inputLabel = document.getElementById('inputLabel');
  const modeTitleBtn = document.getElementById('modeTitleBtn');
  const modeUrlBtn = document.getElementById('modeUrlBtn');
  const videoStatsResults = document.getElementById('videoStatsResults');
  const urlScrubber = document.getElementById('urlScrubber');
  const urlErrorMsg = document.getElementById('urlErrorMsg');
  if (!titleInput || !analyzeBtn) return;

  let currentMode = 'title';

  if (modeTitleBtn && modeUrlBtn) {
    modeTitleBtn.addEventListener('click', () => {
      currentMode = 'title';
      modeTitleBtn.classList.add('active');
      modeUrlBtn.classList.remove('active');
      inputLabel.textContent = 'Type your video title';
      titleInput.placeholder = 'e.g. 7 Mistakes Beginners Make When Editing Video';
      titleInput.value = '';
      charCount.hidden = false;
      results.hidden = true;
      videoStatsResults.hidden = true;
      urlErrorMsg.hidden = true;
    });
    modeUrlBtn.addEventListener('click', () => {
      currentMode = 'url';
      modeUrlBtn.classList.add('active');
      modeTitleBtn.classList.remove('active');
      inputLabel.textContent = 'Paste the video URL';
      titleInput.placeholder = 'https://www.youtube.com/watch?v=...';
      titleInput.value = '';
      charCount.hidden = true;
      results.hidden = true;
      videoStatsResults.hidden = true;
      urlErrorMsg.hidden = true;
    });
  }

  titleInput.addEventListener('input', () => {
    if (currentMode === 'title') charCount.textContent = `${titleInput.value.length} characters`;
  });

  function formatNumber(n) {
    if (n === null || n === undefined) return 'Not available';
    return n.toLocaleString('en-US');
  }

  async function fetchVideoStats(url) {
    urlErrorMsg.hidden = true;
    results.hidden = true;
    videoStatsResults.hidden = true;
    urlScrubber.hidden = false;

    try {
      const res = await fetch(`/api/video-stats?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) {
        urlErrorMsg.textContent = data.limitReached ? `⏳ ${data.error}` : (data.error || 'Something went wrong.');
        urlErrorMsg.hidden = false;
        return;
      }

      document.getElementById('statViews').textContent = formatNumber(data.views);
      document.getElementById('statLikes').textContent = formatNumber(data.likes);
      document.getElementById('statComments').textContent = formatNumber(data.comments);
      document.getElementById('statPublished').textContent = new Date(data.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      document.getElementById('statChannelTitle').textContent = data.channelTitle;
      document.getElementById('statChannelId').textContent = data.channelId;
      document.getElementById('statEarnings').textContent = `$${data.estimateLow} – $${data.estimateHigh}`;

      videoStatsResults.hidden = false;
    } catch (err) {
      urlErrorMsg.textContent = 'Could not connect to the server. Please try again.';
      urlErrorMsg.hidden = false;
    } finally {
      urlScrubber.hidden = true;
    }
  }

  const POWER_WORDS = ['secret', 'best', 'ultimate', 'proven', 'mistake', 'mistakes', 'ever', 'never',
    'stop', 'warning', 'truth', 'shocking', 'insane', 'easy', 'fast', 'free', 'guide', 'tips', 'hack',
    'hacks', 'revealed', 'why', 'how', 'what', 'worst', 'top', 'finally', 'honest', 'real'];

  titleInput.addEventListener('input', () => {
    charCount.textContent = `${titleInput.value.length} characters`;
  });

  function countWords(str) { return str.trim().split(/\s+/).filter(Boolean).length; }

  // Build suggested tags/keywords from the title — same lightweight
  // keyword-recombination approach used for "related topics" on the
  // extractor page. Not real search-volume data (that needs a paid SEO
  // API); this is meant as a quick tagging starting point.
  function buildSuggestedTags(title) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'in', 'on', 'with',
      'is', 'how', 'best', 'video', 'this', 'that', 'you', 'your', 'i', 'my', 'me']);
    const words = title.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
    const uniqueWords = [...new Set(words)].slice(0, 6);

    const modifiers = ['tips', 'guide', 'tutorial', 'for beginners', 'explained', 'ideas', '2026', 'how to'];
    const tags = new Set();

    uniqueWords.forEach(w => tags.add(w));
    uniqueWords.forEach((w, i) => {
      const mod = modifiers[i % modifiers.length];
      tags.add(`${w} ${mod}`);
    });
    if (uniqueWords.length >= 2) tags.add(`${uniqueWords[0]} ${uniqueWords[1]}`);

    return [...tags].slice(0, 12);
  }

  function analyzeTitle(title) {
    const breakdown = [];
    let score = 0;

    // 1. Length (25 pts)
    const len = title.length;
    let lengthPts;
    if (len >= 40 && len <= 60) lengthPts = 25;
    else if ((len >= 30 && len < 40) || (len > 60 && len <= 70)) lengthPts = 18;
    else if (len > 0 && (len < 30 || (len > 70 && len <= 100))) lengthPts = 10;
    else lengthPts = 0;
    score += lengthPts;
    breakdown.push({ label: `Length (${len} characters)`, points: lengthPts, max: 25,
      ok: lengthPts >= 18 });

    // 2. Contains a number (15 pts)
    const hasNumber = /\d/.test(title);
    score += hasNumber ? 15 : 0;
    breakdown.push({ label: 'Contains a number', points: hasNumber ? 15 : 0, max: 15, ok: hasNumber });

    // 3. Power/curiosity word (20 pts)
    const lowerTitle = title.toLowerCase();
    const hasPowerWord = POWER_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(lowerTitle));
    score += hasPowerWord ? 20 : 0;
    breakdown.push({ label: 'Uses a curiosity/power word', points: hasPowerWord ? 20 : 0, max: 20, ok: hasPowerWord });

    // 4. Front-loaded keyword (10 pts) — number or power word in first 4 words
    const firstWords = title.toLowerCase().split(/\s+/).slice(0, 4).join(' ');
    const frontLoaded = /\d/.test(firstWords) || POWER_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(firstWords));
    score += frontLoaded ? 10 : 0;
    breakdown.push({ label: 'Key word/number near the start', points: frontLoaded ? 10 : 0, max: 10, ok: frontLoaded });

    // 5. Bracket/parenthesis usage (10 pts)
    const hasBracket = /[\(\)\[\]]/.test(title);
    score += hasBracket ? 10 : 0;
    breakdown.push({ label: 'Uses brackets, e.g. (2026 Guide)', points: hasBracket ? 10 : 0, max: 10, ok: hasBracket });

    // 6. Question or colon structure (10 pts)
    const hasStructure = /[?:]/.test(title);
    score += hasStructure ? 10 : 0;
    breakdown.push({ label: 'Question mark or colon structure', points: hasStructure ? 10 : 0, max: 10, ok: hasStructure });

    // 7. Word count readability (10 pts)
    const wordCount = countWords(title);
    const readablePts = (wordCount >= 4 && wordCount <= 12) ? 10 : (wordCount > 0 ? 5 : 0);
    score += readablePts;
    breakdown.push({ label: `Word count (${wordCount} words)`, points: readablePts, max: 10, ok: readablePts === 10 });

    // Penalties
    const letters = title.replace(/[^a-zA-Z]/g, '');
    const upperLetters = title.replace(/[^A-Z]/g, '');
    const capsRatio = letters.length ? upperLetters.length / letters.length : 0;
    if (capsRatio > 0.35 && letters.length > 6) {
      score -= 15;
      breakdown.push({ label: 'Too many capital letters (looks spammy)', points: -15, max: 0, ok: false });
    }
    const exclaimCount = (title.match(/[!?]/g) || []).length;
    if (exclaimCount > 2) {
      score -= 10;
      breakdown.push({ label: 'Excessive punctuation (!/?)', points: -10, max: 0, ok: false });
    }

    score = Math.max(0, Math.min(100, score));

    let grade, summary;
    if (score >= 80) { grade = 'Excellent'; summary = 'This title is well-optimized and ready to publish.'; }
    else if (score >= 60) { grade = 'Good'; summary = 'A solid title — a couple of small tweaks could make it stronger.'; }
    else if (score >= 40) { grade = 'Needs work'; summary = 'This title is missing a few proven elements. See suggestions below.'; }
    else { grade = 'Weak'; summary = 'This title is unlikely to perform well as-is. Consider revising it.'; }

    const suggestions = [];
    if (lengthPts < 25) suggestions.push('Aim for 40–60 characters so the full title shows in search results without being cut off.');
    if (!hasNumber) suggestions.push('Consider adding a number (e.g. "7 Ways to...", "in 2026") — numbered titles tend to get more clicks.');
    if (!hasPowerWord) suggestions.push('Add a curiosity or power word like "secret", "mistake", "proven", or "how" to increase click appeal.');
    if (!frontLoaded) suggestions.push('Move your strongest keyword or number closer to the beginning of the title.');
    if (!hasBracket) suggestions.push('Try adding a bracketed clarifier, e.g. "(Step by Step)" or "(2026 Guide)".');
    if (!hasStructure) suggestions.push('A question mark or colon can add structure and curiosity — e.g. "Is X Worth It?" or "X: The Complete Guide".');
    if (readablePts < 10) suggestions.push('Aim for 4–12 words — long enough to be clear, short enough to stay readable.');
    if (capsRatio > 0.35 && letters.length > 6) suggestions.push('Reduce ALL CAPS usage — it can look spammy and hurt trust.');
    if (exclaimCount > 2) suggestions.push('Reduce the number of "!" or "?" — more than 2 can look like clickbait spam.');
    if (suggestions.length === 0) suggestions.push('This title already checks every box — nice work!');

    return { score, grade, summary, breakdown, suggestions };
  }

  function renderResults(result) {
    document.getElementById('scoreNumber').textContent = result.score;
    document.getElementById('scoreGrade').textContent = result.grade;
    document.getElementById('scoreSummary').textContent = result.summary;

    const breakdownList = document.getElementById('breakdownList');
    breakdownList.innerHTML = '';
    result.breakdown.forEach(item => {
      const li = document.createElement('li');
      li.className = item.ok ? 'breakdown-ok' : 'breakdown-bad';
      const sign = item.points >= 0 ? '+' : '';
      li.textContent = `${item.ok ? '✓' : '✕'} ${item.label} (${sign}${item.points})`;
      breakdownList.appendChild(li);
    });

    const suggestionsList = document.getElementById('suggestionsList');
    suggestionsList.innerHTML = '';
    result.suggestions.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      suggestionsList.appendChild(li);
    });

    const tagsWrap = document.getElementById('suggestedTags');
    if (tagsWrap) {
      tagsWrap.innerHTML = '';
      buildSuggestedTags(titleInput.value.trim()).forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = tag;
        tagsWrap.appendChild(chip);
      });
    }

    results.hidden = false;
  }

  analyzeBtn.addEventListener('click', () => {
    const value = titleInput.value.trim();
    if (!value) return;
    if (currentMode === 'title') {
      renderResults(analyzeTitle(value));
    } else {
      fetchVideoStats(value);
    }
  });
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') analyzeBtn.click();
  });
})();

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
