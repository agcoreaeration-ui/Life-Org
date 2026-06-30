import { useState, useMemo, useEffect, useCallback, useRef } from "react";

const APP_TAGLINE = "Life, organised.";
const APP_COLOR   = "#4f46e5";

const SK = {
  events:    "lifeorg:events",
  garden:    "gardenops:jobs",
  notes:     "lifeorg:notes",
  birthdays: "lifeorg:birthdays",
  settings:  "lifeorg:settings",
  terms:     "lifeorg:terms",
  petInfo:   "lifeorg:petInfo",
};

const DEFAULT_SETTINGS = {
  familyName: "Our Family",
  members: [
    { id:"dad",    name:"Dad",    color:"#3b82f6", emoji:"👨", type:"family" },
    { id:"mum",    name:"Mum",    color:"#ec4899", emoji:"👩", type:"family" },
    { id:"grace",  name:"Grace",  color:"#f59e0b", emoji:"👧", type:"family" },
    { id:"myles",  name:"Myles",  color:"#10b981", emoji:"🧒", type:"family" },
    { id:"marley", name:"Marley", color:"#a16207", emoji:"🐾", type:"pet"    },
  ],
};

const MEMBER_COLORS = ["#3b82f6","#ec4899","#f59e0b","#10b981","#8b5cf6","#ef4444","#14b8a6","#6366f1","#f43f5e","#a16207"];
const MEMBER_EMOJIS = { family:["👨","👩","👧","🧒","👴","👵","🧑","👦","👶"], pet:["🐾","🐕","🐈","🐇","🐠"] };

const TASK_TYPES = [
  { id:"work",        label:"Work",        emoji:"💼", color:"#6366f1" },
  { id:"school",      label:"School",      emoji:"📚", color:"#3b82f6" },
  { id:"sport",       label:"Sport",       emoji:"⚽", color:"#10b981" },
  { id:"bills",       label:"Bills",       emoji:"💳", color:"#f59e0b" },
  { id:"appointment", label:"Appointment", emoji:"🏥", color:"#ef4444" },
  { id:"holiday",     label:"Holiday",     emoji:"✈️", color:"#8b5cf6" },
  { id:"social",      label:"Social",      emoji:"🎉", color:"#ec4899" },
  { id:"errand",      label:"Errand",      emoji:"🛒", color:"#14b8a6" },
  { id:"pet",         label:"Marley 🐾",   emoji:"🐶", color:"#a16207" },
  { id:"birthday",    label:"Birthday",    emoji:"🎂", color:"#f43f5e" },
  { id:"other",       label:"Other",       emoji:"📌", color:"#6b7280" },
];

const PRESET_TASKS = {
  work:        ["Team Meeting","Client Call","Deadline","Conference","Training Day","Work from Home"],
  school:      ["School Drop-off","School Pick-up","Parent-Teacher Night","Sports Day","Excursion","School Concert"],
  sport:       ["Football Training","Swimming Lessons","Gymnastics","Basketball Game","Tennis","Athletics"],
  bills:       ["Electricity Bill","Water Bill","Insurance","Mortgage","Phone Bill","Internet Bill"],
  appointment: ["Doctor","Dentist","Physio","Optometrist","Specialist"],
  holiday:     ["Family Vacation","School Holidays","Long Weekend","Day Trip","Camping","Overseas Trip"],
  social:      ["Birthday Party","Dinner Out","BBQ","Playdate","Family Catch-up"],
  errand:      ["Grocery Shop","Pharmacy","Dry Cleaning","Post Office","Hardware Store"],
  pet:         ["Vet Appointment","Groomer","Daycare","Vaccinations","Flea Treatment","Heartworm Treatment","Walk","Training Class"],
  other:       ["Custom Event"],
};

const RECUR_OPTIONS = [
  { id:"none",       label:"Once" },
  { id:"daily",      label:"Daily" },
  { id:"weekly",     label:"Weekly" },
  { id:"fortnightly",label:"Fortnightly" },
  { id:"monthly",    label:"Monthly" },
  { id:"yearly",     label:"Yearly" },
  { id:"custom",     label:"Custom" },
];

const TERM_COLORS      = ["#dbeafe","#dcfce7","#fef9c3","#fce7f3"];
const TERM_TEXT_COLORS = ["#1d4ed8","#15803d","#a16207","#9d174d"];

const SEED_TERMS = [
  {label:"Term 1",start:"2026-01-28",end:"2026-03-27"},
  {label:"Term 2",start:"2026-04-14",end:"2026-06-26"},
  {label:"Term 3",start:"2026-07-13",end:"2026-09-18"},
  {label:"Term 4",start:"2026-10-05",end:"2026-12-18"},
];

const VIC_HOLIDAYS = {
  "2026-01-01":"New Year's Day","2026-01-26":"Australia Day",
  "2026-03-09":"Labour Day","2026-04-03":"Good Friday",
  "2026-04-04":"Easter Saturday","2026-04-05":"Easter Sunday",
  "2026-04-06":"Easter Monday","2026-04-25":"Anzac Day",
  "2026-06-08":"King's Birthday","2026-11-03":"Melbourne Cup Day",
  "2026-12-25":"Christmas Day","2026-12-26":"Boxing Day",
  "2027-01-01":"New Year's Day","2027-01-26":"Australia Day",
  "2027-03-08":"Labour Day","2027-03-26":"Good Friday",
  "2027-03-28":"Easter Sunday","2027-03-29":"Easter Monday",
  "2027-04-25":"Anzac Day","2027-06-14":"King's Birthday",
  "2027-11-02":"Melbourne Cup Day","2027-12-25":"Christmas Day",
  "2027-12-27":"Boxing Day (substitute)",
};

// ── Pure helpers ──────────────────────────────────────────────────────────────
function fmt(d){if(!d)return"";const dd=d instanceof Date?d:new Date(d);return`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;}
function parseDate(s){const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);}
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function getWeekDays(base){const d=new Date(base),mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));return Array.from({length:7},(_,i)=>addDays(mon,i));}
function fmtTime(t){if(!t)return"";const[h,m]=t.split(":").map(Number);return`${h%12||12}:${String(m).padStart(2,"0")}${h>=12?"pm":"am"}`;}
function addMins(ts,m){const[h,mm]=ts.split(":").map(Number),tot=h*60+mm+m;return`${String(Math.floor(tot/60)%24).padStart(2,"0")}:${String(tot%60).padStart(2,"0")}`;}
function eventOnDate(ev,ds){const end=ev.endDate&&ev.endDate>=ev.date?ev.endDate:ev.date;return ds>=ev.date&&ds<=end;}
function ordinal(n){const s=["th","st","nd","rd"],v=n%100;return s[(v-20)%10]||s[v]||s[0];}
function getBdTitle(bd,y){if(!bd.dob)return`${bd.name}'s Birthday 🎂`;const age=y-parseInt(bd.dob.split("-")[0]);return`${bd.name}'s ${age}${ordinal(age)} Birthday 🎂`;}
function bdThisWeek(ds){return Math.round((parseDate(ds)-new Date())/86400000)>=0&&Math.round((parseDate(ds)-new Date())/86400000)<=7;}

function birthdayEvents(birthdays){
  const y=new Date().getFullYear(),evs=[];
  birthdays.forEach(bd=>{
    if(!bd.dob)return;
    const[,mm,dd]=bd.dob.split("-");
    [y,y+1].forEach(yr=>{
      const ds=`${yr}-${mm}-${dd}`;
      evs.push({id:`bd-${bd.id}-${yr}`,title:getBdTitle(bd,yr),type:"birthday",
        members:bd.memberId?[bd.memberId]:[],date:ds,endDate:ds,
        allDay:true,startTime:"",endTime:"",notes:bd.notes||"",
        recurring:"yearly",isBirthday:true});
    });
  });
  return evs;
}

// ── Recurring event expansion ──────────────────────────────────────────────
// Generates future occurrences of a recurring event for a date window.
// The originally-stored event (ev) acts as the template — only its date/endDate
// shift for each occurrence, everything else (title, members, time...) stays the same.
function expandRecurringEvent(ev, windowStart, windowEnd){
  if(!ev.recurring || ev.recurring === "none") return [ev];

  const occurrences = [];
  const spanDays = ev.endDate && ev.endDate !== ev.date
    ? Math.round((parseDate(ev.endDate) - parseDate(ev.date)) / 86400000)
    : 0;

  let cursor = parseDate(ev.date);
  const winStart = parseDate(windowStart);
  const winEnd   = parseDate(windowEnd);
  let guard = 0; // safety valve against infinite loops

  function stepForward(d){
    const next = new Date(d);
    switch(ev.recurring){
      case "daily":       next.setDate(next.getDate()+1); break;
      case "weekly":      next.setDate(next.getDate()+7); break;
      case "fortnightly": next.setDate(next.getDate()+14); break;
      case "monthly":     next.setMonth(next.getMonth()+1); break;
      case "yearly":      next.setFullYear(next.getFullYear()+1); break;
      case "custom": {
        const n = Math.max(1, parseInt(ev.customInterval)||1);
        if(ev.customUnit==="days")        next.setDate(next.getDate()+n);
        else if(ev.customUnit==="weeks")  next.setDate(next.getDate()+n*7);
        else                              next.setMonth(next.getMonth()+n); // months default
        break;
      }
      default: next.setDate(next.getDate()+7);
    }
    return next;
  }

  // Walk forward from the original date, collecting occurrences inside the window.
  // Cap at 200 iterations as a hard safety limit (covers years of daily events).
  while(cursor <= winEnd && guard < 200){
    if(cursor >= winStart){
      const ds = fmt(cursor);
      const endDs = spanDays>0 ? fmt(addDays(cursor, spanDays)) : ds;
      occurrences.push({
        ...ev,
        id: cursor.getTime()===parseDate(ev.date).getTime() ? ev.id : `${ev.id}-r${fmt(cursor)}`,
        date: ds,
        endDate: endDs,
        isRecurrenceInstance: cursor.getTime()!==parseDate(ev.date).getTime(),
      });
    }
    cursor = stepForward(cursor);
    guard++;
  }

  return occurrences;
}

// Expand a whole list of events across a date window (used for week view etc.)
function expandEventsForWindow(events, windowStart, windowEnd){
  const out=[];
  events.forEach(ev=>{
    if(!ev.recurring || ev.recurring==="none"){ out.push(ev); return; }
    out.push(...expandRecurringEvent(ev, windowStart, windowEnd));
  });
  return out;
}

function generateICal(events,birthdays,terms,name){
  const lines=["BEGIN:VCALENDAR","VERSION:2.0",`PRODID:-//LifeOrg//${name}//EN`,
    `X-WR-CALNAME:${name} — Life Org`,"CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  function icalDate(ds,time){const c=ds.replace(/-/g,"");return time?`${c}T${time.replace(/:/g,"")}00`:c;}
  [...events,...birthdayEvents(birthdays)].forEach(ev=>{
    lines.push("BEGIN:VEVENT",`UID:${ev.id}@lifeorg`,`SUMMARY:${ev.title}`);
    if(ev.allDay||!ev.startTime){lines.push(`DTSTART;VALUE=DATE:${ev.date.replace(/-/g,"")}`);lines.push(`DTEND;VALUE=DATE:${fmt(addDays(parseDate(ev.endDate||ev.date),1)).replace(/-/g,"")}`);}
    else{lines.push(`DTSTART:${icalDate(ev.date,ev.startTime)}`);lines.push(`DTEND:${icalDate(ev.date,ev.endTime||addMins(ev.startTime,60))}`);}
    if(ev.notes)lines.push(`DESCRIPTION:${ev.notes.replace(/\n/g,"\\n")}`);
    const rm={yearly:"YEARLY",weekly:"WEEKLY",monthly:"MONTHLY",daily:"DAILY"};
    if(rm[ev.recurring])lines.push(`RRULE:FREQ=${rm[ev.recurring]}`);
    lines.push("END:VEVENT");
  });
  terms.forEach((term,i)=>{if(!term.start||!term.end)return;lines.push("BEGIN:VEVENT",`UID:term-${i}@lifeorg`,`SUMMARY:📚 ${term.label}`,`DTSTART;VALUE=DATE:${term.start.replace(/-/g,"")}`,`DTEND;VALUE=DATE:${fmt(addDays(parseDate(term.end),1)).replace(/-/g,"")}`,`END:VEVENT`);});
  Object.entries(VIC_HOLIDAYS).forEach(([ds,n])=>{lines.push("BEGIN:VEVENT",`UID:ph-${ds}@lifeorg`,`SUMMARY:🏖️ ${n}`,`DTSTART;VALUE=DATE:${ds.replace(/-/g,"")}`,`DTEND;VALUE=DATE:${fmt(addDays(parseDate(ds),1)).replace(/-/g,"")}`,`END:VEVENT`);});
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
function downloadICal(ical,filename){const blob=new Blob([ical],{type:"text/calendar;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}

const today=fmt(new Date());
const td=n=>fmt(addDays(new Date(),n));

const SEED_EVENTS=[
  {id:1,title:"School Drop-off",  type:"school",      members:["mum","grace","myles"],date:today,endDate:today,allDay:false,startTime:"08:30",endTime:"08:45",notes:"",recurring:"none"},
  {id:2,title:"Football Training",type:"sport",       members:["dad","myles"],        date:td(1),endDate:td(1),allDay:false,startTime:"17:00",endTime:"18:00",notes:"",recurring:"none"},
  {id:3,title:"Dentist",          type:"appointment", members:["grace"],              date:td(2),endDate:td(2),allDay:false,startTime:"10:00",endTime:"10:30",notes:"Grace's check-up",recurring:"none"},
  {id:4,title:"Team Meeting",     type:"work",        members:["dad"],               date:td(1),endDate:td(1),allDay:false,startTime:"09:00",endTime:"10:00",notes:"",recurring:"none"},
  {id:5,title:"Electricity Bill", type:"bills",       members:["mum"],               date:td(4),endDate:td(4),allDay:true, startTime:"",    endTime:"",    notes:"$180 due",recurring:"none"},
  {id:6,title:"Family Vacation",  type:"holiday",     members:["all"],               date:td(5),endDate:td(10),allDay:true,startTime:"",    endTime:"",    notes:"Gold Coast 🌊",recurring:"none"},
  {id:7,title:"Marley — Groomer", type:"pet",         members:["marley","mum"],      date:td(3),endDate:td(3),allDay:false,startTime:"09:00",endTime:"10:00",notes:"Full groom + nail trim",recurring:"none"},
];
const SEED_BIRTHDAYS=[
  {id:"bd1",name:"Dad",   memberId:"dad",   dob:"1980-03-15",notes:"",category:"family"},
  {id:"bd2",name:"Mum",   memberId:"mum",   dob:"1982-07-22",notes:"",category:"family"},
  {id:"bd3",name:"Grace", memberId:"grace", dob:"2012-11-08",notes:"",category:"family"},
  {id:"bd4",name:"Myles", memberId:"myles", dob:"2015-04-30",notes:"",category:"family"},
  {id:"bd5",name:"Marley",memberId:"marley",dob:"2021-09-14",notes:"Puppy birthday 🐾",category:"family"},
];
const SEED_NOTES=[
  {id:"n1",text:"Grace needs new school shoes 👟",createdAt:today,pinned:true},
  {id:"n2",text:"Myles permission slip due Friday 📝",createdAt:today,pinned:false},
  {id:"n3",text:"Marley's flea treatment due next month 💊",createdAt:today,pinned:false},
];
const blankForm=(pre)=>({id:null,type:null,title:"",customTitle:false,members:[],date:pre||today,endDate:pre||today,allDay:false,startTime:"",endTime:"",notes:"",location:"",recurring:"none",customInterval:1,customUnit:"months",bdName:"",bdDob:"",bdCategory:"friend",bdMemberId:""});

const s_lbl={fontSize:12,fontWeight:700,color:"#6b7280",letterSpacing:0.5,textTransform:"uppercase",display:"block",marginBottom:8};
const s_inp={width:"100%",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"10px 12px",fontSize:14,outline:"none",boxSizing:"border-box",background:"#fff"};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS — all outside LifeOrg so inputs never lose focus on re-render
// ─────────────────────────────────────────────────────────────────────────────

function EventPill({ev,dateStr,members,expandedEv,setExpandedEv,openEdit,confirmDelete}){
  const type=TASK_TYPES.find(t=>t.id===ev.type);
  const isMulti=ev.endDate&&ev.endDate!==ev.date;
  const isFirst=ev.date===dateStr;
  const isBd=ev.isBirthday;
  const exp=expandedEv===ev.id+dateStr;
  const allM=[{id:"all",name:"Everyone",color:APP_COLOR,emoji:"👨‍👩‍👧‍👦",type:"family"},...members];
  const evMs=ev.members.includes("all")?members:ev.members.map(id=>allM.find(m=>m.id===id)).filter(Boolean);
  const borderColor=isBd?"#f43f5e":evMs.length===1?evMs[0].color:(type?.color||APP_COLOR);
  const isUpcoming=isBd&&bdThisWeek(ev.date);
  return(
    <div onClick={()=>setExpandedEv(exp?null:ev.id+dateStr)} style={{background:"#fff",borderRadius:12,marginBottom:6,overflow:"hidden",borderLeft:`3px solid ${borderColor}`,boxShadow:isUpcoming?"0 0 0 2px #fbbf24,0 2px 6px rgba(0,0,0,0.08)":"0 1px 3px rgba(0,0,0,0.07)",cursor:"pointer",opacity:isFirst?1:0.72}}>
      <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20,flexShrink:0}}>{isBd?"🎂":type?.emoji}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1f1535",marginBottom:2,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
            {ev.title}
            {isUpcoming&&<span style={{fontSize:9,background:"#fef3c7",color:"#92400e",borderRadius:6,padding:"2px 6px",fontWeight:800}}>THIS WEEK 🎉</span>}
            {isMulti&&<span style={{fontSize:10,background:(type?.color||APP_COLOR)+"18",color:type?.color,borderRadius:6,padding:"1px 6px",fontWeight:700}}>{isFirst?`→ ${parseDate(ev.endDate).toLocaleDateString("en-AU",{day:"numeric",month:"short"})}`:"cont."}</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            {ev.allDay?<span style={{fontSize:11,color:"#6b7280",fontWeight:600}}>All day</span>:ev.startTime&&<span style={{fontSize:11,color:"#6b7280",fontWeight:600}}>🕐 {fmtTime(ev.startTime)}{ev.endTime?` – ${fmtTime(ev.endTime)}`:""}</span>}
            <div style={{display:"flex"}}>{evMs.map(m=><span key={m.id} title={m.name} style={{width:18,height:18,borderRadius:"50%",background:m.color+"25",border:`1.5px solid ${m.color}`,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",marginRight:-3}}>{m.emoji}</span>)}</div>
          </div>
        </div>
        <span style={{color:"#d1d5db",fontSize:11,flexShrink:0}}>{exp?"▲":"▼"}</span>
      </div>
      {exp&&(
        <div style={{padding:"0 12px 12px",borderTop:"1px solid #f3f4f6"}}>
          {ev.location&&<p style={{fontSize:12,color:"#6b7280",margin:"8px 0 4px",display:"flex",alignItems:"center",gap:5}}>📍 {ev.location}</p>}
          {ev.notes&&<p style={{fontSize:12,color:"#6b7280",margin:"8px 0 4px"}}>{ev.notes}</p>}
          {isMulti&&<p style={{fontSize:11,color:"#9ca3af",margin:"4px 0"}}>{parseDate(ev.date).toLocaleDateString("en-AU",{day:"numeric",month:"short"})} → {parseDate(ev.endDate).toLocaleDateString("en-AU",{day:"numeric",month:"short"})}</p>}
          {ev.recurring!=="none"&&<p style={{fontSize:11,color:"#9ca3af",margin:"4px 0"}}>🔁 {ev.recurring==="custom"?`Every ${ev.customInterval||1} ${ev.customUnit||"months"}`:RECUR_OPTIONS.find(r=>r.id===ev.recurring)?.label}{ev.isRecurrenceInstance&&" · this is a repeat"}</p>}
          {!isBd&&<div style={{display:"flex",gap:8,marginTop:8,alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={e=>{e.stopPropagation();openEdit(ev);}} style={{background:"#f3f4ff",border:"none",borderRadius:8,color:APP_COLOR,fontSize:12,fontWeight:700,padding:"6px 14px",cursor:"pointer"}}>✏️ {ev.isRecurrenceInstance?"Edit series":"Edit"}</button>
            <button onClick={e=>{e.stopPropagation();confirmDelete(ev.id,ev.title,ev);}} style={{background:"#fef2f2",border:"none",borderRadius:8,color:"#ef4444",fontSize:12,fontWeight:700,padding:"6px 14px",cursor:"pointer"}}>🗑 {ev.isRecurrenceInstance?"Delete series":"Delete"}</button>
            {ev.isRecurrenceInstance&&<span style={{fontSize:10,color:"#9ca3af"}}>Edits apply to the whole series</span>}
          </div>}
        </div>
      )}
    </div>
  );
}

function GardenPill({job}){
  const [exp,setExp]=useState(false);
  const SC={scheduled:"#16a34a","in-progress":"#f59e0b",completed:"#10b981",pending:"#6b7280",cancelled:"#ef4444"};
  const sc=SC[job.status]||"#16a34a";
  return(
    <div onClick={()=>setExp(e=>!e)} style={{background:"#f0fdf4",borderRadius:12,marginBottom:6,overflow:"hidden",borderLeft:"3px solid #16a34a",boxShadow:"0 1px 3px rgba(0,0,0,0.05)",cursor:"pointer"}}>
      <div style={{padding:"9px 12px",display:"flex",alignItems:"center",gap:9}}>
        <span style={{fontSize:18,flexShrink:0}}>🌿</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#14532d",marginBottom:1}}>{job.title||"Garden Job"}</div>
          <div style={{fontSize:11,color:"#166534",fontWeight:500}}>👤 {job.client}{job.hours>0&&<span style={{marginLeft:6,color:"#6b7280"}}>{job.hours}h</span>}{job.price>0&&<span style={{marginLeft:6,color:"#16a34a",fontWeight:700}}>${job.price}</span>}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          <span style={{fontSize:9,fontWeight:700,borderRadius:6,padding:"2px 7px",background:sc+"20",color:sc}}>{job.status||"scheduled"}</span>
          <span style={{fontSize:9,color:"#9ca3af"}}>Garden Ops</span>
        </div>
      </div>
      {exp&&job.notes&&<div style={{padding:"0 12px 10px",borderTop:"1px solid #dcfce7"}}><p style={{fontSize:12,color:"#166534",margin:"7px 0 0"}}>{job.notes}</p></div>}
    </div>
  );
}

function DeleteModal({item,onCancel,onConfirm}){
  if(!item)return null;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:70,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 30px"}}>
      <div style={{background:"#fff",borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:340,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{fontSize:40,marginBottom:12}}>🗑️</div>
        <div style={{fontSize:17,fontWeight:800,color:"#1f1535",marginBottom:8}}>Delete event?</div>
        <div style={{fontSize:14,color:"#6b7280",marginBottom:24}}>"<span style={{fontWeight:600,color:"#374151"}}>{item.title}</span>" will be permanently removed</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,background:"#f3f4f6",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",color:"#374151"}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:1,background:"linear-gradient(135deg,#ef4444,#dc2626)",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",color:"#fff"}}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function BdModal({bdForm,setBdForm,onClose,onSave,members}){
  if(!bdForm)return null;
  const valid=bdForm.name&&bdForm.dob;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:60,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:"#fff",width:"100%",maxWidth:480,margin:"0 auto",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:800,color:"#1f1535"}}>🎂 Birthday</div>
          <button onClick={onClose} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{marginBottom:14}}><label style={s_lbl}>Name</label><input value={bdForm.name||""} onChange={e=>setBdForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Uncle Luke" style={s_inp}/></div>
        <div style={{marginBottom:14}}>
          <label style={s_lbl}>Relationship</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[{id:"family",l:"Family",e:"🏠"},{id:"friend",l:"Friend",e:"👥"},{id:"work",l:"Work",e:"💼"},{id:"other",l:"Other",e:"📌"}].map(c=><button key={c.id} onClick={()=>setBdForm(f=>({...f,category:c.id}))} style={{background:(bdForm.category||"friend")===c.id?"#f43f5e":"#fff",color:(bdForm.category||"friend")===c.id?"#fff":"#374151",border:`1.5px solid ${(bdForm.category||"friend")===c.id?"#f43f5e":"#e5e7eb"}`,borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{c.e} {c.l}</button>)}</div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={s_lbl}>Family member <span style={{fontWeight:400,fontSize:11,textTransform:"none"}}>(optional)</span></label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setBdForm(f=>({...f,memberId:""}))} style={{background:!bdForm.memberId?"#f3f4f6":"#fff",color:"#374151",border:`1.5px solid ${!bdForm.memberId?"#6b7280":"#e5e7eb"}`,borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>None</button>
            {members.map(m=><button key={m.id} onClick={()=>setBdForm(f=>({...f,memberId:m.id}))} style={{background:bdForm.memberId===m.id?m.color:"#fff",color:bdForm.memberId===m.id?"#fff":"#374151",border:`1.5px solid ${bdForm.memberId===m.id?m.color:"#e5e7eb"}`,borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{m.emoji} {m.name}</button>)}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={s_lbl}>Date of birth</label>
          <input type="date" value={bdForm.dob||""} onChange={e=>setBdForm(f=>({...f,dob:e.target.value}))} style={s_inp}/>
          {bdForm.dob&&bdForm.name&&<div style={{fontSize:12,color:APP_COLOR,fontWeight:600,marginTop:6}}>Will show as: "{getBdTitle({name:bdForm.name,dob:bdForm.dob},new Date().getFullYear())}"</div>}
        </div>
        <div style={{marginBottom:24}}><label style={s_lbl}>Notes (optional)</label><input value={bdForm.notes||""} onChange={e=>setBdForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Surprise party planned!" style={s_inp}/></div>
        <button onClick={onSave} disabled={!valid} style={{width:"100%",background:!valid?"#e5e7eb":"linear-gradient(135deg,#f43f5e,#e11d48)",color:!valid?"#9ca3af":"#fff",border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,cursor:"pointer"}}>Save Birthday</button>
      </div>
    </div>
  );
}

function NotesView({notes,setNotes,onDeleteNote}){
  const [newNote,setNewNote]=useState("");
  function addNote(){if(!newNote.trim())return;setNotes(p=>[{id:Date.now(),text:newNote.trim(),createdAt:today,pinned:false},...p]);setNewNote("");}
  const sorted=[...notes].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||(b.createdAt||"").localeCompare(a.createdAt||""));
  return(
    <div style={{padding:"12px 20px 20px"}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1f1535",marginBottom:14}}>📝 Notes & Reminders</div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()} placeholder="Add a note or reminder..." style={{flex:1,border:"1.5px solid #e5e7eb",borderRadius:10,padding:"10px 12px",fontSize:14,outline:"none"}}/>
        <button onClick={addNote} style={{background:APP_COLOR,color:"#fff",border:"none",borderRadius:10,padding:"10px 16px",fontWeight:700,cursor:"pointer",fontSize:14}}>+</button>
      </div>
      {sorted.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"#9ca3af"}}><div style={{fontSize:40,marginBottom:10}}>📝</div><div style={{fontSize:14,fontWeight:600}}>No notes yet</div><div style={{fontSize:12,marginTop:4}}>Add a quick reminder above</div></div>}
      {sorted.map(n=>(
        <div key={n.id} style={{background:n.pinned?"#faf5ff":"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8,border:n.pinned?"1.5px solid #c4b5fd":"1.5px solid #f3f4f6",boxShadow:"0 1px 3px rgba(0,0,0,0.05)",display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{n.pinned?"📌":"📝"}</span>
          <div style={{flex:1,fontSize:14,color:"#1f1535",lineHeight:1.5}}>{n.text}</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
            <button onClick={()=>setNotes(p=>p.map(nn=>nn.id===n.id?{...nn,pinned:!nn.pinned}:nn))} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:n.pinned?"#7c3aed":"#d1d5db"}}>📌</button>
            <button onClick={()=>{setNotes(p=>p.filter(nn=>nn.id!==n.id));onDeleteNote&&onDeleteNote(n.id);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:"#d1d5db"}}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarleyView({allEvents,petMember,setView,setForm,petInfo,setPetInfo}){
  const pet=petMember||{name:"Marley",emoji:"🐾",color:"#a16207",id:"marley"};
  const petEvs=useMemo(()=>{
    const windowEnd=fmt(addDays(new Date(),90));
    const expanded=expandEventsForWindow(allEvents, today, windowEnd);
    return expanded.filter(ev=>ev.members.includes(pet.id)&&ev.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,10);
  },[allEvents,pet.id]);
  return(
    <div style={{padding:"12px 20px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,background:"linear-gradient(135deg,#fef3c7,#fde68a)",borderRadius:16,padding:"14px 16px"}}>
        <span style={{fontSize:40}}>{pet.emoji}</span>
        <div><div style={{fontSize:18,fontWeight:800,color:"#78350f"}}>{pet.name}</div><div style={{fontSize:13,color:"#92400e",fontWeight:500}}>Mini Groodle</div></div>
      </div>
      <div style={{background:"#fff",borderRadius:14,padding:"14px 16px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <div style={{fontSize:11,fontWeight:800,color:"#6b7280",letterSpacing:0.5,textTransform:"uppercase",marginBottom:12}}>Profile</div>
        {[{key:"vet",label:"Vet clinic",ph:"e.g. Paws Vet Clinic"},{key:"groomer",label:"Groomer",ph:"e.g. Doggy Styles"},{key:"nextVac",label:"Next vaccination",ph:"YYYY-MM-DD"},{key:"nextFlea",label:"Next flea treatment",ph:"YYYY-MM-DD"}].map(f=>(
          <div key={f.key} style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:3,textTransform:"uppercase",letterSpacing:0.4}}>{f.label}</div>
            <input value={petInfo[f.key]||""} onChange={e=>setPetInfo(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph} style={{width:"100%",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
      </div>
      <div style={{background:"#fff",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <div style={{fontSize:11,fontWeight:800,color:"#6b7280",letterSpacing:0.5,textTransform:"uppercase",marginBottom:12}}>Upcoming</div>
        {petEvs.length===0?<div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:"20px 0"}}><div style={{fontSize:32,marginBottom:8}}>🐾</div>No upcoming events for {pet.name}</div>
          :petEvs.map(ev=>{const away=Math.round((parseDate(ev.date)-new Date())/86400000);const type=TASK_TYPES.find(tt=>tt.id===ev.type);return(
            <div key={ev.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f9fafb"}}>
              <span style={{fontSize:18}}>{type?.emoji||"📌"}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#1f1535"}}>{ev.title}</div><div style={{fontSize:11,color:"#6b7280"}}>{parseDate(ev.date).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"})}{ev.startTime&&` · ${fmtTime(ev.startTime)}`}</div></div>
              <span style={{fontSize:10,fontWeight:700,color:away===0?"#ef4444":away<=3?"#f59e0b":"#10b981"}}>{away===0?"Today":away===1?"Tomorrow":`${away}d`}</span>
            </div>
          );})}
        <button onClick={()=>{setForm({...blankForm(),type:"pet",members:pet.id?[pet.id]:[]});setView("add");}} style={{marginTop:12,width:"100%",background:"#fef3c7",color:"#92400e",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Book {pet.name} an appointment</button>
      </div>
    </div>
  );
}

function BirthdaysView({birthdays,setBirthdays,upcomingBds,setBdForm,setShowBdForm,onDeleteBirthday}){
  return(
    <div style={{padding:"12px 20px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:"#1f1535"}}>🎂 Birthdays</div>
        <button onClick={()=>{setBdForm({name:"",memberId:"",category:"friend",dob:"",notes:""});setShowBdForm(true);}} style={{background:"#f43f5e",color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add</button>
      </div>
      {upcomingBds.length>0&&<div style={{background:"linear-gradient(135deg,#fef3c7,#fde68a)",borderRadius:12,padding:"12px 14px",marginBottom:14,border:"1px solid #fcd34d"}}><div style={{fontSize:11,fontWeight:800,color:"#92400e",marginBottom:6}}>🎉 COMING UP THIS WEEK</div>{upcomingBds.map(b=><div key={b.id} style={{fontSize:13,color:"#78350f",fontWeight:600,marginBottom:2}}>{b.title}</div>)}</div>}
      {birthdays.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"#9ca3af"}}><div style={{fontSize:40,marginBottom:10}}>🎂</div><div style={{fontSize:14,fontWeight:600}}>No birthdays added yet</div><div style={{fontSize:12,marginTop:4}}>Tap + Add to get started</div></div>}
      {["family","friend","work","other"].map(cat=>{
        const bds=birthdays.filter(b=>(b.category||"friend")===cat);
        if(!bds.length)return null;
        return(
          <div key={cat} style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:800,color:"#6b7280",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8}}>{{family:"🏠 Family",friend:"👥 Friends",work:"💼 Work",other:"📌 Other"}[cat]}</div>
            {bds.slice().sort((a,b)=>(a.dob?a.dob.slice(5):"99").localeCompare(b.dob?b.dob.slice(5):"99")).map(bd=>{
              const age=bd.dob?new Date().getFullYear()-parseInt(bd.dob.split("-")[0]):null;
              const mmdd=bd.dob?bd.dob.slice(5):"";
              const ty=bd.dob?`${new Date().getFullYear()}-${mmdd}`:"";
              const next=ty&&ty<today?`${new Date().getFullYear()+1}-${mmdd}`:ty;
              const away=next?Math.round((parseDate(next)-new Date())/86400000):null;
              return(
                <div key={bd.id} style={{background:"#fff",borderRadius:12,padding:"11px 14px",marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",borderLeft:away!==null&&away<=7?"3px solid #f43f5e":"3px solid #f3f4f6",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:24,flexShrink:0}}>🎂</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#1f1535"}}>{bd.name}</div>
                    {bd.dob&&<div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{parseDate(bd.dob).toLocaleDateString("en-AU",{day:"numeric",month:"long"})}{age!==null&&` · Turns ${age+1}`}</div>}
                    {bd.notes&&<div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{bd.notes}</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    {away!==null&&away<=30&&<span style={{fontSize:10,fontWeight:800,color:away<=7?"#f43f5e":"#f59e0b"}}>{away===0?"🎉 Today!":away===1?"Tomorrow":`In ${away}d`}</span>}
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>{setBdForm({...bd});setShowBdForm(true);}} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:14}}>✏️</button>
                      <button onClick={()=>{setBirthdays(p=>p.filter(b=>b.id!==bd.id));onDeleteBirthday&&onDeleteBirthday(bd.id);}} style={{background:"none",border:"none",color:"#fca5a5",cursor:"pointer",fontSize:14}}>✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function SettingsView({settings,setSettings,terms,setTerms,onExport,showToast}){
  const [ls,setLs]=useState(()=>settings);
  const [lt,setLt]=useState(()=>terms);
  const [saved,setSaved]=useState(false);
  const [nm,setNm]=useState({name:"",emoji:"🧑",color:MEMBER_COLORS[0],type:"family"});
  useEffect(()=>setLs(settings),[settings]);
  useEffect(()=>setLt(terms),[terms]);
  function saveAll(){setSettings(ls);setTerms(lt);setSaved(true);showToast("✅ Settings saved!");setTimeout(()=>setSaved(false),2000);}
  function addMem(){if(!nm.name.trim())return;setLs(s=>({...s,members:[...s.members,{...nm,id:nm.name.toLowerCase().replace(/\s+/g,"-")+"-"+Date.now()}]}));setNm({name:"",emoji:"🧑",color:MEMBER_COLORS[0],type:"family"});}
  function Sec({title,children}){return<div style={{marginBottom:20}}><div style={{fontSize:12,fontWeight:800,color:"#374151",letterSpacing:0.5,textTransform:"uppercase",marginBottom:10}}>{title}</div><div style={{background:"#fff",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>{children}</div></div>;}
  return(
    <div style={{padding:"12px 20px 30px"}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1f1535",marginBottom:20}}>⚙️ Settings</div>
      <Sec title="App name">
        <input value={ls.familyName} onChange={e=>setLs(s=>({...s,familyName:e.target.value}))} placeholder="e.g. The Smiths" style={s_inp}/>
        <div style={{fontSize:11,color:"#9ca3af",marginTop:6}}>Shown in the header and on exported calendars</div>
      </Sec>
      <Sec title="Family members">
        {ls.members.map(m=>(
          <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:m.color+"20",border:`2px solid ${m.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{m.emoji}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#1f1535"}}>{m.name}</div><div style={{fontSize:10,color:"#9ca3af"}}>{m.type}</div></div>
            <input value={m.name} onChange={e=>setLs(s=>({...s,members:s.members.map(mm=>mm.id===m.id?{...mm,name:e.target.value}:mm)}))} style={{...s_inp,width:90,padding:"6px 10px",fontSize:13}}/>
            <button onClick={()=>setLs(s=>({...s,members:s.members.filter(mm=>mm.id!==m.id)}))} style={{background:"none",border:"none",color:"#fca5a5",cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>
          </div>
        ))}
        <div style={{marginTop:12,padding:"12px",background:"#f9fafb",borderRadius:10}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:8,textTransform:"uppercase",letterSpacing:0.4}}>Add member</div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <input value={nm.name} onChange={e=>setNm(n=>({...n,name:e.target.value}))} placeholder="Name" style={{...s_inp,flex:1,padding:"8px 10px",fontSize:13}}/>
            <select value={nm.emoji} onChange={e=>setNm(n=>({...n,emoji:e.target.value}))} style={{border:"1.5px solid #e5e7eb",borderRadius:8,padding:"6px 8px",fontSize:16,outline:"none"}}>{[...MEMBER_EMOJIS.family,...MEMBER_EMOJIS.pet].map(e=><option key={e} value={e}>{e}</option>)}</select>
            <select value={nm.type} onChange={e=>setNm(n=>({...n,type:e.target.value}))} style={{border:"1.5px solid #e5e7eb",borderRadius:8,padding:"6px 8px",fontSize:12,outline:"none"}}><option value="family">Family</option><option value="pet">Pet</option></select>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{MEMBER_COLORS.map(c=><button key={c} onClick={()=>setNm(n=>({...n,color:c}))} style={{width:24,height:24,borderRadius:"50%",background:c,border:nm.color===c?"3px solid #1f1535":"2px solid transparent",cursor:"pointer"}}/>)}</div>
          <button onClick={addMem} style={{width:"100%",background:APP_COLOR,color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add</button>
        </div>
      </Sec>
      <Sec title="📚 School Terms (VIC 2026)">
        <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Set once per year — shades your calendar automatically</div>
        {lt.map((term,i)=>(
          <div key={i} style={{marginBottom:12,background:"#f9fafb",borderRadius:10,padding:"10px 12px",borderLeft:`3px solid ${["#3b82f6","#10b981","#f59e0b","#ec4899"][i%4]}`}}>
            <input value={term.label} onChange={e=>setLt(ts=>ts.map((tt,j)=>j===i?{...tt,label:e.target.value}:tt))} style={{border:"none",background:"transparent",fontSize:12,fontWeight:700,color:"#374151",outline:"none",width:"100%",marginBottom:8}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div style={{fontSize:10,color:"#9ca3af",marginBottom:3,fontWeight:600}}>Start</div><input type="date" value={term.start} onChange={e=>setLt(ts=>ts.map((tt,j)=>j===i?{...tt,start:e.target.value}:tt))} style={{...s_inp,fontSize:12,padding:"7px 10px"}}/></div>
              <div><div style={{fontSize:10,color:"#9ca3af",marginBottom:3,fontWeight:600}}>End</div><input type="date" value={term.end} onChange={e=>setLt(ts=>ts.map((tt,j)=>j===i?{...tt,end:e.target.value}:tt))} style={{...s_inp,fontSize:12,padding:"7px 10px"}}/></div>
            </div>
          </div>
        ))}
        <button onClick={()=>setLt(ts=>[...ts,{label:`Term ${ts.length+1}`,start:"",end:""}])} style={{width:"100%",background:"#f3f4f6",border:"none",borderRadius:8,padding:"8px",fontSize:12,fontWeight:700,cursor:"pointer",color:"#374151"}}>+ Add Term</button>
      </Sec>
      <Sec title="🏖️ VIC Public Holidays">
        <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Pre-loaded 2026–2027 · shown as red dates on your calendar</div>
        {Object.entries(VIC_HOLIDAYS).filter(([ds])=>ds>=today).sort(([a],[b])=>a.localeCompare(b)).slice(0,12).map(([ds,name])=>{
          const away=Math.round((parseDate(ds)-new Date())/86400000);
          return<div key={ds} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f9fafb"}}>
            <div><div style={{fontSize:13,fontWeight:600,color:"#1f1535"}}>{name}</div><div style={{fontSize:11,color:"#6b7280"}}>{parseDate(ds).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"long",year:"numeric"})}</div></div>
            <span style={{fontSize:10,fontWeight:700,color:away<=30?"#dc2626":"#9ca3af",background:away<=30?"#fef2f2":"#f9fafb",borderRadius:6,padding:"2px 8px",flexShrink:0}}>{away===0?"Today":away===1?"Tomorrow":`In ${away}d`}</span>
          </div>;
        })}
      </Sec>
      <Sec title="📅 Subscribe to Calendar">
        <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>
          Add this URL to your iPhone to keep Apple Calendar in sync automatically. Updates every hour.
        </div>
        <div style={{background:"#f3f4f6",borderRadius:10,padding:"10px 12px",marginBottom:12,fontFamily:"monospace",fontSize:11,color:"#374151",wordBreak:"break-all",lineHeight:1.5}}>
          https://lifeorg-api.agcoreaeration.workers.dev/api/calendar.ics
        </div>
        <button onClick={()=>{
          navigator.clipboard.writeText("https://lifeorg-api.agcoreaeration.workers.dev/api/calendar.ics");
          showToast("📋 URL copied!");
        }} style={{width:"100%",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:10}}>
          📋 Copy Subscription URL
        </button>
        <div style={{fontSize:11,color:"#9ca3af",lineHeight:1.6}}>
          <strong style={{color:"#374151"}}>iPhone setup:</strong> Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → paste URL
        </div>
        <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #f3f4f6"}}>
          <div style={{fontSize:11,color:"#9ca3af",marginBottom:8}}>Or download a one-time snapshot:</div>
          <button onClick={onExport} style={{width:"100%",background:"#f3f4f6",color:"#374151",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            📥 Download .ics file
          </button>
        </div>
      </Sec>
      <Sec title="ℹ️ About">
        <div style={{textAlign:"center",padding:"8px 0"}}>
          <div style={{fontSize:22,fontWeight:800,color:APP_COLOR,marginBottom:4}}>Life Org</div>
          <div style={{fontSize:13,color:"#6b7280",marginBottom:2}}>{APP_TAGLINE}</div>
          <div style={{fontSize:11,color:"#9ca3af"}}>Version 1.0 · Built for your family</div>
        </div>
      </Sec>
      <button onClick={saveAll} style={{width:"100%",background:saved?"#10b981":"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,cursor:"pointer",marginTop:8}}>{saved?"✅ Saved!":"Save Settings"}</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function useWindowWidth(){
  const [width,setWidth]=useState(window.innerWidth);
  useEffect(()=>{
    const h=()=>setWidth(window.innerWidth);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  return width;
}

function DesktopSidebar({view,setView,openAdd,petMember,bdBadge,syncing,refreshData,familyName}){
  const NAV=[
    {id:"week",     icon:"📅", label:"Calendar"},
    {id:"notes",    icon:"📝", label:"Notes"},
    {id:"marley",   icon:petMember?.emoji||"🐾", label:petMember?.name||"Marley"},
    {id:"birthdays",icon:"🎂", label:"Birthdays", badge:bdBadge},
    {id:"settings", icon:"⚙️", label:"Settings"},
  ];
  return(
    <div style={{width:220,flexShrink:0,background:"linear-gradient(160deg,#4f46e5,#7c3aed)",minHeight:"100vh",display:"flex",flexDirection:"column",padding:"24px 0"}}>
      {/* Logo */}
      <div style={{padding:"0 20px 28px"}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:6}}>Life, organised.</div>
        <div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-0.3px"}}><span style={{opacity:0.5}}>✦ </span>Life Org</div>
        {familyName&&<div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:4}}>{familyName}</div>}
      </div>

      {/* Add button */}
      <div style={{padding:"0 16px 24px"}}>
        <button onClick={openAdd} style={{width:"100%",background:"rgba(255,255,255,0.15)",border:"1.5px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:12,padding:"11px",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{fontSize:18}}>+</span> Add Event
        </button>
      </div>

      {/* Nav */}
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:2,padding:"0 10px"}}>
        {NAV.map(tab=>{
          const active=view===tab.id;
          return(
            <button key={tab.id} onClick={()=>setView(tab.id)} style={{
              display:"flex",alignItems:"center",gap:12,padding:"11px 14px",
              background:active?"rgba(255,255,255,0.2)":"transparent",
              border:"none",borderRadius:10,cursor:"pointer",width:"100%",textAlign:"left",
              transition:"background 0.15s"
            }}>
              <div style={{position:"relative",width:22,textAlign:"center"}}>
                <span style={{fontSize:18}}>{tab.icon}</span>
                {tab.badge&&<span style={{position:"absolute",top:-2,right:-4,width:8,height:8,borderRadius:"50%",background:"#f43f5e",border:"1.5px solid #7c3aed"}}/>}
              </div>
              <span style={{fontSize:14,fontWeight:active?700:500,color:active?"#fff":"rgba(255,255,255,0.65)"}}>{tab.label}</span>
              {active&&<span style={{marginLeft:"auto",width:4,height:4,borderRadius:"50%",background:"#fff"}}/>}
            </button>
          );
        })}
      </div>

      {/* Refresh */}
      <div style={{padding:"16px 16px 0"}}>
        <button onClick={refreshData} style={{width:"100%",background:"rgba(255,255,255,0.08)",border:"none",color:"rgba(255,255,255,0.5)",borderRadius:10,padding:"9px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <span style={{fontSize:14,display:"inline-block",transition:"transform 0.5s",transform:syncing?"rotate(360deg)":"none"}}>{syncing?"⏳":"🔄"}</span>
          {syncing?"Syncing...":"Sync now"}
        </button>
      </div>
    </div>
  );
}

function WeekGrid({weekDays,eventsByDay,gardenByDay,filterMember,termForDay,terms,members,expandedEv,setExpandedEv,openAdd,openEdit,confirmDelete,today,upcomingBds,weekOffset,setWeekOffset,weekLabel,memberCounts,setShareMode,syncing,refreshData}){
  const MEMBERS_ALL=[{id:"all",name:"Everyone",color:APP_COLOR,emoji:"👨‍👩‍👧‍👦",type:"family"},...members];
  const getType=id=>TASK_TYPES.find(t=>t.id===id);

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden"}}>
      {/* Top bar */}
      <div style={{background:"#fff",borderBottom:"1px solid #f3f4f6",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>setWeekOffset(o=>o-1)} style={{background:"#f3f4f6",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:"#374151"}}>‹</button>
            <div style={{textAlign:"center",minWidth:200}}>
              <div style={{fontSize:12,color:"#9ca3af",fontWeight:500}}>{weekOffset===0?"This Week":weekOffset===1?"Next Week":weekOffset===-1?"Last Week":""}</div>
              <div style={{fontSize:15,fontWeight:700,color:"#1f1535"}}>{weekLabel}</div>
            </div>
            <button onClick={()=>setWeekOffset(o=>o+1)} style={{background:"#f3f4f6",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:"#374151"}}>›</button>
          </div>
          <button onClick={()=>setWeekOffset(0)} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151"}}>Today</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={refreshData} style={{background:"#f3f4f6",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}} title="Refresh">{syncing?"⏳":"🔄"}</button>
          <button onClick={()=>setShareMode(true)} style={{background:"#f3f4ff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,color:APP_COLOR,cursor:"pointer"}}>📤 Share</button>
        </div>
      </div>

      {/* Birthday ribbon */}
      {upcomingBds.length>0&&(
        <div style={{background:"linear-gradient(135deg,#fef3c7,#fde68a)",padding:"8px 24px",borderBottom:"1px solid #fcd34d",flexShrink:0}}>
          <span style={{fontSize:12,fontWeight:800,color:"#92400e"}}>🎂 {upcomingBds.map(b=>b.title).join("  ·  ")}</span>
        </div>
      )}

      {/* 7-column grid */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(7,1fr)",overflow:"hidden",gap:0}}>
        {weekDays.map((day,di)=>{
          const ds=fmt(day);
          const termIdx=termForDay(ds);
          const termBg=termIdx>=0?TERM_COLORS[termIdx%4]:null;
          const ph=VIC_HOLIDAYS[ds];
          const dayEvs=eventsByDay[ds]||[];
          const dayJobs=filterMember==="all"?gardenByDay[ds]||[]:[];
          const isToday=ds===today;
          const isWeekend=di>=5;
          return(
            <div key={ds} style={{
              display:"flex",flexDirection:"column",
              borderRight:di<6?"1px solid #f3f4f6":"none",
              background:isToday?"#fafaff":isWeekend?"#fafafa":termBg||"#fff",
              minHeight:0,overflow:"hidden"
            }}>
              {/* Day header */}
              <div onClick={()=>openAdd(ds)} style={{
                padding:"10px 8px 8px",borderBottom:"1px solid #f3f4f6",
                cursor:"pointer",flexShrink:0,
                background:isToday?"linear-gradient(135deg,#4f46e5,#7c3aed)":isWeekend?"#f9fafb":"#fff"
              }}>
                <div style={{fontSize:10,fontWeight:700,color:isToday?"rgba(255,255,255,0.8)":isWeekend?"#9ca3af":"#6b7280",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>
                  {day.toLocaleDateString("en-AU",{weekday:"short"})}
                </div>
                <div style={{fontSize:20,fontWeight:800,color:isToday?"#fff":isWeekend?"#9ca3af":"#1f1535",lineHeight:1}}>
                  {day.getDate()}
                </div>
                {ph&&<div style={{fontSize:9,color:isToday?"rgba(255,255,255,0.8)":"#dc2626",fontWeight:700,marginTop:2,lineHeight:1.2}}>{ph}</div>}
                {termIdx>=0&&!isToday&&<div style={{fontSize:9,color:TERM_TEXT_COLORS[termIdx%4],fontWeight:700,marginTop:1}}>{terms[termIdx]?.label}</div>}
              </div>

              {/* Events in this column */}
              <div style={{flex:1,overflowY:"auto",padding:"4px 4px"}}>
                {dayEvs.length===0&&dayJobs.length===0&&(
                  <div onClick={()=>openAdd(ds)} style={{height:"100%",minHeight:60,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",opacity:0}}>
                    <span style={{fontSize:18,color:"#d1d5db"}}>+</span>
                  </div>
                )}
                {dayEvs.map(ev=>{
                  const type=getType(ev.type);
                  const isBd=ev.isBirthday;
                  const evMs=ev.members.includes("all")?members:ev.members.map(id=>MEMBERS_ALL.find(m=>m.id===id)).filter(Boolean);
                  const borderColor=isBd?"#f43f5e":evMs.length===1?evMs[0].color:(type?.color||APP_COLOR);
                  const exp=expandedEv===ev.id+ds;
                  return(
                    <div key={ev.id} onClick={()=>setExpandedEv(exp?null:ev.id+ds)} style={{
                      background:"#fff",borderRadius:6,marginBottom:3,padding:"5px 7px",
                      borderLeft:`3px solid ${borderColor}`,
                      boxShadow:"0 1px 2px rgba(0,0,0,0.06)",cursor:"pointer",
                      fontSize:11,lineHeight:1.3
                    }}>
                      <div style={{fontWeight:700,color:"#1f1535",marginBottom:1,display:"flex",alignItems:"center",gap:3}}>
                        <span style={{fontSize:12}}>{isBd?"🎂":type?.emoji}</span>
                        <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</span>
                      </div>
                      {!ev.allDay&&ev.startTime&&<div style={{color:"#6b7280",fontSize:10}}>{fmtTime(ev.startTime)}</div>}
                      {exp&&ev.location&&<div style={{color:"#6b7280",fontSize:10,marginTop:2}}>📍 {ev.location}</div>}
                      <div style={{display:"flex",marginTop:2}}>{evMs.slice(0,3).map(m=><span key={m.id} style={{fontSize:10,marginRight:-2}}>{m.emoji}</span>)}</div>
                      {exp&&!isBd&&(
                        <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #f3f4f6",display:"flex",gap:4}}>
                          <button onClick={e=>{e.stopPropagation();openEdit(ev);}} style={{background:"#f3f4ff",border:"none",borderRadius:5,color:APP_COLOR,fontSize:10,fontWeight:700,padding:"3px 8px",cursor:"pointer"}}>✏️</button>
                          <button onClick={e=>{e.stopPropagation();confirmDelete(ev.id,ev.title,ev);}} style={{background:"#fef2f2",border:"none",borderRadius:5,color:"#ef4444",fontSize:10,fontWeight:700,padding:"3px 8px",cursor:"pointer"}}>🗑</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {dayJobs.map(job=>{
                  const SC={scheduled:"#16a34a","in-progress":"#f59e0b",completed:"#10b981",pending:"#6b7280"};
                  return(
                    <div key={job.id} style={{background:"#f0fdf4",borderRadius:6,marginBottom:3,padding:"5px 7px",borderLeft:"3px solid #16a34a",fontSize:11}}>
                      <div style={{fontWeight:700,color:"#14532d",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:3}}>
                        <span>🌿</span><span>{job.title||"Garden Job"}</span>
                      </div>
                      <div style={{color:"#166534",fontSize:10,marginTop:1}}>👤 {job.client}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DesktopRightPanel({settings,memberCounts,upcomingBds,gardenJobs,allEvents,birthdays,today}){
  const upcoming=useMemo(()=>{
    const windowEnd=fmt(addDays(new Date(),90)); // look 90 days ahead for recurring instances
    const expanded=expandEventsForWindow(allEvents, today, windowEnd);
    return expanded.filter(ev=>ev.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);
  },[allEvents,today]);
  const upcomingJobs=useMemo(()=>gardenJobs.filter(j=>j.scheduledDate>=today).sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate)).slice(0,5),[gardenJobs,today]);
  const bdList=useMemo(()=>{
    const y=new Date().getFullYear();
    return birthdays.map(bd=>{
      if(!bd.dob)return null;
      const mmdd=bd.dob.slice(5);
      const ty=`${y}-${mmdd}`;
      const next=ty<today?`${y+1}-${mmdd}`:ty;
      const away=Math.round((parseDate(next)-new Date())/86400000);
      return{...bd,next,away};
    }).filter(Boolean).sort((a,b)=>a.away-b.away).slice(0,5);
  },[birthdays,today]);
  const getType=id=>TASK_TYPES.find(t=>t.id===id);

  function Section({title,children,empty,emptyMsg}){
    return(
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:800,color:"#6b7280",letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>{title}</div>
        {empty?<div style={{fontSize:12,color:"#d1d5db",fontStyle:"italic",padding:"8px 0"}}>{emptyMsg}</div>:children}
      </div>
    );
  }

  return(
    <div style={{width:260,flexShrink:0,background:"#fff",borderLeft:"1px solid #f3f4f6",overflowY:"auto",padding:"20px 16px"}}>

      {/* Family summary */}
      <Section title="👨‍👩‍👧‍👦 This week">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:4}}>
          {settings.members.map(m=>(
            <div key={m.id} style={{background:m.color+"10",borderRadius:10,padding:"8px 10px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>{m.emoji}</span>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#374151"}}>{m.name}</div>
                <div style={{fontSize:17,fontWeight:800,color:m.color,lineHeight:1}}>{memberCounts[m.id]||0}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Upcoming events */}
      <Section title="📅 Upcoming" empty={!upcoming.length} emptyMsg="No upcoming events">
        {upcoming.map(ev=>{
          const type=getType(ev.type);
          const away=Math.round((parseDate(ev.date)-new Date())/86400000);
          return(
            <div key={ev.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 0",borderBottom:"1px solid #f9fafb"}}>
              <span style={{fontSize:16,flexShrink:0}}>{ev.isBirthday?"🎂":type?.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"#1f1535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</div>
                <div style={{fontSize:10,color:"#9ca3af"}}>{parseDate(ev.date).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"})}{ev.startTime&&` · ${fmtTime(ev.startTime)}`}</div>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:away===0?"#ef4444":away<=3?"#f59e0b":"#9ca3af",flexShrink:0}}>
                {away===0?"Today":away===1?"Tmrw":`${away}d`}
              </span>
            </div>
          );
        })}
      </Section>

      {/* Birthdays */}
      <Section title="🎂 Birthdays" empty={!bdList.length} emptyMsg="No birthdays saved">
        {bdList.map(bd=>(
          <div key={bd.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #f9fafb"}}>
            <span style={{fontSize:18}}>🎂</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"#1f1535"}}>{bd.name}</div>
              <div style={{fontSize:10,color:"#9ca3af"}}>{parseDate(bd.dob).toLocaleDateString("en-AU",{day:"numeric",month:"short"})}</div>
            </div>
            <span style={{fontSize:10,fontWeight:800,color:bd.away<=7?"#f43f5e":bd.away<=30?"#f59e0b":"#9ca3af",flexShrink:0}}>
              {bd.away===0?"🎉 Today!":bd.away===1?"Tmrw":`${bd.away}d`}
            </span>
          </div>
        ))}
      </Section>

      {/* Garden Ops jobs */}
      <Section title="🌿 Garden Ops" empty={!upcomingJobs.length} emptyMsg="No upcoming jobs">
        {upcomingJobs.map(job=>{
          const away=Math.round((parseDate(job.scheduledDate)-new Date())/86400000);
          const SC={scheduled:"#16a34a","in-progress":"#f59e0b",completed:"#10b981",pending:"#6b7280"};
          return(
            <div key={job.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 0",borderBottom:"1px solid #f9fafb"}}>
              <span style={{fontSize:16,flexShrink:0}}>🌿</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"#14532d",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.title}</div>
                <div style={{fontSize:10,color:"#9ca3af"}}>👤 {job.client}</div>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:away===0?"#ef4444":away<=3?"#f59e0b":"#16a34a",flexShrink:0}}>
                {away===0?"Today":away===1?"Tmrw":`${away}d`}
              </span>
            </div>
          );
        })}
      </Section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LifeOrg(){
  const [events,       setEvents]       = useState(SEED_EVENTS);
  const [birthdays,    setBirthdays]    = useState(SEED_BIRTHDAYS);
  const [notes,        setNotes]        = useState(SEED_NOTES);
  const [gardenJobs,   setGardenJobs]   = useState([]);
  const [settings,     setSettings]     = useState(DEFAULT_SETTINGS);
  const [terms,        setTerms]        = useState(SEED_TERMS);
  const [petInfo,      setPetInfo]      = useState({vet:"",groomer:"",nextVac:"",nextFlea:""});
  const [view,         setView]         = useState("splash");
  const [step,         setStep]         = useState(1);
  const [form,         setForm]         = useState(blankForm());
  const [editingId,    setEditingId]    = useState(null);
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [filterMember, setFilterMember] = useState("all");
  const [toast,        setToast]        = useState(null);
  const [expandedEv,   setExpandedEv]   = useState(null);
  const [loaded,       setLoaded]       = useState(false);
  const [bdForm,       setBdForm]       = useState(null);
  const [showBdForm,   setShowBdForm]   = useState(false);
  const [deleteConfirm,setDeleteConfirm]= useState(null);
  const [shareMode,    setShareMode]    = useState(false);

  useEffect(()=>{const t=setTimeout(()=>setView("week"),2200);return()=>clearTimeout(t);},[]);

  // ── API ───────────────────────────────────────────────────────────────────
  const API = "https://lifeorg-api.agcoreaeration.workers.dev";
  async function apiFetch(path, method="GET", body=null){
    const opts={method,headers:{"Content-Type":"application/json"}};
    if(body)opts.body=JSON.stringify(body);
    const r=await fetch(API+path,opts);
    if(!r.ok)throw new Error(`API ${path} failed: ${r.status}`);
    return r.json();
  }

  // Load all data from D1 on mount
  useEffect(()=>{
    (async()=>{
      try{
        const [evs,bds,nts,cfg,tms,gjs]=await Promise.all([
          apiFetch("/api/events").catch(()=>null),
          apiFetch("/api/birthdays").catch(()=>null),
          apiFetch("/api/notes").catch(()=>null),
          apiFetch("/api/settings").catch(()=>null),
          apiFetch("/api/terms").catch(()=>null),
          apiFetch("/api/garden-jobs").catch(()=>null),
        ]);
        if(evs?.length)setEvents(evs);
        if(bds?.length)setBirthdays(bds);
        if(nts?.length)setNotes(nts);
        if(cfg?.familyName)setSettings(cfg);
        if(cfg?.petInfo)setPetInfo(cfg.petInfo);
        if(tms?.length)setTerms(tms);
        if(gjs)setGardenJobs(gjs);
      }catch(e){
        console.warn("API load failed, falling back to localStorage",e);
        try{const r=localStorage.getItem(SK.events);    if(r)setEvents(JSON.parse(r));}catch(_){}
        try{const r=localStorage.getItem(SK.notes);     if(r)setNotes(JSON.parse(r));}catch(_){}
        try{const r=localStorage.getItem(SK.birthdays); if(r)setBirthdays(JSON.parse(r));}catch(_){}
        try{const r=localStorage.getItem(SK.settings);  if(r)setSettings(JSON.parse(r));}catch(_){}
        try{const r=localStorage.getItem(SK.terms);     if(r)setTerms(JSON.parse(r));}catch(_){}
        try{const r=localStorage.getItem(SK.petInfo);   if(r)setPetInfo(JSON.parse(r));}catch(_){}
      }
      setLoaded(true);
    })();
  },[]);

  // Save to D1 + localStorage (localStorage as offline fallback)
  useEffect(()=>{
    if(!loaded)return;
    localStorage.setItem(SK.events,JSON.stringify(events));
    apiFetch("/api/events","POST",events).catch(()=>{});
  },[events,loaded]);
  useEffect(()=>{
    if(!loaded)return;
    localStorage.setItem(SK.notes,JSON.stringify(notes));
    apiFetch("/api/notes","POST",notes).catch(()=>{});
  },[notes,loaded]);
  useEffect(()=>{
    if(!loaded)return;
    localStorage.setItem(SK.birthdays,JSON.stringify(birthdays));
    apiFetch("/api/birthdays","POST",birthdays).catch(()=>{});
  },[birthdays,loaded]);
  useEffect(()=>{
    if(!loaded)return;
    localStorage.setItem(SK.settings,JSON.stringify(settings));
    apiFetch("/api/settings","POST",settings).catch(()=>{});
  },[settings,loaded]);
  useEffect(()=>{
    if(!loaded)return;
    localStorage.setItem(SK.petInfo,JSON.stringify(petInfo));
    apiFetch("/api/settings","POST",{petInfo}).catch(()=>{});
  },[petInfo,loaded]);
  useEffect(()=>{
    if(!loaded)return;
    localStorage.setItem(SK.terms,JSON.stringify(terms));
    apiFetch("/api/terms","POST",terms).catch(()=>{});
  },[terms,loaded]);

  const MEMBERS_ALL=useMemo(()=>[{id:"all",name:"Everyone",color:APP_COLOR,emoji:"👨‍👩‍👧‍👦",type:"family"},...settings.members],[settings.members]);
  const petMember=settings.members.find(m=>m.type==="pet");
  const baseDate=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+weekOffset*7);return d;},[weekOffset]);
  const weekDays=useMemo(()=>getWeekDays(baseDate),[baseDate]);
  const weekLabel=useMemo(()=>{
    const s=weekDays[0],e=weekDays[6];
    if(s.getMonth()===e.getMonth())return`${s.getDate()}–${e.toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"})}`;
    return`${s.toLocaleDateString("en-AU",{day:"numeric",month:"short"})} – ${e.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})}`;
  },[weekDays]);
  const termForDay=useCallback(ds=>{for(let i=0;i<terms.length;i++){const t=terms[i];if(t.start&&t.end&&ds>=t.start&&ds<=t.end)return i;}return -1;},[terms]);
  const allEvents=useMemo(()=>[...events,...birthdayEvents(birthdays)],[events,birthdays]);
  const eventsForWeek=useMemo(()=>{
    const ds=weekDays.map(fmt);
    const windowStart=ds[0], windowEnd=ds[ds.length-1];
    const expanded=expandEventsForWindow(allEvents, windowStart, windowEnd);
    return expanded.filter(ev=>{
      if(!ds.some(d=>eventOnDate(ev,d)))return false;
      if(filterMember==="all")return true;
      return ev.members.includes(filterMember)||ev.members.includes("all");
    });
  },[allEvents,weekDays,filterMember]);
  const eventsByDay=useMemo(()=>{
    const map={};weekDays.forEach(d=>{map[fmt(d)]=[];});
    weekDays.forEach(d=>{const ds=fmt(d);eventsForWeek.forEach(ev=>{if(eventOnDate(ev,ds))map[ds].push(ev);});map[ds].sort((a,b)=>(a.startTime||"99:99").localeCompare(b.startTime||"99:99"));});
    return map;
  },[eventsForWeek,weekDays]);
  const gardenByDay=useMemo(()=>{const map={};weekDays.forEach(d=>{map[fmt(d)]=[];});gardenJobs.forEach(j=>{if(map[j.scheduledDate])map[j.scheduledDate].push(j);});return map;},[gardenJobs,weekDays]);
  const memberCounts=useMemo(()=>{const c={};settings.members.forEach(m=>{c[m.id]=eventsForWeek.filter(ev=>ev.members.includes(m.id)||ev.members.includes("all")).length;});return c;},[eventsForWeek,settings.members]);
  const upcomingBds=useMemo(()=>birthdayEvents(birthdays).filter(b=>bdThisWeek(b.date)),[birthdays]);
  const bdBadge=upcomingBds.length>0;
  const getType=id=>TASK_TYPES.find(t=>t.id===id);

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(null),2400);}
  function openAdd(pre){setForm(blankForm(pre));setEditingId(null);setStep(1);setView("add");}
  // If ev is a generated recurrence instance, resolve back to the stored original event
  function resolveOriginal(ev){
    if(!ev.isRecurrenceInstance) return ev;
    const originalId = String(ev.id).split("-r")[0];
    return events.find(e=>String(e.id)===originalId) || ev;
  }
  function openEdit(ev){
    const orig=resolveOriginal(ev);
    setForm({id:orig.id,type:orig.type,title:orig.title,customTitle:true,members:orig.members,date:orig.date,endDate:orig.endDate||orig.date,allDay:orig.allDay||false,startTime:orig.startTime||"",endTime:orig.endTime||"",notes:orig.notes||"",location:orig.location||"",recurring:orig.recurring||"none",customInterval:orig.customInterval||1,customUnit:orig.customUnit||"months",bdName:"",bdDob:"",bdCategory:"friend",bdMemberId:""});
    setEditingId(orig.id);setStep(3);setView("add");setExpandedEv(null);
  }
  function confirmDelete(id,title,evRef){
    // If a full event object is passed and it's a recurrence instance, resolve to the original id
    const realId = evRef?.isRecurrenceInstance ? resolveOriginal(evRef).id : id;
    setDeleteConfirm({id:realId,title});
  }
  function doDelete(){
    if(!deleteConfirm)return;
    const id=deleteConfirm.id;
    setEvents(p=>p.filter(e=>e.id!==id));
    setExpandedEv(null);
    showToast("🗑 Event removed");
    setDeleteConfirm(null);
    apiFetch("/api/events","DELETE",{id}).catch(()=>{});
  }
  function deleteNote(id){
    setNotes(p=>p.filter(n=>n.id!==id));
    apiFetch("/api/notes","DELETE",{id}).catch(()=>{});
  }
  function deleteBirthday(id){
    setBirthdays(p=>p.filter(b=>b.id!==id));
    apiFetch("/api/birthdays","DELETE",{id}).catch(()=>{});
  }
  function toggleMember(id){
    if(id==="all"){setForm(f=>({...f,members:f.members.includes("all")?[]:["all"]}));return;}
    setForm(f=>{const w=f.members.filter(m=>m!=="all");return w.includes(id)?{...f,members:w.filter(m=>m!==id)}:{...f,members:[...w,id]};});
  }
  function submitEvent(){
    if(form.type==="birthday"){
      if(!form.bdName||!form.bdDob)return;
      setBirthdays(p=>[...p,{id:`bd${Date.now()}`,name:form.bdName,dob:form.bdDob,notes:form.notes,category:form.bdCategory,memberId:form.bdMemberId||null}]);
      showToast("🎂 Birthday saved!");setTimeout(()=>{setView("week");setStep(1);setForm(blankForm());},1600);return;
    }
    if(!form.title||!form.members.length||!form.date)return;
    let endTime=form.endTime;
    if(!form.allDay&&form.startTime&&!endTime)endTime=addMins(form.startTime,60);
    const endDate=(form.endDate&&form.endDate>=form.date)?form.endDate:form.date;
    const payload={...form,endDate,endTime};
    if(editingId){setEvents(p=>p.map(e=>e.id===editingId?{...e,...payload,id:editingId}:e));showToast("✅ Event updated!");}
    else{setEvents(p=>[...p,{...payload,id:Date.now()}]);showToast("✅ Added to calendar!");}
    setTimeout(()=>{setView("week");setStep(1);setForm(blankForm());setEditingId(null);},1600);
  }
  function saveBirthday(){
    if(!bdForm?.name||!bdForm?.dob)return;
    const ex=birthdays.find(b=>b.id===bdForm.id);
    if(ex)setBirthdays(p=>p.map(b=>b.id===bdForm.id?{...b,...bdForm}:b));
    else setBirthdays(p=>[...p,{...bdForm,id:`bd${Date.now()}`}]);
    setShowBdForm(false);setBdForm(null);showToast("🎂 Birthday saved!");
  }
  function handleExport(){
    const ical=generateICal(events,birthdays,terms,settings.familyName);
    downloadICal(ical,`life-org-${settings.familyName.replace(/\s+/g,"-").toLowerCase()}.ics`);
    showToast("📅 Calendar exported!");
  }

  const windowWidth=useWindowWidth();
  const isDesktop=windowWidth>=768;
  const isEdit=!!editingId;
  const totalWeekEvents=weekDays.reduce((s,d)=>{const ds=fmt(d);return s+(eventsByDay[ds]||[]).length+(filterMember==="all"?(gardenByDay[ds]||[]).length:0);},0);

  // ── Sync / refresh ────────────────────────────────────────────────────────
  const [syncing,setSyncing]=useState(false);
  async function refreshData(){
    if(syncing)return;
    setSyncing(true);
    try{
      const [evs,bds,nts,cfg,tms,gjs]=await Promise.all([
        apiFetch("/api/events").catch(()=>null),
        apiFetch("/api/birthdays").catch(()=>null),
        apiFetch("/api/notes").catch(()=>null),
        apiFetch("/api/settings").catch(()=>null),
        apiFetch("/api/terms").catch(()=>null),
        apiFetch("/api/garden-jobs").catch(()=>null),
      ]);
      if(evs)setEvents(evs);
      if(bds)setBirthdays(bds);
      if(nts)setNotes(nts);
      if(cfg?.familyName)setSettings(cfg);
      if(cfg?.petInfo)setPetInfo(cfg.petInfo);
      if(gjs)setGardenJobs(gjs);
      if(tms?.length)setTerms(tms);
    }catch(_){}
    setSyncing(false);
  }

  // Background poll every 30 seconds
  useEffect(()=>{
    const interval=setInterval(()=>{if(view==="week")refreshData();},30000);
    return()=>clearInterval(interval);
  },[view]);

  // Pull-to-refresh
  const pullRef=useRef(null);
  const pullStartY=useRef(null);
  const [pullDistance,setPullDistance]=useState(0);
  const PULL_THRESHOLD=70;
  function onTouchStart(e){pullStartY.current=e.touches[0].clientY;}
  function onTouchMove(e){
    if(pullStartY.current===null)return;
    const el=pullRef.current;
    if(!el||el.scrollTop>0){pullStartY.current=null;setPullDistance(0);return;}
    const dist=Math.max(0,Math.min(e.touches[0].clientY-pullStartY.current,120));
    if(dist>0)setPullDistance(dist);
  }
  function onTouchEnd(){
    if(pullDistance>=PULL_THRESHOLD)refreshData();
    pullStartY.current=null;
    setPullDistance(0);
  }

  // ── Splash ────────────────────────────────────────────────────────────────
  if(view==="splash"){return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"linear-gradient(145deg,#4f46e5 0%,#7c3aed 100%)",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{marginBottom:24}}>
        <svg width="96" height="96" viewBox="0 0 96 96">
          <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity="0.95"/><stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.85"/></linearGradient></defs>
          <rect x="8" y="18" width="80" height="68" rx="12" fill="url(#lg)"/>
          <rect x="8" y="18" width="80" height="22" rx="12" fill="#4f46e5" opacity="0.9"/>
          <rect x="8" y="30" width="80" height="10" fill="#4f46e5" opacity="0.9"/>
          <circle cx="28" cy="23" r="5" fill="#7c3aed"/><circle cx="28" cy="23" r="3" fill="#e0e7ff"/>
          <circle cx="68" cy="23" r="5" fill="#7c3aed"/><circle cx="68" cy="23" r="3" fill="#e0e7ff"/>
          {["M","T","W","T","F","S","S"].map((l,i)=><text key={i} x={18+i*11} y={56} textAnchor="middle" fontSize="9" fontWeight="600" fill="#9ca3af" fontFamily="system-ui">{l}</text>)}
          <circle cx="48" cy="70" r="9" fill="#4f46e5"/>
          <text x="48" y="74" textAnchor="middle" fontSize="10" fontWeight="700" fill="white" fontFamily="system-ui">5</text>
          {[[26,70],[37,70],[59,70],[70,70]].map(([x,y],i)=><text key={i} x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="500" fill="#374151" fontFamily="system-ui">{[2,3,6,7][i]}</text>)}
          <circle cx="26" cy="76" r="2.5" fill="#ec4899"/><circle cx="59" cy="76" r="2.5" fill="#10b981"/>
        </svg>
      </div>
      <div style={{color:"#fff",fontSize:34,fontWeight:800,letterSpacing:"-0.5px",marginBottom:6}}>Life Org</div>
      <div style={{color:"rgba(255,255,255,0.65)",fontSize:15}}>{APP_TAGLINE}</div>
      <div style={{display:"flex",gap:8,marginTop:48}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"rgba(255,255,255,0.4)",animation:`dot 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}</div>
      <style>{`@keyframes dot{0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1.1)}}`}</style>
    </div>
  );}

  // ── Share mode ────────────────────────────────────────────────────────────
  if(shareMode){return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#f8f7ff",minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#4f46e5,#7c3aed)",padding:"20px 20px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{color:"#fff"}}>
          <div style={{fontSize:11,opacity:0.7,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Life Org</div>
          <div style={{fontSize:18,fontWeight:800,marginTop:2}}>Weekly Summary</div>
          <div style={{fontSize:12,opacity:0.75,marginTop:2}}>{weekLabel}</div>
        </div>
        <button onClick={()=>setShareMode(false)} style={{background:"rgba(255,255,255,0.2)",border:"1.5px solid rgba(255,255,255,0.4)",color:"#fff",borderRadius:10,padding:"7px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>← Back</button>
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #f3f4f6"}}>
        {settings.members.map(m=><div key={m.id} style={{flex:1,textAlign:"center",padding:"12px 4px"}}><div style={{fontSize:22,marginBottom:2}}>{m.emoji}</div><div style={{fontSize:9,fontWeight:700,color:"#374151"}}>{m.name}</div><div style={{fontSize:20,fontWeight:800,color:m.color}}>{memberCounts[m.id]||0}</div></div>)}
      </div>
      <div style={{padding:"16px 20px"}}>
        {weekDays.map(day=>{
          const ds=fmt(day);const dayEvs=eventsByDay[ds]||[];const ph=VIC_HOLIDAYS[ds];
          if(!dayEvs.length&&!ph)return null;
          return(<div key={ds} style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:ds===today?APP_COLOR:"#374151",marginBottom:6}}>{day.toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"short"})}{ds===today&&<span style={{marginLeft:6,fontSize:10,color:APP_COLOR,fontWeight:700}}>TODAY</span>}</div>
            {ph&&<div style={{fontSize:11,color:"#dc2626",fontWeight:700,marginBottom:4}}>🏖️ {ph}</div>}
            {dayEvs.map(ev=>{const type=TASK_TYPES.find(tt=>tt.id===ev.type);const evMs=ev.members.includes("all")?settings.members:ev.members.map(id=>MEMBERS_ALL.find(m=>m.id===id)).filter(Boolean);return(
              <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#fff",borderRadius:10,marginBottom:4,borderLeft:`3px solid ${type?.color||APP_COLOR}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
                <span style={{fontSize:16}}>{ev.isBirthday?"🎂":type?.emoji}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#1f1535"}}>{ev.title}</div>{!ev.allDay&&ev.startTime&&<div style={{fontSize:11,color:"#6b7280"}}>{fmtTime(ev.startTime)}{ev.endTime?` – ${fmtTime(ev.endTime)}`:""}</div>}</div>
                <div style={{display:"flex"}}>{evMs.map(m=><span key={m.id} style={{fontSize:14,marginLeft:-4}}>{m.emoji}</span>)}</div>
              </div>
            );})}
          </div>);
        })}
      </div>
      <div style={{textAlign:"center",padding:"8px 0 24px",fontSize:11,color:"#d1d5db",fontWeight:600,letterSpacing:1}}>LIFE ORG · {APP_TAGLINE.toUpperCase()}</div>
    </div>
  );}

  // ── Shared modals (used by both layouts) ─────────────────────────────────
  const Modals = <>
    <DeleteModal item={deleteConfirm} onCancel={()=>setDeleteConfirm(null)} onConfirm={doDelete}/>
    {showBdForm&&bdForm&&<BdModal bdForm={bdForm} setBdForm={setBdForm} onClose={()=>{setShowBdForm(false);setBdForm(null);}} onSave={saveBirthday} members={settings.members}/>}
    {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"#1f1535",color:"#fff",borderRadius:12,padding:"10px 20px",fontSize:14,fontWeight:700,zIndex:200,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>{toast}</div>}
  </>;

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  if(isDesktop){
    // On desktop the add/edit form slides in as a right overlay panel
    const showAddPanel=view==="add";
    return(
      <div style={{fontFamily:"'Inter',system-ui,sans-serif",display:"flex",height:"100vh",overflow:"hidden",background:"#f8f7ff"}}>
        {Modals}

        {/* Left sidebar */}
        <DesktopSidebar
          view={view} setView={setView} openAdd={openAdd}
          petMember={petMember} bdBadge={bdBadge}
          syncing={syncing} refreshData={refreshData}
          familyName={settings.familyName}
        />

        {/* Main content */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>

          {/* Calendar grid — always visible on desktop */}
          {(view==="week"||view==="add")&&(
            <WeekGrid
              weekDays={weekDays} eventsByDay={eventsByDay}
              gardenByDay={gardenByDay} filterMember={filterMember}
              termForDay={termForDay} terms={terms}
              members={settings.members}
              expandedEv={expandedEv} setExpandedEv={setExpandedEv}
              openAdd={openAdd} openEdit={openEdit} confirmDelete={confirmDelete}
              today={today} upcomingBds={upcomingBds}
              weekOffset={weekOffset} setWeekOffset={setWeekOffset}
              weekLabel={weekLabel} memberCounts={memberCounts}
              setShareMode={setShareMode} syncing={syncing} refreshData={refreshData}
            />
          )}

          {/* Other views */}
          {view==="notes"     &&<div style={{flex:1,overflowY:"auto"}}><NotesView notes={notes} setNotes={setNotes} onDeleteNote={deleteNote}/></div>}
          {view==="marley"    &&<div style={{flex:1,overflowY:"auto"}}><MarleyView allEvents={allEvents} petMember={petMember} setView={setView} setForm={setForm} petInfo={petInfo} setPetInfo={setPetInfo}/></div>}
          {view==="birthdays" &&<div style={{flex:1,overflowY:"auto"}}><BirthdaysView birthdays={birthdays} setBirthdays={setBirthdays} upcomingBds={upcomingBds} setBdForm={setBdForm} setShowBdForm={setShowBdForm} onDeleteBirthday={deleteBirthday}/></div>}
          {view==="settings"  &&<div style={{flex:1,overflowY:"auto"}}><SettingsView settings={settings} setSettings={setSettings} terms={terms} setTerms={setTerms} onExport={handleExport} showToast={showToast}/></div>}

          {/* Add/edit slide-in panel — renders same form as mobile */}
          {showAddPanel&&(
            <div style={{position:"absolute",top:0,right:0,width:440,height:"100%",background:"#fff",boxShadow:"-4px 0 24px rgba(0,0,0,0.1)",zIndex:20,overflowY:"auto",borderLeft:"1px solid #f3f4f6"}}>
              <div style={{padding:"16px 24px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #f3f4f6",position:"sticky",top:0,background:"#fff",zIndex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {step>1&&!isEdit&&<button onClick={()=>setStep(s=>s-1)} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:14}}>←</button>}
                  <div style={{fontSize:16,fontWeight:800,color:"#1f1535"}}>{isEdit?"Edit Event":"New Event"}</div>
                  {isEdit&&<span style={{fontSize:11,fontWeight:700,color:APP_COLOR,background:"#f3f4ff",borderRadius:6,padding:"2px 8px"}}>Editing</span>}
                </div>
                <button onClick={()=>{setView("week");setForm(blankForm());setEditingId(null);}} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151"}}>✕</button>
              </div>
              <div style={{padding:"0 4px 8px"}}>
                <div style={{padding:"10px 20px 0",display:"flex",gap:5}}>{[1,2,3].map(s=><div key={s} style={{flex:1,height:3,borderRadius:4,background:s<=step?APP_COLOR:"#e5e7eb"}}/>)}</div>
                <div style={{padding:"0 16px 24px"}}>
                  {step===1&&(
                    <>
                      <div style={{fontSize:16,fontWeight:800,color:"#1f1535",marginTop:16,marginBottom:4}}>What type of event?</div>
                      <div style={{fontSize:12,color:"#6b7280",marginBottom:14}}>Choose a category</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                        {TASK_TYPES.map(tp=>(
                          <button key={tp.id} onClick={()=>{setForm(f=>({...f,type:tp.id,title:"",members:tp.id==="pet"&&petMember?[petMember.id]:[]}));setStep(tp.id==="birthday"?3:2);}} style={{background:"#fff",border:`2px solid ${form.type===tp.id?tp.color:"#e5e7eb"}`,borderRadius:12,padding:"12px 6px",cursor:"pointer",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                            <div style={{fontSize:22,marginBottom:4}}>{tp.emoji}</div>
                            <div style={{fontSize:10,fontWeight:700,color:"#374151",lineHeight:1.2}}>{tp.label}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {step===2&&form.type&&(
                    <>
                      <div style={{fontSize:16,fontWeight:800,color:"#1f1535",marginTop:16,marginBottom:14}}>{TASK_TYPES.find(t=>t.id===form.type)?.emoji} {TASK_TYPES.find(t=>t.id===form.type)?.label}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:7}}>
                        {PRESET_TASKS[form.type]?.map(p=>(
                          <button key={p} onClick={()=>{setForm(f=>({...f,title:p,customTitle:false}));setStep(3);}} style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"11px 14px",cursor:"pointer",textAlign:"left",fontSize:13,fontWeight:600,color:"#1f1535",display:"flex",alignItems:"center",justifyContent:"space-between"}}>{p}<span style={{color:"#d1d5db"}}>›</span></button>
                        ))}
                        <button onClick={()=>{setForm(f=>({...f,title:"",customTitle:true}));setStep(3);}} style={{background:"linear-gradient(135deg,#f3f4ff,#faf5ff)",border:"1.5px dashed #a5b4fc",borderRadius:10,padding:"11px 14px",cursor:"pointer",textAlign:"left",fontSize:13,fontWeight:600,color:APP_COLOR}}>✏️ Type my own...</button>
                      </div>
                    </>
                  )}
                  {step===3&&(
                    <div style={{marginTop:16}}>
                      {form.type==="birthday"?(
                        <>
                          <div style={{marginBottom:14}}><label style={s_lbl}>Whose birthday?</label><input value={form.bdName} onChange={e=>setForm(f=>({...f,bdName:e.target.value}))} placeholder="e.g. Uncle Luke" style={s_inp}/></div>
                          <div style={{marginBottom:14}}><label style={s_lbl}>Date of birth</label><input type="date" value={form.bdDob} onChange={e=>setForm(f=>({...f,bdDob:e.target.value}))} style={s_inp}/>{form.bdName&&form.bdDob&&<div style={{marginTop:6,background:"#fdf2f8",borderRadius:8,padding:"8px 12px",border:"1px solid #fbcfe8",fontSize:12,color:"#9d174d",fontWeight:600}}>{getBdTitle({name:form.bdName,dob:form.bdDob},new Date().getFullYear())}<div style={{fontSize:10,color:"#6b7280",marginTop:2,fontWeight:400}}>🔁 Repeats yearly</div></div>}</div>
                          <div style={{marginBottom:14}}><label style={s_lbl}>Relationship</label><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{[{id:"family",l:"Family",e:"🏠"},{id:"friend",l:"Friend",e:"👥"},{id:"work",l:"Work",e:"💼"},{id:"other",l:"Other",e:"📌"}].map(c=><button key={c.id} onClick={()=>setForm(f=>({...f,bdCategory:c.id}))} style={{background:form.bdCategory===c.id?"#f43f5e":"#fff",color:form.bdCategory===c.id?"#fff":"#374151",border:`1.5px solid ${form.bdCategory===c.id?"#f43f5e":"#e5e7eb"}`,borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{c.e} {c.l}</button>)}</div></div>
                          <div style={{marginBottom:20}}><label style={s_lbl}>Notes (optional)</label><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Surprise party!" style={s_inp}/></div>
                          <button onClick={submitEvent} disabled={!form.bdName||!form.bdDob} style={{width:"100%",background:(!form.bdName||!form.bdDob)?"#e5e7eb":"linear-gradient(135deg,#f43f5e,#e11d48)",color:(!form.bdName||!form.bdDob)?"#9ca3af":"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer"}}>Save Birthday 🎂</button>
                        </>
                      ):(
                        <>
                          {(form.customTitle||isEdit)?<div style={{marginBottom:14}}><label style={s_lbl}>Title</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Event name" style={s_inp}/></div>
                            :<div style={{background:"#f3f4f6",borderRadius:8,padding:"9px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{TASK_TYPES.find(t=>t.id===form.type)?.emoji}</span><span style={{fontSize:14,fontWeight:700,color:"#1f1535"}}>{form.title}</span></div>}
                          <div style={{marginBottom:14}}><label style={s_lbl}>Who's involved?</label><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{[{id:"all",name:"Everyone",color:APP_COLOR,emoji:"👨‍👩‍👧‍👦"},...settings.members].map(m=>{const sel=form.members.includes(m.id);return<button key={m.id} onClick={()=>toggleMember(m.id)} style={{background:sel?m.color:"#fff",color:sel?"#fff":"#374151",border:`2px solid ${sel?m.color:"#e5e7eb"}`,borderRadius:20,padding:"6px 11px",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:3}}>{m.emoji} {m.name}</button>;})}</div></div>
                          <div style={{marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderRadius:10,padding:"10px 14px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}><div><div style={{fontSize:13,fontWeight:700,color:"#1f1535"}}>All day</div><div style={{fontSize:10,color:"#9ca3af"}}>No time needed</div></div><button onClick={()=>setForm(f=>({...f,allDay:!f.allDay,startTime:"",endTime:""}))} style={{width:40,height:24,borderRadius:12,border:"none",cursor:"pointer",background:form.allDay?APP_COLOR:"#e5e7eb",position:"relative",flexShrink:0}}><span style={{position:"absolute",top:3,left:form.allDay?18:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/></button></div>
                          <div style={{marginBottom:14}}><label style={s_lbl}>Date</label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><div style={{fontSize:10,color:"#9ca3af",marginBottom:3,fontWeight:600}}>Start</div><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value,endDate:e.target.value>f.endDate?e.target.value:f.endDate}))} style={s_inp}/></div><div><div style={{fontSize:10,color:"#9ca3af",marginBottom:3,fontWeight:600}}>End</div><input type="date" value={form.endDate} min={form.date} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} style={s_inp}/></div></div>{form.date!==form.endDate&&<div style={{fontSize:11,color:APP_COLOR,fontWeight:600,marginTop:4}}>📆 {Math.round((parseDate(form.endDate)-parseDate(form.date))/86400000)+1} days</div>}</div>
                          {!form.allDay&&<div style={{marginBottom:14}}><label style={s_lbl}>Time</label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><div style={{fontSize:10,color:"#9ca3af",marginBottom:3,fontWeight:600}}>Start</div><input type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} style={s_inp}/></div><div><div style={{fontSize:10,color:"#9ca3af",marginBottom:3,fontWeight:600}}>End</div><input type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} style={s_inp}/></div></div></div>}
                          <div style={{marginBottom:14}}><label style={s_lbl}>Location <span style={{fontWeight:400,fontSize:10,textTransform:"none"}}>(optional)</span></label><input value={form.location||""} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Geelong Football Club" style={s_inp}/></div>
                          <div style={{marginBottom:14}}>
                            <label style={s_lbl}>Repeat</label>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{RECUR_OPTIONS.map(r=><button key={r.id} onClick={()=>setForm(f=>({...f,recurring:r.id}))} style={{background:form.recurring===r.id?APP_COLOR:"#fff",color:form.recurring===r.id?"#fff":"#374151",border:`1.5px solid ${form.recurring===r.id?APP_COLOR:"#e5e7eb"}`,borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{r.label}</button>)}</div>
                            {form.recurring==="custom"&&(
                              <div style={{display:"flex",alignItems:"center",gap:7,marginTop:8,background:"#f9fafb",borderRadius:10,padding:"9px 11px"}}>
                                <span style={{fontSize:12,color:"#374151",fontWeight:600}}>Every</span>
                                <input type="number" min="1" value={form.customInterval||1} onChange={e=>setForm(f=>({...f,customInterval:e.target.value}))} style={{width:48,border:"1.5px solid #e5e7eb",borderRadius:7,padding:"5px 6px",fontSize:12,textAlign:"center",outline:"none"}}/>
                                <select value={form.customUnit||"months"} onChange={e=>setForm(f=>({...f,customUnit:e.target.value}))} style={{border:"1.5px solid #e5e7eb",borderRadius:7,padding:"5px 8px",fontSize:12,outline:"none",background:"#fff"}}>
                                  <option value="days">day(s)</option>
                                  <option value="weeks">week(s)</option>
                                  <option value="months">month(s)</option>
                                </select>
                              </div>
                            )}
                          </div>
                          <div style={{marginBottom:20}}><label style={s_lbl}>Notes (optional)</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any extra details..." rows={2} style={{...s_inp,resize:"none",fontFamily:"inherit"}}/></div>
                          <button onClick={submitEvent} disabled={!form.title||!form.members.length||!form.date} style={{width:"100%",background:(!form.title||!form.members.length||!form.date)?"#e5e7eb":"linear-gradient(135deg,#4f46e5,#7c3aed)",color:(!form.title||!form.members.length||!form.date)?"#9ca3af":"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer"}}>{isEdit?"Save Changes":"Add to Calendar"}</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <DesktopRightPanel
          settings={settings} memberCounts={memberCounts}
          upcomingBds={upcomingBds} gardenJobs={gardenJobs}
          allEvents={allEvents} birthdays={birthdays} today={today}
        />
      </div>
    );
  }

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#f8f7ff",minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:90}}>

      {Modals}

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)",color:"#fff",padding:"20px 20px 14px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:3,opacity:0.6,textTransform:"uppercase"}}>{APP_TAGLINE}</div>
            <div style={{fontSize:22,fontWeight:800,marginTop:2,letterSpacing:"-0.3px"}}><span style={{opacity:0.7,fontWeight:400}}>✦ </span>Life Org</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={refreshData} title="Refresh" style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,transition:"transform 0.4s",transform:syncing?"rotate(360deg)":"rotate(0deg)"}}>
              {syncing?"⏳":"🔄"}
            </button>
            {view!=="add"&&<button onClick={()=>openAdd()} style={{background:"rgba(255,255,255,0.2)",border:"1.5px solid rgba(255,255,255,0.4)",color:"#fff",borderRadius:12,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>+</span> Add</button>}
          </div>
        </div>
        {view==="week"&&(
          <div style={{display:"flex",gap:7,marginTop:14,overflowX:"auto",paddingBottom:2}}>
            {MEMBERS_ALL.map(m=><button key={m.id} onClick={()=>setFilterMember(m.id)} style={{background:filterMember===m.id?"#fff":"rgba(255,255,255,0.15)",color:filterMember===m.id?m.color:"#fff",border:"none",borderRadius:20,padding:"5px 11px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{m.emoji} {m.name}</button>)}
          </div>
        )}
      </div>

      {/* Week view */}
      {view==="week"&&(
        <div ref={pullRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{padding:"0 0 20px",overflowY:"auto"}}>

          {/* Pull-to-refresh indicator */}
          {pullDistance>0&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:pullDistance*0.6,transition:"height 0.1s",overflow:"hidden"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:pullDistance/PULL_THRESHOLD}}>
                <div style={{fontSize:20,transform:`rotate(${pullDistance*2}deg)`,transition:"transform 0.1s"}}>{pullDistance>=PULL_THRESHOLD?"✅":"🔄"}</div>
                <div style={{fontSize:11,color:"#6b7280",fontWeight:600}}>{pullDistance>=PULL_THRESHOLD?"Release to refresh":"Pull to refresh"}</div>
              </div>
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px 8px"}}>
            <button onClick={()=>setWeekOffset(o=>o-1)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:APP_COLOR}}>‹</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:"#6b7280",fontWeight:500}}>{weekOffset===0?"This Week":weekOffset===1?"Next Week":weekOffset===-1?"Last Week":""}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#1f1535"}}>{weekLabel}</div>
            </div>
            <button onClick={()=>setWeekOffset(o=>o+1)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:APP_COLOR}}>›</button>
          </div>

          <div style={{margin:"0 20px 14px",background:"#fff",borderRadius:14,padding:"12px 10px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase"}}>Week at a glance</div>
              <button onClick={()=>setShareMode(true)} style={{background:"#f3f4ff",border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,color:APP_COLOR,cursor:"pointer"}}>📤 Share</button>
            </div>
            <div style={{display:"flex",gap:4}}>
              {settings.members.map(m=>(
                <div key={m.id} style={{flex:1,textAlign:"center"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:m.color+"20",border:`2px solid ${m.color}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 3px",fontSize:14}}>{m.emoji}</div>
                  <div style={{fontSize:9,fontWeight:700,color:"#374151"}}>{m.name}</div>
                  <div style={{fontSize:16,fontWeight:800,color:m.color,lineHeight:1.2}}>{memberCounts[m.id]||0}</div>
                  <div style={{fontSize:8,color:"#9ca3af"}}>events</div>
                </div>
              ))}
            </div>
          </div>

          {upcomingBds.length>0&&<div style={{margin:"0 20px 12px",background:"linear-gradient(135deg,#fef3c7,#fde68a)",borderRadius:12,padding:"10px 14px",border:"1px solid #fcd34d"}}><div style={{fontSize:12,fontWeight:800,color:"#92400e"}}>🎂 {upcomingBds.map(b=>b.title).join("  ·  ")}</div></div>}

          {totalWeekEvents===0&&(
            <div style={{margin:"20px 20px 0",background:"#fff",borderRadius:16,padding:"32px 20px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:44,marginBottom:12}}>🌿</div>
              <div style={{fontSize:16,fontWeight:800,color:"#1f1535",marginBottom:6}}>Nothing on this week</div>
              <div style={{fontSize:13,color:"#9ca3af",marginBottom:20}}>Tap any day to add an event, or hit + below</div>
              <button onClick={()=>openAdd()} style={{background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:700,cursor:"pointer"}}>+ Add First Event</button>
            </div>
          )}

          {weekDays.map(day=>{
            const ds=fmt(day);
            const termIdx=termForDay(ds);
            const termBg=termIdx>=0?TERM_COLORS[termIdx%4]:null;
            const ph=VIC_HOLIDAYS[ds];
            const dayEvs=eventsByDay[ds]||[];
            const dayJobs=filterMember==="all"?gardenByDay[ds]||[]:[];
            const isEmpty=!dayEvs.length&&!dayJobs.length;
            const isToday=ds===today;
            return(
              <div key={ds} style={{margin:"0 20px 8px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                  <button onClick={()=>openAdd(ds)} style={{width:36,height:36,borderRadius:"50%",flexShrink:0,border:"none",cursor:"pointer",background:isToday?APP_COLOR:ph?"#dc2626":"#e5e7eb",color:isToday||ph?"#fff":"#374151",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,lineHeight:1.1}}>
                    <span style={{fontSize:7}}>{day.toLocaleDateString("en-AU",{weekday:"short"}).toUpperCase()}</span>
                    <span style={{fontSize:15}}>{day.getDate()}</span>
                  </button>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                    {ph&&<span style={{fontSize:10,fontWeight:700,color:"#dc2626",background:"#fef2f2",borderRadius:6,padding:"2px 8px",border:"1px solid #fecaca"}}>🏖️ {ph}</span>}
                    {termIdx>=0&&<span style={{fontSize:10,fontWeight:700,color:TERM_TEXT_COLORS[termIdx%4],background:termBg,borderRadius:6,padding:"2px 8px"}}>📚 {terms[termIdx]?.label||`Term ${termIdx+1}`}</span>}
                    {isEmpty&&<span style={{fontSize:12,color:"#d1d5db",fontStyle:"italic"}}>Free day — tap to add</span>}
                  </div>
                </div>
                <div style={termBg&&!isEmpty?{background:termBg,borderRadius:10,padding:"4px 6px"}:{}}>
                  {dayEvs.map(ev=><EventPill key={ev.id+ds} ev={ev} dateStr={ds} members={settings.members} expandedEv={expandedEv} setExpandedEv={setExpandedEv} openEdit={openEdit} confirmDelete={confirmDelete}/>)}
                  {dayJobs.map(job=><GardenPill key={job.id} job={job}/>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit */}
      {view==="add"&&(
        <div style={{padding:"0 20px 30px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 0 6px"}}>
            <button onClick={()=>{if(step>1&&!isEdit)setStep(s=>s-1);else{setView("week");setForm(blankForm());setEditingId(null);}}} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:16}}>←</button>
            <div style={{flex:1,display:"flex",gap:5}}>{[1,2,3].map(s=><div key={s} style={{flex:1,height:3,borderRadius:4,background:s<=step?APP_COLOR:"#e5e7eb",transition:"background 0.3s"}}/>)}</div>
            {isEdit&&<span style={{fontSize:12,fontWeight:700,color:APP_COLOR}}>Editing</span>}
          </div>

          {step===1&&(
            <>
              <div style={{fontSize:20,fontWeight:800,color:"#1f1535",marginTop:8,marginBottom:4}}>What type of event?</div>
              <div style={{fontSize:13,color:"#6b7280",marginBottom:18}}>Choose a category</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {TASK_TYPES.map(tp=>(
                  <button key={tp.id} onClick={()=>{setForm(f=>({...f,type:tp.id,title:"",members:tp.id==="pet"&&petMember?[petMember.id]:[]}));setStep(tp.id==="birthday"?3:2);}} style={{background:"#fff",border:`2px solid ${form.type===tp.id?tp.color:"#e5e7eb"}`,borderRadius:14,padding:"14px 8px",cursor:"pointer",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                    <div style={{fontSize:26,marginBottom:5}}>{tp.emoji}</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#374151",lineHeight:1.2}}>{tp.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step===2&&form.type&&(
            <>
              <div style={{fontSize:20,fontWeight:800,color:"#1f1535",marginTop:8,marginBottom:4}}>{getType(form.type)?.emoji} {getType(form.type)?.label}</div>
              <div style={{fontSize:13,color:"#6b7280",marginBottom:18}}>Select or type your own</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {PRESET_TASKS[form.type]?.map(p=>(
                  <button key={p} onClick={()=>{setForm(f=>({...f,title:p,customTitle:false}));setStep(3);}} style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,padding:"13px 16px",cursor:"pointer",textAlign:"left",fontSize:14,fontWeight:600,color:"#1f1535",display:"flex",alignItems:"center",justifyContent:"space-between"}}>{p}<span style={{color:"#d1d5db"}}>›</span></button>
                ))}
                <button onClick={()=>{setForm(f=>({...f,title:"",customTitle:true}));setStep(3);}} style={{background:"linear-gradient(135deg,#f3f4ff,#faf5ff)",border:"1.5px dashed #a5b4fc",borderRadius:12,padding:"13px 16px",cursor:"pointer",textAlign:"left",fontSize:14,fontWeight:600,color:APP_COLOR,display:"flex",alignItems:"center",gap:8}}>✏️ Type my own...</button>
              </div>
            </>
          )}

          {step===3&&(
            <>
              <div style={{fontSize:20,fontWeight:800,color:"#1f1535",marginTop:8,marginBottom:18}}>{form.type==="birthday"?"🎂 Birthday details":isEdit?"Edit event":"Event details"}</div>
              {form.type==="birthday"?(
                <>
                  <div style={{marginBottom:16}}><label style={s_lbl}>Whose birthday?</label><input value={form.bdName} onChange={e=>setForm(f=>({...f,bdName:e.target.value}))} placeholder="e.g. Uncle Luke, Grandma Sue..." style={s_inp}/></div>
                  <div style={{marginBottom:16}}>
                    <label style={s_lbl}>Date of birth</label>
                    <input type="date" value={form.bdDob} onChange={e=>setForm(f=>({...f,bdDob:e.target.value}))} style={s_inp}/>
                    {form.bdName&&form.bdDob&&<div style={{marginTop:8,background:"#fdf2f8",borderRadius:10,padding:"10px 14px",border:"1px solid #fbcfe8"}}><div style={{fontSize:12,color:"#9d174d",fontWeight:700,marginBottom:2}}>Preview:</div><div style={{fontSize:14,fontWeight:700,color:"#1f1535"}}>{getBdTitle({name:form.bdName,dob:form.bdDob},new Date().getFullYear())}</div><div style={{fontSize:11,color:"#6b7280",marginTop:3}}>🔁 Repeats every year · Age updates automatically</div></div>}
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={s_lbl}>Relationship</label>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[{id:"family",l:"Family",e:"🏠"},{id:"friend",l:"Friend",e:"👥"},{id:"work",l:"Work",e:"💼"},{id:"other",l:"Other",e:"📌"}].map(c=><button key={c.id} onClick={()=>setForm(f=>({...f,bdCategory:c.id}))} style={{background:form.bdCategory===c.id?"#f43f5e":"#fff",color:form.bdCategory===c.id?"#fff":"#374151",border:`1.5px solid ${form.bdCategory===c.id?"#f43f5e":"#e5e7eb"}`,borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:600}}>{c.e} {c.l}</button>)}</div>
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={s_lbl}>Link to family member <span style={{fontWeight:400,fontSize:11,textTransform:"none"}}>(optional)</span></label>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <button onClick={()=>setForm(f=>({...f,bdMemberId:""}))} style={{background:!form.bdMemberId?"#f3f4f6":"#fff",color:"#374151",border:`1.5px solid ${!form.bdMemberId?"#6b7280":"#e5e7eb"}`,borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>None</button>
                      {settings.members.map(m=><button key={m.id} onClick={()=>setForm(f=>({...f,bdMemberId:m.id}))} style={{background:form.bdMemberId===m.id?m.color:"#fff",color:form.bdMemberId===m.id?"#fff":"#374151",border:`1.5px solid ${form.bdMemberId===m.id?m.color:"#e5e7eb"}`,borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{m.emoji} {m.name}</button>)}
                    </div>
                  </div>
                  <div style={{marginBottom:24}}><label style={s_lbl}>Notes (optional)</label><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Surprise party planned!" style={s_inp}/></div>
                  <button onClick={submitEvent} disabled={!form.bdName||!form.bdDob} style={{width:"100%",background:(!form.bdName||!form.bdDob)?"#e5e7eb":"linear-gradient(135deg,#f43f5e,#e11d48)",color:(!form.bdName||!form.bdDob)?"#9ca3af":"#fff",border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,cursor:"pointer"}}>Save Birthday 🎂</button>
                </>
              ):(
                <>
                  {(form.customTitle||isEdit)?<div style={{marginBottom:16}}><label style={s_lbl}>Title</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Event name" style={s_inp}/></div>
                    :<div style={{background:"#f3f4f6",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{getType(form.type)?.emoji}</span><span style={{fontSize:15,fontWeight:700,color:"#1f1535"}}>{form.title}</span></div>}
                  <div style={{marginBottom:16}}>
                    <label style={s_lbl}>Who's involved?</label>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{MEMBERS_ALL.map(m=>{const sel=form.members.includes(m.id);return<button key={m.id} onClick={()=>toggleMember(m.id)} style={{background:sel?m.color:"#fff",color:sel?"#fff":"#374151",border:`2px solid ${sel?m.color:"#e5e7eb"}`,borderRadius:20,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>{m.emoji} {m.name}</button>;})}</div>
                  </div>
                  <div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderRadius:12,padding:"12px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
                    <div><div style={{fontSize:14,fontWeight:700,color:"#1f1535"}}>All day event</div><div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>Blocks the full day — no time needed</div></div>
                    <button onClick={()=>setForm(f=>({...f,allDay:!f.allDay,startTime:"",endTime:""}))} style={{width:44,height:26,borderRadius:13,border:"none",cursor:"pointer",background:form.allDay?APP_COLOR:"#e5e7eb",position:"relative",flexShrink:0}}>
                      <span style={{position:"absolute",top:3,left:form.allDay?20:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                    </button>
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={s_lbl}>Date</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div><div style={{fontSize:11,color:"#9ca3af",marginBottom:4,fontWeight:600}}>Start</div><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value,endDate:e.target.value>f.endDate?e.target.value:f.endDate}))} style={s_inp}/></div>
                      <div><div style={{fontSize:11,color:"#9ca3af",marginBottom:4,fontWeight:600}}>End</div><input type="date" value={form.endDate} min={form.date} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} style={s_inp}/></div>
                    </div>
                    {form.date!==form.endDate&&<div style={{fontSize:11,color:APP_COLOR,fontWeight:600,marginTop:6}}>📆 Spans {Math.round((parseDate(form.endDate)-parseDate(form.date))/86400000)+1} days</div>}
                  </div>
                  {!form.allDay&&(
                    <div style={{marginBottom:16}}>
                      <label style={s_lbl}>Time</label>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div><div style={{fontSize:11,color:"#9ca3af",marginBottom:4,fontWeight:600}}>Start</div><input type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} style={s_inp}/></div>
                        <div><div style={{fontSize:11,color:"#9ca3af",marginBottom:4,fontWeight:600}}>End <span style={{fontSize:9,opacity:0.6}}>(1hr default)</span></div><input type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} style={s_inp}/></div>
                      </div>
                    </div>
                  )}
                  <div style={{marginBottom:16}}>
                    <label style={s_lbl}>Location <span style={{fontWeight:400,fontSize:11,textTransform:"none"}}>(optional)</span></label>
                    <input value={form.location||""} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Geelong Football Club" style={s_inp}/>
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={s_lbl}>Repeat</label>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{RECUR_OPTIONS.map(r=><button key={r.id} onClick={()=>setForm(f=>({...f,recurring:r.id}))} style={{background:form.recurring===r.id?APP_COLOR:"#fff",color:form.recurring===r.id?"#fff":"#374151",border:`1.5px solid ${form.recurring===r.id?APP_COLOR:"#e5e7eb"}`,borderRadius:20,padding:"6px 13px",cursor:"pointer",fontSize:12,fontWeight:600}}>{r.label}</button>)}</div>
                    {form.recurring==="custom"&&(
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,background:"#f9fafb",borderRadius:10,padding:"10px 12px"}}>
                        <span style={{fontSize:13,color:"#374151",fontWeight:600}}>Every</span>
                        <input type="number" min="1" value={form.customInterval||1} onChange={e=>setForm(f=>({...f,customInterval:e.target.value}))} style={{width:56,border:"1.5px solid #e5e7eb",borderRadius:8,padding:"6px 8px",fontSize:13,textAlign:"center",outline:"none"}}/>
                        <select value={form.customUnit||"months"} onChange={e=>setForm(f=>({...f,customUnit:e.target.value}))} style={{border:"1.5px solid #e5e7eb",borderRadius:8,padding:"6px 10px",fontSize:13,outline:"none",background:"#fff"}}>
                          <option value="days">day(s)</option>
                          <option value="weeks">week(s)</option>
                          <option value="months">month(s)</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{marginBottom:24}}><label style={s_lbl}>Notes (optional)</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any extra details..." rows={2} style={{...s_inp,resize:"none",fontFamily:"inherit"}}/></div>
                  <button onClick={submitEvent} disabled={!form.title||!form.members.length||!form.date} style={{width:"100%",background:(!form.title||!form.members.length||!form.date)?"#e5e7eb":"linear-gradient(135deg,#4f46e5,#7c3aed)",color:(!form.title||!form.members.length||!form.date)?"#9ca3af":"#fff",border:"none",borderRadius:14,padding:"16px",fontSize:16,fontWeight:700,cursor:"pointer"}}>{isEdit?"Save Changes":"Add to Calendar"}</button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {view==="notes"     &&<NotesView notes={notes} setNotes={setNotes} onDeleteNote={deleteNote}/>}
      {view==="marley"    &&<MarleyView allEvents={allEvents} petMember={petMember} setView={setView} setForm={setForm} petInfo={petInfo} setPetInfo={setPetInfo}/>}
      {view==="birthdays" &&<BirthdaysView birthdays={birthdays} setBirthdays={setBirthdays} upcomingBds={upcomingBds} setBdForm={setBdForm} setShowBdForm={setShowBdForm} onDeleteBirthday={deleteBirthday}/>}
      {view==="settings"  &&<SettingsView settings={settings} setSettings={setSettings} terms={terms} setTerms={setTerms} onExport={handleExport} showToast={showToast}/>}

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:"1px solid #f3f4f6",display:"flex",padding:"8px 0 14px",zIndex:10}}>
        {[
          {id:"week",     icon:"📅", label:"Calendar"},
          {id:"notes",    icon:"📝", label:"Notes"},
          {id:"__add__",  isAdd:true},
          {id:"marley",   icon:petMember?.emoji||"🐾", label:petMember?.name||"Marley"},
          {id:"birthdays",icon:"🎂", label:"Birthdays", badge:bdBadge},
          {id:"settings", icon:"⚙️", label:"Settings"},
        ].map(tab=>{
          if(tab.isAdd)return(
            <button key="add" onClick={()=>openAdd()} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,paddingTop:4}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",marginTop:-18,boxShadow:"0 4px 14px rgba(79,70,229,0.45)"}}>
                <span style={{fontSize:22,color:"#fff",lineHeight:1}}>+</span>
              </div>
              <span style={{fontSize:9,fontWeight:700,color:view==="add"?APP_COLOR:"#9ca3af",marginTop:2}}>Add</span>
            </button>
          );
          const active=view===tab.id;
          return(
            <button key={tab.id} onClick={()=>setView(tab.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,paddingTop:4}}>
              <div style={{position:"relative"}}>
                <span style={{fontSize:20}}>{tab.icon}</span>
                {tab.badge&&<span style={{position:"absolute",top:-2,right:-4,width:8,height:8,borderRadius:"50%",background:"#f43f5e",border:"1.5px solid #fff"}}/>}
              </div>
              <span style={{fontSize:9,fontWeight:700,color:active?APP_COLOR:"#9ca3af"}}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
