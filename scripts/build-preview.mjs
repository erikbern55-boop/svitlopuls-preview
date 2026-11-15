import fs from 'node:fs';
import { buildCardV3Html } from '../src/card-v3.js';

// Isolated visual preview only: NEVER represent these periods as live DTEK data.
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const schedule=[{begin:'00:00',end:'08:00',power:true},{begin:'08:00',end:'12:00',power:false},{begin:'12:00',end:'24:00',power:true}];
let html=buildCardV3Html({schedule,date,weather:null,source:'ТЕСТОВИЙ ПРИКЛАД — НЕ ДАНІ ДТЕК',update:'ТЕСТОВИЙ ПРИКЛАД',now:new Date()});

// Disable automatic page reload for synthetic content: reloading does NOT fetch new data.
html=html.replace('setInterval(function(){if(document.visibilityState!=="visible"||location.protocol==="about:")return;', '/* Preview: static synthetic data, no automatic refresh */ void function(){if(document.visibilityState!=="visible"||location.protocol==="about:")return;');
html=html.replace('},300000);try{const p=JSON.parse', '}();try{const p=JSON.parse');

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
const warning='<aside id="preview-warning" role="status">ТЕСТОВИЙ ПЕРЕГЛЯД · ГРАФІК УМОВНИЙ · НЕ ВИКОРИСТОВУЙ ДЛЯ ПЛАНУВАННЯ ВІДКЛЮЧЕНЬ</aside>';
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
if('ResizeObserver' in window)new ResizeObserver(layout).observe(card);
layout();
})();
</script>`;
html=html.replace('</head>',css+'</head>');
html=html.replace(/<body([^>]*)>/i,(_m,attrs)=>'<body'+attrs+'>'+warning+tools+'<div id="preview-stage"><div id="preview-card">');
html=html.replace('</article>','</article></div></div>');
html=html.replace('</body>',js+'</body>');
fs.writeFileSync('index.html',html);
console.log('Generated responsive V3 preview: fixed 1404px card scaled to viewport; synthetic schedule, no live weather.');
