# YT ID Extractor

YouTube video link daalo → title, description, tags/hashtags, thumbnail, transcript, aur 8-10 related topic ideas milte hain. Video/audio download nahi karta (YouTube ToS follow karta hai).

## Setup (pehli baar)

### 1. Free YouTube API key banayein
1. Jayein: https://console.cloud.google.com/
2. Naya project banayein (koi bhi naam, e.g. "yt-toolkit")
3. Left menu → "APIs & Services" → "Library"
4. Search karein "YouTube Data API v3" → click → **Enable** dabayein
5. Left menu → "APIs & Services" → "Credentials" → **Create Credentials** → **API Key**
6. Jo key milegi wo copy kar lein (bilkul free hai, koi card nahi lagta — daily free quota milta hai)

### 2. Project setup
```bash
npm install
cp .env.example .env
```
`.env` file khol kar apni API key paste karein:
```
YOUTUBE_API_KEY=yahan_apni_key_paste_karein
```

### 3. Server chalayein
```bash
npm start
```
Browser mein kholein: http://localhost:3000

## Note: Transcript feature
Transcript sirf un videos par milega jinme YouTube captions (auto ya manual) available hain. Ye ek unofficial method use karta hai — agar YouTube apna internal system badalta hai to isko update karna pad sakta hai.

## Deploy karne ke liye (live website banane ke liye)
Is project ko free mein host kar sakte hain:
- **Render.com** ya **Railway.app** (Node.js backend ke liye best, free tier available)
- Deploy karte waqt wahan ke "Environment Variables" section mein `YOUTUBE_API_KEY` add karna na bhoolein

## Agla step (v2 ideas)
- Facebook/Instagram video metadata support
- Thumbnail se AI image-prompt generate karna (vision AI API chahiye hoga)
- Real trending topics (Google Trends API integration)
