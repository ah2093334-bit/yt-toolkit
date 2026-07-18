require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { YoutubeTranscript } = require('youtube-transcript');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

app.use(express.json());
app.use(express.static('public'));

// --- Helper: extract video ID from any YouTube URL format ---
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

// --- Helper: build 8-10 related topic suggestions from title + tags ---
// NOTE: this is a lightweight keyword-recombination approach, not real-time
// trending data. For true trending data, Google Trends API can be wired in later.
function buildRelatedTopics(title, tags) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'in', 'on', 'with', 'is', 'how', 'best', 'video']);
  const words = [...title.toLowerCase().split(/\W+/), ...tags.map(t => t.toLowerCase())]
    .filter(w => w.length > 2 && !stopWords.has(w));

  const uniqueWords = [...new Set(words)].slice(0, 6);
  const templates = [
    (w) => `${w} for beginners 2026`,
    (w) => `best ${w} tips`,
    (w) => `${w} vs alternatives`,
    (w) => `how to master ${w}`,
    (w) => `${w} mistakes to avoid`,
    (w) => `${w} explained step by step`,
    (w) => `top ${w} tools`,
    (w) => `${w} trends this year`
  ];

  const topics = [];
  let i = 0;
  while (topics.length < 10 && i < uniqueWords.length * templates.length) {
    const word = uniqueWords[i % uniqueWords.length];
    const template = templates[i % templates.length];
    const topic = template(word);
    if (!topics.includes(topic)) topics.push(topic);
    i++;
  }
  return topics.slice(0, 10);
}

// --- Main extraction endpoint ---
app.post('/api/extract', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'YouTube URL zaroori hai.' });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'Valid YouTube URL nahi mila. Link check karein.' });

    if (!API_KEY) {
      return res.status(500).json({ error: 'Server par YOUTUBE_API_KEY set nahi hai. .env file check karein.' });
    }

    // 1. Fetch video metadata from YouTube Data API v3
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (!apiData.items || apiData.items.length === 0) {
      return res.status(404).json({ error: 'Video nahi mila. ID ya URL check karein.' });
    }

    const snippet = apiData.items[0].snippet;
    const title = snippet.title;
    const description = snippet.description;
    const tags = snippet.tags || [];
    const hashtags = (description.match(/#[\w]+/g) || []);

    // 2. Thumbnail (highest available quality)
    const thumbnails = snippet.thumbnails;
    const bestThumbnail =
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url;

    // 3. Transcript (best-effort; not always available)
    let transcript = [];
    let transcriptError = null;
    try {
      const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
      transcript = rawTranscript.map(t => ({ text: t.text, offset: t.offset }));
    } catch (err) {
      transcriptError = 'Is video par transcript/captions available nahi hain.';
    }

    // 4. Related topic ideas
    const relatedTopics = buildRelatedTopics(title, tags);

    res.json({
      videoId,
      title,
      description,
      tags,
      hashtags,
      thumbnail: bestThumbnail,
      transcript,
      transcriptError,
      relatedTopics
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kuch galat ho gaya. Dobara try karein.' });
  }
});

app.listen(PORT, () => {
  console.log(`YT Toolkit server chal raha hai: http://localhost:${PORT}`);
});
