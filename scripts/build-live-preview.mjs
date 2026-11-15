import fs from 'node:fs';
import { buildCardV3Html } from '../src/card-v3.js';

// Isolated visual preview only: NEVER represent these periods as live DTEK data.
const {getShutdownsData,selectScheduleDays,kyivDate}=await import('../src/source.js');
const {loadWeather,weatherForDate}=await import('../src/weather.js');
const {PowerState}=await import('../src/constants.js');
const now=new Date(),date=kyivDate(now),group='GPV1.1';
let schedule=[],source='ДТЕК',status='ДАНІ ДТЕК НЕДОСТУПНІ — ГРАФІК НЕ ПІДТВЕРДЖЕНО';
try {
 const result=await getShutdownsData();
 const day=selectScheduleDays(result.fact,now).find(d=>d.date===date);
 if(!day)throw Error('No current schedule');
 const states=result.fact.data[day.key]?.[group];
 if(!states)throw Error('No group '+group);
 const raw=[];
 for(let hour=0;hour<24;hour++){
  const state=states[hour+1];
  if(!Object.values(PowerState).includes(state))throw Error('Invalid DTEK state for hour '+(hour+1));
  const begin=String(hour).padStart(2,'0')+':00';
  const end=String(hour+1).padStart(2,'0')+':00';
  const half=String(hour).padStart(2,'0')+':30';
  if(state==='yes'||state==='no')raw.push({begin,end,power:state==='yes'});
  else if(state==='second')raw.push({begin,end:half,power:true},{begin:half,end,power:false});
  else raw.push({begin,end:half,power:false},{begin:half,end,power:true});
 }
 // Merge only adjacent periods with identical state; both dial and countdown use this exact array.
 schedule=raw.reduce((acc,p)=>{const prev=acc.at(-1);if(prev&&prev.power===p.power&&prev.end===p.begin)prev.end=p.end;else acc.push({...p});return acc;},[]);
 source=result.source;
 status='АКТУАЛЬНИЙ ГРАФІК · '+source+' · група 1.1 · '+now.toISOString();
}catch(error){console.error('DTEK unavailable:',error.message);source='ДТЕК: недоступно';}
let weather=null,weatherFetchedAt=null;
try{
 const snapshot=await loadWeather({now,file:'artifacts/preview-weather-cache.json'});
 if(snapshot&&!snapshot.stale){weather=weatherForDate(snapshot,date,now);weatherFetchedAt=snapshot.fetchedAt;}
}catch(error){console.warn('Weather unavailable:',error.message);}
let html=buildCardV3Html({schedule,date,weather,source,update:status,now});
// Disable automatic page reload for synthetic content: reloading does NOT fetch new data.
// Remove the original 5-minute reload timer entirely. A previous replacement
// accidentally invoked location.reload() immediately and prevented fit initialization.
html=html.replace(/setInterval\(function\(\)\{if\(document\.visibilityState!=="visible"[\s\S]*?\},300000\);/, '');

const css=`<style id="preview-responsive">
html,body{width:100%!important;min-width:0!important;max-width:100%!important;overflow-x:hidden!important}
body{margin:0!important;background:#020e08!important}
#preview-warning{position:sticky;top:0;z-index:99999;box-sizing:border-box;width:100%;max-width:100vw;background:#661500;color:white;font:700 12px/1.35 system-ui;text-align:center;padding:8px 55px 8px 10px;white-space:normal;overflow-wrap:anywhere}
#preview-stage{width:100%;position:relative;overflow:hidden}
#preview-card{width:1404px;transform-origin:top left;will-change:transform}
#preview-tools{position:fixed;right:9px;bottom:12px;z-index:100000;display:flex;gap:6px}
#preview-tools button{font:700 13px system-ui;border:1px solid #79f88c;border-radius:10px;background:#052516;color:#eaffed;padding:9px 11px;box-shadow:0 0 8px #1a853c}
#preview-stage[data-mode="detail"]{overflow-x:auto;touch-action:pan-x pan-y}
@media(min-width:1404px){#preview-warning{font-size:14px}}
</style>`;
const warning='<aside id="preview-warning" role="status">'+(schedule.length?'ТЕСТОВЕ СЕРЕДОВИЩЕ · ДТЕК: група 1.1 · плановий графік, не датчик напруги':'ТЕСТОВЕ СЕРЕДОВИЩЕ · ДАНІ ДТЕК НЕДОСТУПНІ · НЕ ПЛАНУЙ ВІДКЛЮЧЕННЯ ЗА ЦІЄЮ КАРТКОЮ')+'</aside>';
const tools='<nav id="preview-tools" aria-label="Масштаб картки"><button id="preview-fit" type="button">Умістити</button><button id="preview-detail" type="button">100%</button></nav>';
const js=`<script id="preview-scaling">
(function(){
const stage=document.getElementById('preview-stage'),card=document.getElementById('preview-card');
let mode='fit';
function layout(){
 const w=Math.max(1,stage.clientWidth);
 const scale=mode==='fit'?Math.min(1,w/1404):1;
 card.style.transform='scale('+scale+')';
 stage.style.height=Math.ceil(card.scrollHeight*scale)+'px';
 stage.style.overflowX=mode==='detail'?'auto':'hidden';
 stage.dataset.mode=mode;
 if(mode==='detail'){stage.style.overflowX='auto';stage.style.overflowY='hidden';stage.style.height=card.scrollHeight+'px';}
}
document.getElementById('preview-fit').addEventListener('click',()=>{mode='fit';layout();window.scrollTo({left:0,behavior:'instant'});});
document.getElementById('preview-detail').addEventListener('click',()=>{mode='detail';layout();});
window.addEventListener('resize',layout);
window.addEventListener('orientationchange',()=>requestAnimationFrame(layout));
window.addEventListener('load',layout);
// Poll for a newer published snapshot every five minutes; weather cache is refreshed every 30 min by the build.
setInterval(async()=>{try{const res=await fetch('./index.html?check='+Date.now(),{cache:'no-store'});if(!res.ok)return;const fresh=await res.text();const m=fresh.match(/<meta name="preview-build" content="([^"]+)"/);if(m&&m[1]!==document.querySelector('meta[name="preview-build"]')?.content){location.reload();}}catch(e){}},300000);
if('ResizeObserver' in window)new ResizeObserver(layout).observe(card);
layout();
})();
</script>`;
html=html.replace('</head>',css+'<meta name="preview-build" content="'+now.toISOString()+'"></head>');
html=html.replace(/<body([^>]*)>/i,(_m,attrs)=>'<body'+attrs+'>'+warning+tools+'<div id="preview-stage"><div id="preview-card">');
html=html.replace('</article>','</article></div></div>');
html=html.replace('</body>',js+'</body>');
fs.writeFileSync('index.html',html);
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/sync-audit.json',JSON.stringify({generatedAt:now.toISOString(),date,group,source,scheduleAvailable:schedule.length>0,periods:schedule,weatherAvailable:!!weather,weatherFetchedAt,refresh:{dtekMinutes:5,weatherMinutes:30},mode:'isolated-preview'},null,2)+'\n');
console.log(JSON.stringify({date,source,periods:schedule.length,weather:!!weather,generatedAt:now.toISOString(),mode:'live-source-preview'}));
