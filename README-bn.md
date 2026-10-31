# Extension ছাড়া backend prototype

এটি public production deployment নয়। একই server-browser session-এ official form, user-solved verification/CAPTCHA ও response পরীক্ষা করে। Client browser-এ extension বা browser setting পরিবর্তন লাগে না।

বর্তমান কম্পিউটারে Start-Prototype.cmd চালিয়ে http://127.0.0.1:18740 খুলুন। Node.js এবং Playwright 1.62.1 প্রয়োজন। Bundled Codex runtime পাওয়া গেলে prototype সেটি ব্যবহার করে; অন্য কম্পিউটারে `npm install` এবং `npx playwright install chromium` করুন। Windows-এ default browser executable Microsoft Edge; প্রয়োজনে BROWSER_EXECUTABLE env variable দিন।

App খুললে আলাদা fresh server browser/context নিজে শুরু হয়। Existing Chrome profile/cookie ব্যবহার বা কপি করে না। প্রতি client-এর HttpOnly SameSite session cookie, সর্বোচ্চ ২ session, ১০ মিনিট inactivity expiry। Server শুধু loopback-এ bind করে। কোনো CAPTCHA solve/bypass নেই।

Official দৃশ্যে click ও লেখা পাঠিয়ে user verification করতে পারবেন। Actual dropdown এলে form পূরণ করে তথ্য বসান। CAPTCHA user দেখে লিখবেন। Official popup-এর exact text দেখাবে; OK button native popup dismiss করে। Unknown/error message-কে ফল বা CAPTCHA mismatch বলে ধরে নেয় না।

এই localhost test সফল হলেও cloud-hosted IP, Firefox/Safari/mobile devices, simultaneous users ও production security/load আলাদাভাবে যাচাই করতে হবে। Public hosting করতে authentication, TLS, resource isolation ও abuse protectionসহ server hosting প্রয়োজন; GitHub Pages এই backend চালাতে পারে না। Production-ready দাবি করা হয়নি।
