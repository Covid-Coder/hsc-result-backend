const $=id=>document.getElementById(id),keys=['exam','year','board','roll','registration'];
let incoming={},fresh=false;try{if(location.hash.startsWith('#draft=')){incoming=JSON.parse(decodeURIComponent(location.hash.slice(7)));fresh=true;sessionStorage.setItem('hsc-backend-draft',JSON.stringify(incoming));history.replaceState(null,'',location.pathname);}else incoming=JSON.parse(sessionStorage.getItem('hsc-backend-draft')||'{}');}catch{}
const valid=keys.every(k=>typeof incoming[k]==='string'&&incoming[k])&&/^\d{6}$/.test(incoming.roll)&&/^\d{10}$/.test(incoming.registration);
let ready=false,working=false,filled=false,finished=false,phase='',pictureURL,frameURL,submitting=false,polling=false;
async function request(route,data){const response=await fetch('/api/'+route,{...(data!==undefined?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});const body=await response.json();if(!response.ok){const e=Error(body.error||'সংযোগে সমস্যা হয়েছে।');e.status=response.status;throw e;}return body;}
function error(e){$('status').textContent=e.message;$('retry').hidden=false;if(e.status===401){ready=false;$('captcha-step').hidden=true;$('verification').hidden=true;}}
async function blobPicture(route,id){const response=await fetch('/api/'+route);if(!response.ok)throw Error('ছবি লোড হয়নি। আবার চেষ্টা করুন।');const url=URL.createObjectURL(await response.blob());$(id).src=url;const old=id==='screen'?frameURL:pictureURL;if(old)URL.revokeObjectURL(old);if(id==='screen')frameURL=url;else pictureURL=url;}
async function apply(state){ready=true;phase=state.phase;$('retry').hidden=true;
if(state.phase==='human_verification'||state.phase==='loading'){$('status').textContent=state.phase==='human_verification'?'সরকারি সাইটে যাচাই প্রয়োজন।':'সংযোগ হচ্ছে…';$('verification').hidden=state.phase!=='human_verification';$('captcha-step').hidden=true;return;}
if(state.phase==='connection_error'){throw Error('সরকারি সাইটের সঙ্গে সংযোগ করা যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন।');}
$('verification').hidden=true;
if(state.phase==='official_response'){finished=true;submitting=false;$('captcha-step').hidden=true;$('result').hidden=false;$('result-text').textContent=state.message||'সরকারি সাইট কোনো উত্তর দেয়নি।';$('status').textContent='সরকারি সাইটের উত্তর পাওয়া গেছে।';$('retry-captcha').hidden=!state.dialog;return;}
if(state.phase==='form'){
 if(!filled&&!state.filled){for(const k of ['exam','year','board'])if(!state.options[k]?.some(o=>o.value===incoming[k]))throw Error('আপনার '+k+' সরকারি সাইটের অপশনের সঙ্গে মিলছে না। তথ্য সম্পাদনা করুন।');$('status').textContent='আপনার তথ্য বসানো হচ্ছে…';const result=await request('fill',incoming);filled=true;return apply(result);}
 filled=true;if(submitting){$('status').textContent='ফলাফলের জন্য অপেক্ষা করুন…';return;}
 $('status').textContent='তথ্য বসানো হয়েছে। নিচের CAPTCHA পূরণ করুন।';$('captcha-step').hidden=false;$('result').hidden=true;if(!$('captcha-picture').getAttribute('src'))await blobPicture('captcha','captcha-picture');
}}
async function connect(){if(working)return;working=true;finished=false;submitting=false;filled=false;$('retry').hidden=true;$('result').hidden=true;$('captcha-step').hidden=true;$('status').textContent='সংযোগ হচ্ছে…';try{if(fresh){await request('close',{}).catch(()=>{});fresh=false;}await apply(await request('session',{}));}catch(e){error(e);}finally{working=false;}}
$('retry').onclick=connect;
$('submit').onclick=async()=>{if(working||submitting)return;const captcha=$('captcha').value.trim();if(!captcha){$('captcha').focus();$('status').textContent='ছবিতে দেখা CAPTCHA লিখুন।';return;}working=true;submitting=true;$('submit').disabled=true;try{await request('submit',{captcha});$('status').textContent='ফলাফলের জন্য অপেক্ষা করুন…';}catch(e){submitting=false;error(e);}finally{working=false;$('submit').disabled=false;}};
$('reload-captcha').onclick=async()=>{if(working)return;working=true;try{await request('reload-captcha',{});await blobPicture('captcha','captcha-picture');$('captcha').value='';}catch(e){error(e);}finally{working=false;}};
$('retry-captcha').onclick=async()=>{if(working)return;working=true;try{await request('dialog',{});finished=false;submitting=false;$('captcha').value='';$('captcha-picture').removeAttribute('src');await apply(await request('state'));}catch(e){error(e);}finally{working=false;}};
async function control(route,data){if(working)return;working=true;try{await apply(await request(route,data));}catch(e){error(e);}finally{working=false;}}
$('screen').onclick=e=>{const r=$('screen').getBoundingClientRect();control('click',{x:(e.clientX-r.left)*1100/r.width,y:(e.clientY-r.top)*850/r.height});};
$('type').onclick=()=>control('text',{text:$('verification-text').value});for(const button of document.querySelectorAll('[data-key]'))button.onclick=()=>control('key',{key:button.dataset.key});
$('edit').onclick=()=>{navigator.sendBeacon('/api/close',new Blob(['{}'],{type:'application/json'}));};
setInterval(async()=>{if(!ready||working||finished||polling||document.hidden)return;polling=true;try{await apply(await request('state'));if(phase==='human_verification')await blobPicture('frame','screen');}catch(e){error(e);}finally{polling=false;}},3000);
if(valid){$('summary').textContent=[incoming.exam.toUpperCase(),incoming.year,incoming.board,'রোল: '+incoming.roll,'রেজিস্ট্রেশন: '+incoming.registration].join(' · ');$('summary').hidden=false;connect();}else{$('status').textContent='আগের পৃষ্ঠায় পরীক্ষার তথ্য দিন বা কার্ড আপলোড করুন।';$('edit').textContent='তথ্য দিন / কার্ড আপলোড করুন';}
