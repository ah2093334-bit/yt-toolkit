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

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = String(totalSec % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

async function extract() {
  const url = urlInput.value.trim();
  clearError();
  results.hidden = true;

  if (!url) {
    showError('Pehle YouTube ka link daalein.');
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
      showError(data.error || 'Kuch galat ho gaya.');
      return;
    }

    // Title
    document.getElementById('outTitle').textContent = data.title;

    // Description
    document.getElementById('outDescription').textContent = data.description || '(No description)';

    // Tags + hashtags
    const tagsWrap = document.getElementById('outTags');
    tagsWrap.innerHTML = '';
    [...data.tags, ...data.hashtags].forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = tag;
      tagsWrap.appendChild(chip);
    });
    if (data.tags.length === 0 && data.hashtags.length === 0) {
      tagsWrap.textContent = 'Is video par koi public tags/hashtags nahi mile.';
    }

    // Thumbnail
    const thumbImg = document.getElementById('outThumb');
    const thumbDownload = document.getElementById('thumbDownload');
    thumbImg.src = data.thumbnail;
    thumbDownload.href = data.thumbnail;

    // Transcript
    const transcriptBox = document.getElementById('outTranscript');
    transcriptBox.innerHTML = '';
    if (data.transcriptError) {
      transcriptBox.textContent = data.transcriptError;
    } else {
      data.transcript.forEach(line => {
        const p = document.createElement('p');
        p.className = 'transcript-line';
        p.innerHTML = `<b>${formatTime(line.offset)}</b> — ${line.text}`;
        transcriptBox.appendChild(p);
      });
    }

    // Related topics
    const topicsList = document.getElementById('outTopics');
    topicsList.innerHTML = '';
    data.relatedTopics.forEach(topic => {
      const li = document.createElement('li');
      li.textContent = topic;
      topicsList.appendChild(li);
    });

    results.hidden = false;
  } catch (err) {
    showError('Server se connect nahi ho paya. Server chal raha hai check karein.');
  } finally {
    scrubber.hidden = true;
    extractBtn.disabled = false;
  }
}

extractBtn.addEventListener('click', extract);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') extract();
});
