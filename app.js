let incoming={};try{if(location.hash.startsWith('#draft=')){incoming=JSON.parse(decodeURIComponent(location.hash.slice(7)));history.replaceState(null,'',location.pathname);}}catch{}
const $=id=>document.getElementById(id),form=$('data');let working=false,ready=false,frameURL,lastOptions='';
async function request(route,data){const response=await fetch('/api/'+route,{...(data!==undefined?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});const body=await response.json();if(!response.ok)throw Error(body.error||'Request failed');return body;}
function render(state){ready=true;$('status').textContent='অবস্থা: '+state.phase+'\n'+(state.url||'')+'\n'+(state.phase==='form'?'Official form প্রস্তুত। তথ্য বসিয়ে CAPTCHA পূরণ করুন।':(state.message||''));$('dialog').hidden=!state.dialog;if(state.dialog)$('response').textContent=state.message;
 if(state.options&&JSON.stringify(state.options)!==lastOptions){lastOptions=JSON.stringify(state.options);for(const key of ['exam','year','board']){const el=form.elements.namedItem(key),value=el.value;el.replaceChildren(new Option('নির্বাচন করুন',''));for(const option of state.options[key])el.add(new Option(option.label,option.value));const selected=value||incoming[key];if([...el.options].some(o=>o.value===selected))el.value=selected;}}
}
async function frame(){if(!ready||working||$('dialog').hidden===false)return;try{const response=await fetch('/api/frame');if(!response.ok)return;const url=URL.createObjectURL(await response.blob());$('screen').src=url;$('screen').hidden=false;if(frameURL)URL.revokeObjectURL(frameURL);frameURL=url;}catch{}}
async function action(route,data){if(working)return;working=true;try{render(await request(route,data));}catch(e){$('status').textContent=e.message;}finally{working=false;}await frame();}
$('new').onclick=()=>action('session',{});$('refresh').onclick=()=>action('state');$('close').onclick=async()=>{await action('close',{});ready=false;$('screen').hidden=true;$('status').textContent='Session বন্ধ হয়েছে।';};$('ok').onclick=()=>action('dialog',{});
form.onsubmit=event=>{event.preventDefault();if(form.reportValidity())action('fill',Object.fromEntries(new FormData(form)));};
$('submit').onclick=()=>action('submit',{captcha:$('captcha').value});
$('screen').onclick=event=>{const rect=$('screen').getBoundingClientRect();action('click',{x:(event.clientX-rect.left)*1100/rect.width,y:(event.clientY-rect.top)*850/rect.height});};
$('type').onclick=()=>action('text',{text:$('text').value});for(const button of document.querySelectorAll('[data-key]'))button.onclick=()=>action('key',{key:button.dataset.key});
// Screenshots/state are local browser observations; this never reloads or retries the official site.
setInterval(async()=>{if(!ready||working||document.hidden)return;try{render(await request('state'));await frame();}catch{}},3000);
for(const k of ['roll','registration'])if(typeof incoming[k]==='string'&&/^\d{1,10}$/.test(incoming[k]))form.elements.namedItem(k).value=incoming[k];
action('session',{});

