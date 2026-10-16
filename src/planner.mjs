export const LIMIT=80;
const DAY=1440;
export function minute(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))throw Error('Please review the dates and planning limits.');
 const n=Date.parse(s+'Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,16)!==s)throw Error('Please review the dates and planning limits.');return n/60000;
}
export function money(value){const s=String(value).trim();if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error('Please review the dates and planning limits.');const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n>100000000)throw Error('Please review the dates and planning limits.');return n;}
export function validate(data){
 if(!data||!/^\d{4}-\d{2}-\d{2}$/.test(data.week))throw Error('Please review the dates and planning limits.');
 const start=minute(data.week+'T00:00'),end=start+7*DAY;
 if(!Array.isArray(data.shifts)||data.shifts.length>LIMIT||!Array.isArray(data.blocks)||data.blocks.length>60)throw Error('Please review the dates and planning limits.');
 const ids=new Set();for(const [kind,items]of [['shift',data.shifts],['reserved time',data.blocks]])for(const x of items){
  if(typeof x.id!=='string'||!x.id.trim()||x.id.length>100||ids.has(x.id))throw Error('Please review the dates and planning limits.'+x.id);ids.add(x.id);
  const a=minute(x.start),b=minute(x.end);if(b<=a||a<start||b>end)throw Error(kind+'Please review the dates and planning limits.'+x.id);
  if(kind==='shift'&&(!Number.isSafeInteger(x.payCents)||x.payCents<0||x.payCents>100000000||typeof x.available!=='boolean'))throw Error('Please review the dates and planning limits.'+x.id);
 }
 const c=data.constraints;if(!c||!Number.isSafeInteger(c.minPayCents)||c.minPayCents<0||c.minPayCents>100000000||!Number.isInteger(c.maxMinutes)||c.maxMinutes<0||c.maxMinutes>10080||!Number.isInteger(c.restMinutes)||c.restMinutes<0||c.restMinutes>10080)throw Error('Please review the dates and planning limits.');
 return data;
}
export const signature=data=>JSON.stringify(data);
export function solve(data){
 validate(data);const fingerprint=signature(data),c=data.constraints;
 if(c.confirmed!==true||c.bufferConfirmed!==true)return {status:'needs_confirmation',fingerprint,missing:['Please review the dates and planning limits.']};
 const excluded=[],available=[];
 for(const s of data.shifts){const reasons=[];if(!s.available)reasons.push('Offer unavailable');for(const b of data.blocks)if(minute(s.start)<minute(b.end)&&minute(b.start)<minute(s.end))reasons.push(b.id);if(reasons.length)excluded.push({id:s.id,reasons});else available.push(s);}
 const groups=[...new Set(available.map(s=>s.start.slice(0,10)))].sort().map(day=>available.filter(s=>s.start.startsWith(day)));
 let states=new Map([['0:0',{end:0,minutes:0,payCents:0,ids:[]}]]),transitions=0;
 for(const group of groups){const next=new Map(states);for(const p of states.values())for(const s of group){transitions++;const begin=minute(s.start),end=minute(s.end),duration=end-begin,minutes=p.minutes+duration;if(minutes>c.maxMinutes||(p.ids.length&&begin-p.end<c.restMinutes))continue;const candidate={end,minutes,payCents:p.payCents+s.payCents,ids:[...p.ids,s.id]};const key=end+':'+minutes;const old=next.get(key);if(!old||candidate.payCents>old.payCents)next.set(key,candidate);}states=next;}
 const plans=[...states.values()];const maxPayCents=plans.reduce((n,p)=>Math.max(n,p.payCents),0);const options=plans.filter(p=>p.payCents>=c.minPayCents).sort((a,b)=>a.minutes-b.minutes||b.payCents-a.payCents||a.ids.join().localeCompare(b.ids.join())).slice(0,3);
 return {status:options.length?'feasible':'infeasible',fingerprint,options,maxPayCents,shortfallCents:Math.max(0,c.minPayCents-maxPayCents),excluded,transitions};
}
export function checkPlan(data,ids){
 validate(data);if(!Array.isArray(ids)||new Set(ids).size!==ids.length)return false;const selected=ids.map(id=>data.shifts.find(s=>s.id===id));if(selected.some(s=>!s||!s.available))return false;
 selected.sort((a,b)=>minute(a.start)-minute(b.start));let duration=0,pay=0;const days=new Set();for(let i=0;i<selected.length;i++){const s=selected[i],a=minute(s.start),b=minute(s.end),day=s.start.slice(0,10);if(days.has(day))return false;days.add(day);if(data.blocks.some(x=>a<minute(x.end)&&minute(x.start)<b))return false;if(i&&a-minute(selected[i-1].end)<data.constraints.restMinutes)return false;duration+=b-a;pay+=s.payCents;}return duration<=data.constraints.maxMinutes&&pay>=data.constraints.minPayCents;
}
export function parseCSV(text){
 if(typeof text!=='string'||text.length>100000)throw Error('Please review the dates and planning limits.');text=text.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=ch;continue;}
  if(ch==='"'){if(cell||closed)throw Error('Please review the dates and planning limits.');quoted=true;}else if(ch===','){row.push(cell);cell='';closed=false;}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';closed=false;}else {if(closed)throw Error('Please review the dates and planning limits.');cell+=ch;}}
 if(quoted)throw Error('Please review the dates and planning limits.');row.push(cell);if(row.some(x=>x!==''))rows.push(row);const header=rows.shift();if(!header||header.join(',')!=='id,start,end,pay,available')throw Error('Please review the dates and planning limits.');if(rows.length>LIMIT)throw Error('Please review the dates and planning limits.');
 return rows.map((r,i)=>{if(r.length!==5)throw Error('Please review the dates and planning limits.'+(i+2)+'Please review the dates and planning limits.');if(!['true','false'].includes(r[4].trim()))throw Error('Please review the dates and planning limits.');return {id:r[0].trim(),start:r[1].trim(),end:r[2].trim(),payCents:money(r[3]),available:r[4].trim()==='true'};});
}
export function csv(shifts){const esc=v=>'"'+String(v).replaceAll('"','""')+'"';return 'id,start,end,pay,available\r\n'+shifts.map(s=>[s.id,s.start,s.end,(s.payCents/100).toFixed(2),s.available].map(esc).join(',')).join('\r\n');}
export function calendar(data,result,index=0){
 if(!result||result.fingerprint!==signature(data)||result.status!=='feasible'||!result.options[index]||!checkPlan(data,result.options[index].ids))throw Error('Please review the dates and planning limits.');
 const stamp=s=>new Date((minute(s)-480)*60000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//WorkFit//Proposal//EN','CALSCALE:GREGORIAN'];
 result.options[index].ids.forEach((id,i)=>{const s=data.shifts.find(x=>x.id===id);lines.push('BEGIN:VEVENT','UID:workfit-'+data.week+'-'+i+'-'+Date.now()+'@local.invalid','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+stamp(s.start),'DTEND:'+stamp(s.end),'SUMMARY:PROPOSED WORK SHIFT - NOT APPROVED','STATUS:TENTATIVE','TRANSP:TRANSPARENT','DESCRIPTION:Work proposal only. Employer review required.','END:VEVENT');});return [...lines,'END:VCALENDAR',''].join('\r\n');
}
