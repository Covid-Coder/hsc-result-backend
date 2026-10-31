const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(process.env.USERPROFILE||'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const HOST=process.env.HOST||'127.0.0.1',PORT=Number(process.env.PORT||18740),ORIGIN=process.env.PUBLIC_ORIGIN||`http://127.0.0.1:${PORT}`,OFFICIAL='https://www.educationboardresults.gov.bd';
const hosted=HOST!=='127.0.0.1',originURL=new URL(ORIGIN),MAX_SESSIONS=Number(process.env.MAX_SESSIONS||2);
if(hosted&&originURL.protocol!=='https:')throw Error('Hosted service requires HTTPS PUBLIC_ORIGIN.');
const sessions=new Map(),TTL=10*60*1000,IDLE=2*60*1000;let browser,launching,creating=0;
const starts=[];
const isOfficial=url=>{try{return new URL(url).origin===OFFICIAL;}catch{return false;}};
async function launch(){if(browser)return browser;if(!launching){const executablePath=process.env.BROWSER_EXECUTABLE||(process.platform==='win32'?'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe':undefined);launching=chromium.launch({headless:true,...(executablePath?{executablePath}:{})}).then(b=>{browser=b;b.on('disconnected',()=>{browser=null;});return b;}).finally(()=>{launching=null;});}return launching;}
function json(res,code,data,headers={}){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));}
async function body(req){let size=0,parts=[];for await(const b of req){size+=b.length;if(size>10000)throw Error('Request too large');parts.push(b);}return JSON.parse(Buffer.concat(parts).toString()||'{}');}
function find(req){const id=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('hsc_session='))?.slice(12),s=sessions.get(id);if(s&&(Date.now()-s.created>TTL||Date.now()-s.touched>IDLE)){close(s);return;}return s;}
async function close(s){sessions.delete(s.id);await s.context.close().catch(()=>{});}
async function state(s){
 if(s.startError)return {phase:'connection_error',message:s.startError};
 const url=s.page.url();if(!isOfficial(url))return {phase:'connection_error',message:'Official session অন্য origin-এ চলে গেছে; নতুন session শুরু করুন।',url};
 if(s.dialog)return {phase:'official_response',message:s.dialog.message(),dialog:true,url};
 let dom;try{dom=await s.page.evaluate(()=>({title:document.title,text:document.body?.innerText?.slice(0,16000)||'',options:Object.fromEntries(['exam','year','board'].map(k=>[k,Array.from(document.querySelector('#'+k)?.options||[]).filter(o=>o.value&&!o.disabled).map(o=>({value:o.value,label:o.text}))]))}));}catch{return {phase:'loading',message:'Server browser-এ official পৃষ্ঠা লোড হচ্ছে…',url};}
 const challenge=url.includes('_challenge')||/not a robot|preparing verification|verifying you are|verify you are human/i.test(dom.text);
 return {phase:challenge?'human_verification':(['exam','year','board'].every(k=>dom.options[k].length)?'form':'official_response'),url,title:dom.title,message:challenge?'Server browser-এর human verification নিচের আসল দৃশ্যে নিজে সম্পন্ন করুন।':dom.text,options:dom.options};
}
async function create(){
 if(sessions.size+creating>=MAX_SESSIONS)throw Object.assign(Error('সার্ভার ব্যস্ত। কিছুক্ষণ পরে আবার সংযোগ করুন।'),{status:429});
 const now=Date.now();while(starts.length&&now-starts[0]>60000)starts.shift();if(starts.length>=6)throw Object.assign(Error('সংযোগের চেষ্টা বেশি হয়েছে। এক মিনিট পরে চেষ্টা করুন।'),{status:429});starts.push(now);
 creating++;
 try{
 const b=await launch(),context=await b.newContext({viewport:{width:1100,height:850},acceptDownloads:false});let page;try{page=await context.newPage();}catch(e){await context.close();throw e;}const s={id:crypto.randomBytes(24).toString('hex'),context,page,created:Date.now(),touched:Date.now(),requests:[],dialog:null,locked:false,startError:null};
 sessions.set(s.id,s);page.on('dialog',dialog=>{s.dialog=dialog;});
 try{await page.goto(OFFICIAL+'/',{waitUntil:'domcontentloaded',timeout:30000});}catch(e){s.startError='Official পৃষ্ঠা খুলতে সমস্যা: '+e.message;}
 return s;
 }finally{creating--;}
}
const server=http.createServer(async(req,res)=>{
 try{
  const route=new URL(req.url,ORIGIN).pathname;
  if(req.method==='GET'&&route==='/healthz'){json(res,200,{ok:true});return;}
  if(req.headers.host!==originURL.host){json(res,403,{error:'Invalid host'});return;}
  if(req.method==='POST'&&req.headers.origin!==ORIGIN){json(res,403,{error:'Same-origin action required'});return;}
  if(req.method==='POST'&&route==='/api/session'){
   const old=find(req);if(old){old.touched=Date.now();json(res,200,await state(old));return;}const s=await create();json(res,200,await state(s),{'Set-Cookie':`hsc_session=${s.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=600${hosted?'; Secure':''}`});return;
  }
  if(route.startsWith('/api/')){
   const s=find(req);if(!s){json(res,401,{error:'Session নেই বা মেয়াদ শেষ। নতুন session শুরু করুন।'});return;}
   const now=Date.now();while(s.requests.length&&now-s.requests[0]>60000)s.requests.shift();if(s.requests.length>=120){json(res,429,{error:'অনুরোধ বেশি হয়েছে। এক মিনিট অপেক্ষা করুন।'});return;}s.requests.push(now);
   if(req.method==='GET'&&route==='/api/state'){json(res,200,await state(s));return;}
   if(req.method==='GET'&&route==='/api/frame'){
    if(s.dialog){res.writeHead(409);res.end();return;}const bytes=await s.page.screenshot({type:'jpeg',quality:65,timeout:5000});res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'no-store'});res.end(bytes);return;
   }
   if(req.method==='POST'&&route==='/api/close'){await close(s);json(res,200,{closed:true});return;}
   if(req.method!=='POST'){json(res,404,{error:'Not found'});return;}
   if(s.locked){json(res,429,{error:'একটি action চলছে; অপেক্ষা করুন।'});return;}s.locked=true;s.touched=Date.now();
   try{
    const data=await body(req);
    if(route==='/api/dialog'){if(s.dialog?.type()!=='alert')throw Error('Unexpected dialog; নতুন session শুরু করুন।');await s.dialog.dismiss();s.dialog=null;json(res,200,await state(s));return;}
    if(!isOfficial(s.page.url()))throw Error('Official origin ছাড়া নিয়ন্ত্রণ বন্ধ।');
    if(route==='/api/click'){
     if(!Number.isFinite(data.x)||!Number.isFinite(data.y)||data.x<0||data.x>1100||data.y<0||data.y>850)throw Error('Invalid coordinates');
     await s.page.mouse.click(data.x,data.y);json(res,200,await state(s));return;
    }
    if(route==='/api/key'){
     if(!['Tab','Enter','Backspace','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','Space'].includes(data.key))throw Error('Unsupported key');await s.page.keyboard.press(data.key);json(res,200,await state(s));return;
    }
    if(route==='/api/text'){if(typeof data.text!=='string'||data.text.length>100)throw Error('সর্বোচ্চ ১০০ অক্ষর দিন।');await s.page.keyboard.insertText(data.text);json(res,200,await state(s));return;}
    if(route==='/api/fill'){
     const current=await state(s);if(current.phase!=='form')throw Error('Official form পাওয়া যায়নি। Verification আগে শেষ করুন।');
     for(const k of ['exam','year','board'])if(!current.options[k].some(o=>o.value===data[k]))throw Error(k+' option মেলেনি।');
     if(!/^\d{6}$/.test(data.roll)||!/^\d{10}$/.test(data.registration))throw Error('রোল ৬ ও registration ১০ সংখ্যার দিন।');
     for(const k of ['board','exam','year'])await s.page.locator('#'+k).selectOption(data[k]);await s.page.locator('#result_type').selectOption('1');await s.page.locator('#roll').fill(data.roll);await s.page.locator('#reg').fill(data.registration);
     json(res,200,{...await state(s),filled:true});return;
    }
    if(route==='/api/submit'){
     const current=await state(s);if(current.phase!=='form')throw Error('Official form প্রস্তুত নয়।');
     if(typeof data.captcha!=='string'||!data.captcha.trim()||data.captcha.length>30)throw Error('Official ছবির CAPTCHA নিজে লিখুন।');
     await s.page.locator('#captcha').fill(data.captcha);s.page.locator('#submit').click({noWaitAfter:true,timeout:10000}).catch(e=>{s.actionError=e.message;});json(res,200,{phase:'submitting',message:'Official response-এর জন্য অপেক্ষা চলছে।',url:s.page.url()});return;
    }
    json(res,404,{error:'Not found'});
   }finally{s.locked=false;}return;
  }
  const files={'/':'index.html','/app.js':'app.js'};if(req.method!=='GET'||!files[route]){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':route.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});fs.createReadStream(path.join(__dirname,files[route])).pipe(res);
 }catch(e){json(res,e.status||500,{error:e.message});}
});
setInterval(()=>{for(const s of sessions.values())if(Date.now()-s.created>TTL||Date.now()-s.touched>IDLE)close(s);},10000).unref();
async function shutdown(){for(const s of sessions.values())await close(s);await browser?.close();server.close();process.exit();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
server.listen(PORT,HOST,()=>console.log(`No-extension prototype: ${ORIGIN}\nIsolated fresh server browser per session; no existing cookies copied.`));

