import fs from 'node:fs';
import { buildCardV3Html } from '../src/card-v3.js';
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const schedule=[{begin:'00:00',end:'08:00',power:true},{begin:'08:00',end:'12:00',power:false},{begin:'12:00',end:'24:00',power:true}];
let html=buildCardV3Html({schedule,date,weather:null,source:'ТЕСТОВИЙ ПРИКЛАД — НЕ ДАНІ ДТЕК',update:'ТЕСТОВИЙ ПРИКЛАД',now:new Date()});
const banner='<aside id="preview-warning" role="status" style="position:fixed;z-index:99999;top:0;left:0;right:0;background:#661500;color:white;font:700 16px/1.3 system-ui;text-align:center;padding:9px">ТЕСТОВИЙ ПЕРЕГЛЯД · ГРАФІК УМОВНИЙ · НЕ ВИКОРИСТОВУЙ ДЛЯ ПЛАНУВАННЯ ВІДКЛЮЧЕНЬ</aside>';
html=html.replace(/<body([^>]*)>/i,(_m,attrs)=>'<body'+attrs+'>'+banner);
fs.writeFileSync('index.html',html);
console.log('Generated preview using buildCardV3Html; schedule is synthetic, weather is not live.');
