require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { YoutubeTranscript } = require('youtube-transcript');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

app.use(express.json());
app.use(express.static('public'));

// --- Simple in-memory rate limiter: 5 free extractions per IP per day ---
// NOTE: resets when the server restarts (Railway free tier can restart the
// service periodically). For a persistent/paid-tier limit, this would need
// a real database instead of memory.
const DAILY_LIMIT = 5;
const usageByIp = new Map();

function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}_${today}`;
  const count = usageByIp.get(key) || 0;

  if (count >= DAILY_LIMIT) {
    return res.status(429).json({
      error: `Free limit reached (${DAILY_LIMIT} extractions/day). Please try again tomorrow.`,
      limitReached: true
    });
  }

  usageByIp.set(key, count + 1);
  res.setHeader('X-RateLimit-Remaining', DAILY_LIMIT - (count + 1));
  next();
}

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
// NOTE: this is a lightweight keyword-recombination approach, not real AI
// generation or real-time trending data. For genuinely smart, context-aware
// topic ideas, this function can be swapped to call an AI API (Claude/GPT)
// if an API key is provided later.
function buildRelatedTopics(title, tags) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'in', 'on', 'with', 'is', 'how', 'best', 'video', 'this', 'that', 'you', 'your']);
  const words = [...title.toLowerCase().split(/\W+/), ...tags.map(t => t.toLowerCase())]
    .filter(w => w.length > 2 && !stopWords.has(w));

  const uniqueWords = [...new Set(words)].slice(0, 8);
  const year = new Date().getFullYear();

  const templates = [
    (w) => `A beginner's complete guide to ${w} — what to know before you start`,
    (w) => `The most common ${w} mistakes people make, and how to avoid them`,
    (w) => `${w} vs. the alternatives: which one actually works better?`,
    (w) => `Step-by-step: how to master ${w} even if you're starting from zero`,
    (w) => `What nobody tells you about ${w} until it's too late`,
    (w) => `${w} explained simply, in under 10 minutes`,
    (w) => `The top tools and resources for ${w} in ${year}`,
    (w) => `How ${w} trends are shifting in ${year}, and what to expect next`,
    (w) => `Real results: what actually happens when you try ${w}`,
    (w) => `${w} for beginners: a practical checklist to get started today`
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
app.post('/api/extract', rateLimit, async (req, res) => {
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

    // 2. Thumbnails - offer every size YouTube provides, for download in different resolutions
    const thumbnails = snippet.thumbnails;
    const bestThumbnail =
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url;

    const thumbnailOptions = [
      thumbnails.maxres && { label: 'HD (1280x720)', url: thumbnails.maxres.url },
      thumbnails.standard && { label: 'Standard (640x480)', url: thumbnails.standard.url },
      thumbnails.high && { label: 'High (480x360)', url: thumbnails.high.url },
      thumbnails.medium && { label: 'Medium (320x180)', url: thumbnails.medium.url },
      thumbnails.default && { label: 'Small (120x90)', url: thumbnails.default.url }
    ].filter(Boolean);

    // 3. Transcript (best-effort; not always available) - joined into one continuous line
    let transcript = '';
    let transcriptError = null;
    try {
      const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
      transcript = rawTranscript.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
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
      thumbnailOptions,
      transcript,
      transcriptError,
      relatedTopics
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kuch galat ho gaya. Dobara try karein.' });
  }
});

// --- Thumbnail download proxy ---
// Direct <a download> links don't work across origins (browser just opens
// the image instead of saving it). This route fetches the image on our
// server and streams it back with a Content-Disposition header so the
// browser's save dialog actually triggers, in the exact resolution clicked.
app.get('/api/download-thumbnail', async (req, res) => {
  try {
    const { url, label } = req.query;
    if (!url || !url.startsWith('https://i.ytimg.com') && !url.startsWith('https://img.youtube.com')) {
      return res.status(400).send('Invalid thumbnail URL.');
    }
    const imgRes = await fetch(url);
    if (!imgRes.ok) return res.status(404).send('Thumbnail not found.');

    const safeLabel = (label || 'thumbnail').toString().replace(/[^a-z0-9]/gi, '-').toLowerCase();
    res.setHeader('Content-Disposition', `attachment; filename="${safeLabel}.jpg"`);
    res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    imgRes.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Could not download thumbnail.');
  }
});

app.listen(PORT, () => {
  console.log(`AllVidExtract server chal raha hai: http://localhost:${PORT}`);
});
