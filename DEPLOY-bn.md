# পরীক্ষামূলক অনলাইন deployment

এই folder আলাদা GitHub repository-তে রাখুন; মূল GitHub Pages folder overwrite করবেন না।

Render-এ New Web Service থেকে public repository URL বেছে Docker runtime ও Free plan ব্যবহার করুন। Dockerfile root-এ রয়েছে। Health check: /healthz।

Hosting-এর Environment settings-এ দিন:

- PUBLIC_ORIGIN: service-এর নির্দিষ্ট HTTPS URL, শেষে slash ছাড়া। উদাহরণ কেবল: https://YOUR-SERVICE.onrender.com
- TEST_USERNAME: পরীক্ষার জন্য নির্ধারিত username
- TEST_PASSWORD: একটি নতুন দীর্ঘ password; এটি source repository বা চ্যাটে লিখবেন না।
- MAX_SESSIONS: 1

Docker image Node 24 ও package.json-এ নির্দিষ্ট Playwright-এর Chromium ইনস্টল করে non-root user দিয়ে server চালায়। PORT hosting থেকে আসে; HOST=0.0.0.0 container-এ নির্ধারিত।

Login-এর পরে app নিজে নতুন isolated browser context তৈরি করে। Official cookie ক্লায়েন্টে আসে না। CAPTCHA মানুষ লিখবে। Browser tab বন্ধ হলে app cookie browser session শেষ হওয়া পর্যন্ত থাকে; server-এর inactive context দশ মিনিট পরে বন্ধ হয়।

যাচাই: /healthz → login → official dropdown → form fill → মানুষ CAPTCHA → native Submit → আসল response। এরপর আলাদা মোবাইল/browser থেকে একই পরীক্ষা। /healthz সফল মানে Chromium বা official সাইট সফল নয়।

এই মেশিনে Docker নেই; container build ও cloud runtime এখনো পরীক্ষা হয়নি। Free hosting-এর memory, cold start ও official anti-bot আচরণের কারণে deployment ব্যর্থ বা ধীর হতে পারে। কোনো paid upgrade স্বয়ংক্রিয়ভাবে বাছবেন না।
