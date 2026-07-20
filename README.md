# AllVidExtract

YouTube link daalo → title, description, tags, hashtags, HD thumbnails (multiple sizes), transcript, aur related topic ideas milte hain. Copy buttons har section ke saath hain. Video/audio download nahi karta (platform ToS follow karta hai).

Naye pages: About, Contact, Privacy Policy, Tools, Blog.

## Setup (agar pehli baar chala rahe hain)

```bash
npm install
cp .env.example .env
```
`.env` file mein apni YouTube API key paste karein:
```
YOUTUBE_API_KEY=yahan_apni_key_paste_karein
```

Chalane ke liye:
```bash
npm start
```
Browser mein kholein: http://localhost:3000

## Purani website ko is naye version se replace karna (GitHub + Railway)

1. Apni GitHub repo (`yt-toolkit`) kholein
2. Purani files delete karein (ya seedha overwrite kar dein — "Upload files" karte waqt GitHub khud puchega "replace existing files?")
3. Yeh naye folder ki saari files (root ki files + poora `public` folder) usi tarah upload karein jaise pehli baar ki thi
4. Commit changes karein
5. Railway apne aap naya deploy shuru kar dega (kyunki wahi GitHub repo connected hai) — kuch minute mein naya design live ho jayega
6. Environment variable (`YOUTUBE_API_KEY`) already Railway par set hai, usse chhedne ki zaroorat nahi

Agar chahen to repo ka naam bhi badal kar `allvidextract` rakh sakte hain (Settings → Rename), lekin zaroori nahi — code kaam karega chahe repo ka naam kuch bhi ho.

## Naya domain (website ka apna naam) kharidna — SEO ke liye zaroori

Abhi aapki site ka link kuch aisa hai: `xyz-production.up.railway.app` — yeh lamba aur random hai, Google search mein rank karna mushkil banata hai.

**Behtar yeh hoga:** ek chhota, sirf website ke naam wala domain kharid lein, jaise:
- `allvidextract.com`
- `allvidextract.net`
- `allvidextract.io`

Domain kharidne ki jagah (sasti aur reliable):
- **Namecheap.com** ya **Porkbun.com** (dono par $1-12/year tak ke domains milte hain)

Domain kharidne ke baad, Railway ke "Settings → Networking → Custom Domain" section mein wahi domain add kar dein, aur domain provider ki site par jo DNS records Railway dikhaye, wahi paste kar dein. (Yeh step tab karein jab domain kharid lein — us waqt bata dunga exact steps.)

## SEO (search mein top par aane ke liye) — basic checklist

1. **Content likhein:** Blog page par asli articles likhein jaise "YouTube title kaise banayein", "best tags kaise dhoondein" — jitna zyada useful content, utna behtar rank
2. **Google Search Console** mein site add karein (free): https://search.google.com/search-console — yeh Google ko bataata hai ke aapki site exist karti hai
3. **Sitemap:** Jab site bade ho jaye to sitemap.xml add karna
4. **Backlinks:** Doosri sites/forums (Reddit, Quora, YouTube creator groups) mein apni site ka link genuinely share karein jahan relevant ho
5. **Page speed:** Site already halka/fast hai, yeh plus point hai
6. **Naam search karna:** Kisi doosre browser/incognito mode mein jaake "allvidextract" search karke dekhein ke aata hai ya nahi — shuru mein kuch hafte lag sakte hain Google ko site index karne mein, turant nahi aayega

## Agla step (v2 ideas)
- Facebook/Instagram/TikTok/Telegram video metadata support
- Thumbnail se AI image-prompt generate karna
- Real trending topics (Google Trends API integration)
- Blog articles for SEO traffic
