import assert from 'node:assert/strict';
import {getShutdownsData,selectScheduleDays,kyivDate} from '../src/source.js';
import {loadWeather,weatherForDate,KHIMIK} from '../src/weather.js';
import {PowerState} from '../src/constants.js';
import {nextPowerEvent} from '../src/countdown.js';
const group='GPV1.1';
const {fact,source}=await getShutdownsData();
const days=selectScheduleDays(fact);
assert(days.length>0,'No current-day DTEK schedule');
const results=[];
for(const day of days){
 const hours=fact.data[day.key]?.[group];
 assert(hours,'Group GPV1.1 missing on '+day.date);
 const periods=[];
 for(let hour=0;hour<24;hour++){
  const state=hours[hour+1];
  assert(Object.values(PowerState).includes(state),'Unknown hour state '+(hour+1));
  const h=String(hour).padStart(2,'0'),next=String(hour+1).padStart(2,'0');
  const half=h+':30';
  if(state==='yes'||state==='no')periods.push({begin:h+':00',end:next+':00',power:state==='yes'});
  else if(state==='second')periods.push({begin:h+':00',end:half,power:true},{begin:half,end:next+':00',power:false});
  else periods.push({begin:h+':00',end:half,power:false},{begin:half,end:next+':00',power:true});
 }
 const event=nextPowerEvent(periods,new Date(),day.date);
 results.push({date:day.date,source,group,periods:periods.length,nextEvent:event??null});
}
const weather=await loadWeather();
assert(weather&&!weather.stale,'Weather stale or missing');
const wx=weatherForDate(weather,kyivDate());
assert(wx&&Number.isFinite(wx.currentNowTemp),'No current weather temperature');
console.log(JSON.stringify({status:'source-validation-only',schedule:results,weather:{source:wx.forecastSource,temperature:wx.currentNowTemp,fetchedAt:weather.fetchedAt,coordinates:KHIMIK},note:'No preview HTML or Telegram production updated'},null,2));
