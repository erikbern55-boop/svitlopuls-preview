import fs from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1404,height:1536},deviceScaleFactor:1});
 await page.goto('file://'+process.cwd()+'/index.html',{waitUntil:'load'});
 await page.evaluate(()=>document.fonts.ready);
 const data=await page.evaluate(()=>{
 const root=document.querySelector('.v3');
 if(!root)throw Error('V3 root missing');
 const card=root.getBoundingClientRect();
 const selectors=['.v3-head','.v3-weather','.weather-garden','.weather-moon','.v3-clock','.v3-period','.v3-footer'];
 const blocks=Object.fromEntries(selectors.map(s=>[s,[...document.querySelectorAll(s)].map(el=>{const r=el.getBoundingClientRect();return{x:r.x-card.x,y:r.y-card.y,width:r.width,height:r.height}})]));
 const images=[...root.querySelectorAll('img')].map(el=>({src:el.currentSrc||el.src,loaded:el.complete&&el.naturalWidth>0,width:el.naturalWidth,height:el.naturalHeight}));
 const links=[...root.querySelectorAll('a[href]')].map(el=>el.getAttribute('href'));
 return{card:{width:card.width,height:card.height},blocks,images,links,textLength:root.innerText.length,overflow:{horizontal:root.scrollWidth>root.clientWidth,vertical:root.scrollHeight>root.clientHeight}};
 });
 fs.mkdirSync('artifacts/visual-review',{recursive:true});
 fs.writeFileSync('artifacts/visual-review/geometry.json',JSON.stringify(data,null,2));
 await page.screenshot({path:'artifacts/visual-review/v3-current-1404.png',type:'png',fullPage:false});
 const card=page.locator('.v3');
 await card.screenshot({path:'artifacts/visual-review/v3-card-full.png'});
 if(Math.abs(data.card.width-1404)>2)throw Error('V3 width not 1404: '+data.card.width);
 if(data.images.some(i=>!i.loaded))throw Error('Image did not load: '+JSON.stringify(data.images.filter(i=>!i.loaded)));
 for(const link of ['guide/garden/','guide/moon/','guide/astro/'])if(!data.links.some(h=>h?.includes(link)))throw Error('Guide link missing '+link);
 console.log(JSON.stringify({status:'VISUAL_REVIEW_READY',card:data.card,images:data.images.length,links:data.links.length,verticalOverflow:data.overflow.vertical},null,2));
 if(Math.abs(data.card.height-1536)>2)console.warn('DESIGN_REVIEW_REQUIRED: rendered V3 card height '+data.card.height+' differs from reference 1536');
}finally{await browser.close();}
