import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./large-responsive.css";

declare global { interface Window { firebase: any } }

type Status = "To Do" | "In Progress" | "Waiting" | "Completed";
type Priority = "Low" | "Medium" | "High" | "Critical";
type Task = { id: string; title: string; project: string; status: Status; priority: Priority; due: string; notes: string; duration: number; completedAt?: string };
type ProjectInfo = { name: string; description: string; link: string };

const today = new Date();
const iso = (offset: number) => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const seed: Task[] = [
  { id:"1", title:"Finalize homepage copy", project:"Website Refresh", status:"In Progress", priority:"High", due:iso(1), notes:"Review final headline with the team", duration:60 },
  { id:"2", title:"Send campaign brief", project:"Spring Launch", status:"Completed", priority:"Critical", due:iso(-1), notes:"Shared with creative partners", duration:30 },
  { id:"3", title:"Book photographer", project:"Spring Launch", status:"Waiting", priority:"Medium", due:iso(4), notes:"Waiting on availability", duration:20 },
  { id:"4", title:"Review Q3 budget", project:"Operations", status:"To Do", priority:"High", due:iso(2), notes:"Check vendor estimates", duration:45 },
  { id:"5", title:"Update brand guidelines", project:"Website Refresh", status:"To Do", priority:"Medium", due:iso(7), notes:"Add the new pastel palette", duration:90 },
  { id:"6", title:"Prepare client check-in", project:"Client Work", status:"In Progress", priority:"Low", due:iso(0), notes:"Collect status notes", duration:25 },
  { id:"7", title:"Archive old invoices", project:"Operations", status:"Completed", priority:"Low", due:iso(-3), notes:"", duration:30 },
  { id:"8", title:"Draft launch captions", project:"Spring Launch", status:"To Do", priority:"High", due:iso(5), notes:"Three platform variants", duration:75 },
];
const projects = ["Website Refresh", "Spring Launch", "Operations", "Client Work"];
const initialProjectInfo: ProjectInfo[] = [
  { name:"Website Refresh", description:"Refresh the website experience, messaging, and visual brand for a softer, clearer customer journey.", link:"https://github.com/" },
  { name:"Spring Launch", description:"Coordinate creative, campaign content, partners, and launch-day details for the seasonal release.", link:"https://drive.google.com/" },
  { name:"Operations", description:"Keep internal systems, budgets, documentation, and recurring administrative work organized.", link:"https://www.notion.so/" },
  { name:"Client Work", description:"Track deliverables, meetings, follow-ups, and shared resources for active client engagements.", link:"https://www.canva.com/" },
];
const projectClass = (p:string) => "project-" + (projects.indexOf(p) % 4 + 1);
const nav = [
  ["Dashboard","⌂"],["Projects","♡"],["Table View","☷"],["Calendar","□"],["Kanban","▦"],["Eisenhower","◇"],["Daily Planner","☀"],["Daily Recap","✓"],["Weekly Planner","▤"]
];
const firebaseConfig = {
  apiKey: "AIzaSyBgYC6lw3KLfu8D_qdjMRme3BT4gkHmfug",
  authDomain: "task-tracker-33bc4.firebaseapp.com",
  projectId: "task-tracker-33bc4",
  storageBucket: "task-tracker-33bc4.firebasestorage.app",
  messagingSenderId: "143739702025",
  appId: "1:143739702025:web:fef469d60ec04c5ec6a1d8"
};

function App(){
  const [tasks,setTasks] = useState<Task[]>(()=>{ try{return JSON.parse(localStorage.getItem("petal-tasks")||"")||seed}catch{return seed} });
  const [projectInfo,setProjectInfo] = useState<ProjectInfo[]>(()=>{ try{return JSON.parse(localStorage.getItem("petal-projects")||"")||initialProjectInfo}catch{return initialProjectInfo} });
  const [view,setView] = useState("Dashboard");
  const [search,setSearch] = useState("");
  const [project,setProject] = useState("All projects");
  const [editing,setEditing] = useState<Task|null>(null);
  const [editingProject,setEditingProject] = useState<ProjectInfo|null>(null);
  const [menu,setMenu] = useState(false);
  const [user,setUser] = useState<any>(null);
  const [authOpen,setAuthOpen] = useState(false);
  const [cloudReady,setCloudReady] = useState(false);
  const [authResolved,setAuthResolved] = useState(false);
  const [syncState,setSyncState] = useState("Saved on this device");
  const [selected,setSelected] = useState<string[]>([]);
  useEffect(()=>localStorage.setItem("petal-tasks",JSON.stringify(tasks)),[tasks]);
  useEffect(()=>localStorage.setItem("petal-projects",JSON.stringify(projectInfo)),[projectInfo]);
  useEffect(()=>{
    if(!window.firebase){setSyncState("Could not connect to sign in");setAuthResolved(true);return}
    if(!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig);
    const auth=window.firebase.auth(), db=window.firebase.firestore();
    let hadAuthenticatedUser=false;
    db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
    return auth.onAuthStateChanged(async(current:any)=>{
      setAuthResolved(true);
      setUser(current); setCloudReady(false);
      if(!current){if(hadAuthenticatedUser){setTasks(seed);setProjectInfo(initialProjectInfo)}setSyncState("Saved on this device");return}
      hadAuthenticatedUser=true;
      setSyncState("Loading your cloud tasks…");
      try{
        const ref=db.collection("users").doc(current.uid).collection("data").doc("tracker");
        const snap=await ref.get();
        if(snap.exists){const data=snap.data();if(Array.isArray(data.tasks))setTasks(data.tasks);if(Array.isArray(data.projects))setProjectInfo(data.projects)}
        else {const localTasks=JSON.parse(localStorage.getItem("petal-tasks")||"[]");const localProjects=JSON.parse(localStorage.getItem("petal-projects")||"[]");await ref.set({tasks:localTasks.length?localTasks:seed,projects:localProjects.length?localProjects:initialProjectInfo,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()})}
        setCloudReady(true);setSyncState("Synced across your devices");
      }catch(e){console.error(e);setSyncState("Cloud setup needed — saved locally")}
    })
  },[]);
  useEffect(()=>{
    if(!user||!cloudReady||!window.firebase)return;
    setSyncState("Saving…");
    const timer=setTimeout(()=>window.firebase.firestore().collection("users").doc(user.uid).collection("data").doc("tracker").set({tasks,projects:projectInfo,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()}).then(()=>setSyncState("Synced across your devices")).catch(()=>setSyncState("Couldn’t sync — saved locally")),500);
    return()=>clearTimeout(timer)
  },[tasks,projectInfo,user,cloudReady]);
  const shown=useMemo(()=>tasks.filter(t=>(project==="All projects"||t.project===project)&&t.title.toLowerCase().includes(search.toLowerCase())),[tasks,project,search]);
  const done=tasks.filter(t=>t.status==="Completed").length;
  const overdue=tasks.filter(t=>t.status!=="Completed"&&t.due<iso(0)).length;
  const add=()=>setEditing({id:crypto.randomUUID(),title:"",project:projects[0],status:"To Do",priority:"Medium",due:iso(1),notes:"",duration:30});
  const save=(t:Task)=>{setTasks(x=>{const old=x.find(a=>a.id===t.id);const next={...t,completedAt:t.status==="Completed"?(old?.completedAt||iso(0)):undefined};return old?x.map(a=>a.id===t.id?next:a):[next,...x]});setEditing(null)};
  const del=(id:string)=>{setTasks(x=>x.filter(t=>t.id!==id));setEditing(null)};
  const bulkStatus=(status:Status)=>{setTasks(x=>x.map(t=>selected.includes(t.id)?{...t,status,completedAt:status==="Completed"?(t.completedAt||iso(0)):undefined}:t));setSelected([])};
  const bulkDelete=()=>{if(selected.length&&confirm(`Delete ${selected.length} selected task${selected.length===1?"":"s"}?`)){setTasks(x=>x.filter(t=>!selected.includes(t.id)));setSelected([])}};
  if(!authResolved)return <div className="auth-gate loading-gate"><span>✿</span><h2>Opening Petal Planner…</h2></div>;
  if(!user)return <AuthModal fullPage/>;
  return <div className="app-shell">
    <aside className={menu?"sidebar open":"sidebar"}>
      <div className="brand"><span className="brand-mark">✿</span><div><strong>Petal</strong><small>PLANNER</small></div></div>
      <nav>{nav.map(([label,icon])=><button key={label} className={view===label?"active":""} onClick={()=>{setView(label);setMenu(false)}}><span>{icon}</span>{label}</button>)}</nav>
      <div className="sidebar-note"><span>♡</span><strong>A little progress<br/>is still progress.</strong><small>Your changes save automatically.</small></div>
    </aside>
    <main>
      <header><button className="menu-btn" onClick={()=>setMenu(!menu)} aria-label="Open menu">☰</button><div><p className="eyebrow">MY WORKSPACE</p><h1>{view}</h1></div><div className="header-actions"><label className="search">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks..."/></label><button className="account-button signed-in" onClick={()=>window.firebase.auth().signOut()} title="Sign out">{user.email?.slice(0,1).toUpperCase()}</button><button className="primary" onClick={add}>＋ New task</button></div></header>
      <div className="filters"><div><span className={`live-dot ${user&&cloudReady?"cloud":""}`}></span><span>{syncState}</span></div><select value={project} onChange={e=>setProject(e.target.value)}><option>All projects</option>{projects.map(p=><option key={p}>{p}</option>)}</select></div>
      {view==="Dashboard"&&<Dashboard tasks={shown} done={done} overdue={overdue} onEdit={setEditing}/>} 
      {view==="Projects"&&<ProjectsView projects={projectInfo} tasks={tasks} onEdit={setEditingProject}/>} 
      {view==="Table View"&&<Table tasks={shown} onEdit={setEditing} selected={selected} setSelected={setSelected} onStatus={bulkStatus} onDelete={bulkDelete}/>} 
      {view==="Kanban"&&<Kanban tasks={shown} onEdit={setEditing}/>} 
      {view==="Calendar"&&<Calendar tasks={shown} onEdit={setEditing}/>} 
      {view==="Eisenhower"&&<Eisenhower tasks={shown} onEdit={setEditing}/>} 
      {view==="Daily Planner"&&<Daily tasks={shown} onEdit={setEditing}/>} 
      {view==="Daily Recap"&&<DailyRecap tasks={shown} onEdit={setEditing}/>} 
      {view==="Weekly Planner"&&<Weekly tasks={shown} onEdit={setEditing}/>} 
    </main>
    {editing&&<TaskModal task={editing} onSave={save} onDelete={del} onClose={()=>setEditing(null)}/>} 
    {editingProject&&<ProjectModal project={editingProject} onSave={p=>{setProjectInfo(x=>x.map(a=>a.name===p.name?p:a));setEditingProject(null)}} onClose={()=>setEditingProject(null)}/>} 
    {authOpen&&<AuthModal onClose={()=>setAuthOpen(false)}/>} 
  </div>
}

function safeLink(link:string){return /^https?:\/\//i.test(link)?link:`https://${link}`}
function ProjectsView({projects,tasks,onEdit}:{projects:ProjectInfo[],tasks:Task[],onEdit:(p:ProjectInfo)=>void}){return <div className="content projects-view"><section className="projects-hero"><div><p className="eyebrow">PROJECT LIBRARY</p><h2>Everything has a home.</h2><p>Keep the purpose and most useful resource for every project close at hand.</p></div><span>✿</span></section><div className="project-cards">{projects.map((p,i)=>{const pt=tasks.filter(t=>t.project===p.name),complete=pt.filter(t=>t.status==="Completed").length,pct=Math.round(complete/Math.max(pt.length,1)*100);return <article className={`project-card project-card-${i+1}`} key={p.name}><div className="project-card-top"><span className={`project-number project-${i+1}`}>0{i+1}</span><button onClick={()=>onEdit(p)} aria-label={`Edit ${p.name}`}>•••</button></div><h3>{p.name}</h3><p>{p.description}</p><div className="project-meta"><span><b>{pt.length}</b> tasks</span><span><b>{complete}</b> completed</span></div><div className="project-progress"><div><span>Progress</span><b>{pct}%</b></div><div className="progress"><i className={`project-${i+1}`} style={{width:`${pct}%`}}></i></div></div><div className="project-footer">{p.link?<a href={safeLink(p.link)} target="_blank" rel="noreferrer">Open project link ↗</a>:<span>No link added</span>}<button onClick={()=>onEdit(p)}>Edit details</button></div></article>})}</div></div>}

const Badge=({value,type}:{value:string,type:"status"|"priority"})=><span className={`badge ${type}-${value.toLowerCase().replaceAll(" ","-")}`}>{value}</span>;
const TaskLine=({t,onEdit}:{t:Task,onEdit:(t:Task)=>void})=><button className="task-line" onClick={()=>onEdit(t)}><span className={`check ${t.status==="Completed"?"checked":""}`}>{t.status==="Completed"?"✓":""}</span><span className="task-copy"><strong>{t.title}</strong><small>{t.due}</small></span><span className={`project-pill ${projectClass(t.project)}`}>{t.project}</span></button>;

function Dashboard({tasks,done,overdue,onEdit}:{tasks:Task[],done:number,overdue:number,onEdit:(t:Task)=>void}){
 const completion=Math.round(done/Math.max(tasks.length,1)*100); const status=["Completed","In Progress","Waiting","To Do"] as Status[];
 return <div className="content dashboard">
  <section className="welcome"><div><p className="eyebrow">GOOD MORNING</p><h2>Make today bloom.</h2><p>Here’s your gentle overview. One thoughtful task at a time.</p></div><div className="date-flower"><span>✿</span><b>{today.toLocaleDateString("en-US",{weekday:"long"})}</b><small>{today.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</small></div></section>
  <section className="stats"><article className="stat rose"><span>ALL TASKS</span><strong>{tasks.length}</strong><small>across {new Set(tasks.map(t=>t.project)).size} projects</small><i>☷</i></article><article className="stat green"><span>COMPLETED</span><strong>{done}</strong><small>{completion}% completion rate</small><i>✓</i></article><article className="stat blue"><span>IN PROGRESS</span><strong>{tasks.filter(t=>t.status==="In Progress").length}</strong><small>keep the momentum</small><i>↗</i></article><article className="stat coral"><span>OVERDUE</span><strong>{overdue}</strong><small>{overdue?"needs your attention":"all caught up"}</small><i>!</i></article></section>
  <section className="dashboard-grid"><article className="panel"><div className="panel-title"><div><p className="eyebrow">OVERVIEW</p><h3>Status breakdown</h3></div><span>This month⌄</span></div><div className="donut-wrap"><div className="donut" style={{"--pct":`${completion*3.6}deg`} as React.CSSProperties}><div><strong>{completion}%</strong><small>complete</small></div></div><div className="legend">{status.map(s=><div key={s}><span className={`dot status-${s.toLowerCase().replaceAll(" ","-")}`}></span><b>{s}</b><em>{tasks.filter(t=>t.status===s).length}</em></div>)}</div></div></article>
  <article className="panel"><div className="panel-title"><div><p className="eyebrow">FOCUS</p><h3>Project progress</h3></div></div><div className="progress-list">{projects.map((p,i)=>{const pt=tasks.filter(t=>t.project===p),pct=Math.round(pt.filter(t=>t.status==="Completed").length/Math.max(pt.length,1)*100);return <div key={p}><div><b>{p}</b><span>{pct}%</span></div><div className="progress"><i className={projectClass(p)} style={{width:`${pct}%`}}></i></div></div>})}</div></article></section>
  <section className="panel deadlines"><div className="panel-title"><div><p className="eyebrow">COMING UP</p><h3>Upcoming deadlines</h3></div><button onClick={()=>{}}>View all</button></div>{tasks.filter(t=>t.status!=="Completed").sort((a,b)=>a.due.localeCompare(b.due)).slice(0,4).map(t=><TaskLine t={t} onEdit={onEdit} key={t.id}/>)}</section>
 </div>
}

function Table({tasks,onEdit,selected,setSelected,onStatus,onDelete}:{tasks:Task[],onEdit:(t:Task)=>void,selected:string[],setSelected:(ids:string[])=>void,onStatus:(s:Status)=>void,onDelete:()=>void}){const all=tasks.length>0&&tasks.every(t=>selected.includes(t.id));const toggle=(id:string)=>setSelected(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]);return <div className="content"><section className="panel table-panel"><div className="panel-title"><div><p className="eyebrow">MASTER LIST</p><h3>All action items</h3></div><span>{tasks.length} results</span></div>{selected.length>0&&<div className="bulk-bar"><strong>{selected.length} selected</strong><button className="bulk-complete" onClick={()=>onStatus("Completed")}>✓ Mark complete</button><label>Change status<select defaultValue="" onChange={e=>{if(e.target.value)onStatus(e.target.value as Status)}}><option value="" disabled>Choose…</option><option>To Do</option><option>In Progress</option><option>Waiting</option><option>Completed</option></select></label><button className="bulk-delete" onClick={onDelete}>Delete</button><button className="bulk-clear" onClick={()=>setSelected([])}>Clear</button></div>}<div className="table-scroll"><table><thead><tr><th className="select-cell"><input type="checkbox" checked={all} onChange={()=>setSelected(all?[]:tasks.map(t=>t.id))} aria-label="Select all tasks"/></th><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Due date</th></tr></thead><tbody>{tasks.map(t=><tr key={t.id} className={selected.includes(t.id)?"selected-row":""} onClick={()=>onEdit(t)}><td className="select-cell" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected.includes(t.id)} onChange={()=>toggle(t.id)} aria-label={`Select ${t.title}`}/></td><td><strong>{t.title}</strong></td><td><span className={`project-pill ${projectClass(t.project)}`}>{t.project}</span></td><td><Badge value={t.status} type="status"/></td><td><Badge value={t.priority} type="priority"/></td><td>{new Date(t.due+"T12:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</td></tr>)}</tbody></table></div></section></div>}
function Kanban({tasks,onEdit}:{tasks:Task[],onEdit:(t:Task)=>void}){const cols:[Status,string][]=[["To Do","rose"],["In Progress","blue"],["Waiting","yellow"],["Completed","green"]];return <div className="content kanban">{cols.map(([s,c])=><section className={`kanban-col ${c}`} key={s}><header><h3>{s}</h3><span>{tasks.filter(t=>t.status===s).length}</span></header>{tasks.filter(t=>t.status===s).map(t=><button className="kanban-card" key={t.id} onClick={()=>onEdit(t)}><Badge value={t.priority} type="priority"/><strong>{t.title}</strong><span className={`project-pill ${projectClass(t.project)}`}>{t.project}</span><small>◷ {t.due}</small></button>)}</section>)}</div>}
function Calendar({tasks,onEdit}:{tasks:Task[],onEdit:(t:Task)=>void}){const start=new Date(today.getFullYear(),today.getMonth(),1), blank=start.getDay(),days=new Date(today.getFullYear(),today.getMonth()+1,0).getDate();return <div className="content"><section className="panel calendar"><div className="panel-title"><div><p className="eyebrow">MONTHLY VIEW</p><h3>{today.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</h3></div></div><div className="cal-grid weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><b key={d}>{d}</b>)}</div><div className="cal-grid">{Array.from({length:blank},(_,i)=><div className="day muted" key={`b${i}`}></div>)}{Array.from({length:days},(_,i)=>i+1).map(d=><div className={`day ${d===today.getDate()?"today":""}`} key={d}><span>{d}</span>{tasks.filter(t=>new Date(t.due+"T12:00").getMonth()===today.getMonth()&&Number(t.due.slice(-2))===d).slice(0,2).map(t=><button key={t.id} className={projectClass(t.project)} onClick={()=>onEdit(t)}>{t.title}</button>)}</div>)}</div></section></div>}
function Eisenhower({tasks,onEdit}:{tasks:Task[],onEdit:(t:Task)=>void}){const boxes=[{t:"Do first",s:"Urgent · Important",c:"rose",f:(x:Task)=>["Critical","High"].includes(x.priority)&&x.due<=iso(2)},{t:"Schedule",s:"Important · Not urgent",c:"lavender",f:(x:Task)=>["Critical","High"].includes(x.priority)&&x.due>iso(2)},{t:"Delegate",s:"Urgent · Less important",c:"yellow",f:(x:Task)=>["Low","Medium"].includes(x.priority)&&x.due<=iso(2)},{t:"Someday",s:"Not urgent · Less important",c:"green",f:(x:Task)=>["Low","Medium"].includes(x.priority)&&x.due>iso(2)}];return <div className="content matrix">{boxes.map(b=><section className={`matrix-box ${b.c}`} key={b.t}><p className="eyebrow">{b.s}</p><h3>{b.t}</h3>{tasks.filter(b.f).map(t=><TaskLine t={t} onEdit={onEdit} key={t.id}/>)}</section>)}</div>}
function Daily({tasks,onEdit}:{tasks:Task[],onEdit:(t:Task)=>void}){const current=tasks.filter(t=>t.due===iso(0));return <div className="content planner"><section className="panel daily-focus"><p className="eyebrow">TODAY’S INTENTION</p><h2>Move with purpose,<br/><em>not pressure.</em></h2><div className="focus-note">What would make today feel successful?</div></section><section className="panel schedule"><div className="panel-title"><div><p className="eyebrow">{today.toLocaleDateString("en-US",{weekday:"long"}).toUpperCase()}</p><h3>Today’s plan</h3></div><span>{current.reduce((a,t)=>a+t.duration,0)} min</span></div>{current.length?current.map(t=><TaskLine t={t} onEdit={onEdit} key={t.id}/>):<div className="empty">Your day has room to breathe. Add a task when you’re ready.</div>}</section></div>}
function DailyRecap({tasks,onEdit}:{tasks:Task[],onEdit:(t:Task)=>void}){const [date,setDate]=useState(iso(0));const completed=tasks.filter(t=>t.status==="Completed"&&(t.completedAt||t.due)===date);const move=(days:number)=>{const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);setDate(d.toISOString().slice(0,10))};const display=new Date(date+"T12:00:00");const isToday=date===iso(0);return <div className="content recap-view"><section className="recap-hero"><div><p className="eyebrow">DAILY REFLECTION</p><h2>{isToday?"Look what you did today.":"A day worth remembering."}</h2><p>Every completed task is a little proof of progress.</p></div><span>✓</span></section><section className="panel recap-panel"><div className="recap-nav"><button onClick={()=>move(-1)} aria-label="Previous day">←</button><div><p className="eyebrow">{isToday?"TODAY":display.toLocaleDateString("en-US",{weekday:"long"}).toUpperCase()}</p><h3>{display.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</h3></div><input type="date" value={date} max={iso(0)} onChange={e=>setDate(e.target.value)} aria-label="Choose recap date"/><button onClick={()=>move(1)} disabled={isToday} aria-label="Next day">→</button></div><div className="recap-stats"><div><strong>{completed.length}</strong><span>tasks completed</span></div><div><strong>{completed.reduce((n,t)=>n+t.duration,0)}</strong><span>minutes of focused work</span></div><div><strong>{new Set(completed.map(t=>t.project)).size}</strong><span>projects moved forward</span></div></div>{completed.length?<div className="recap-list">{completed.map(t=><button key={t.id} onClick={()=>onEdit(t)}><span className="recap-check">✓</span><div><strong>{t.title}</strong><small>{t.project} · {t.duration} minutes</small>{t.notes&&<p>{t.notes}</p>}</div><Badge value={t.priority} type="priority"/></button>)}</div>:<div className="recap-empty"><span>♡</span><h3>No completions recorded</h3><p>{isToday?"Tasks you finish today will appear here automatically.":"There aren’t any completed tasks saved for this date."}</p></div>}</section></div>}
function Weekly({tasks,onEdit}:{tasks:Task[],onEdit:(t:Task)=>void}){return <div className="content week"><div className="week-intro"><p className="eyebrow">WEEK AT A GLANCE</p><h2>Plan softly. Finish strongly.</h2></div><div className="week-grid">{Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-d.getDay()+i);const key=d.toISOString().slice(0,10);return <section className={`week-day ${key===iso(0)?"current":""}`} key={key}><header><small>{d.toLocaleDateString("en-US",{weekday:"short"})}</small><strong>{d.getDate()}</strong></header>{tasks.filter(t=>t.due===key).map(t=><button key={t.id} className={projectClass(t.project)} onClick={()=>onEdit(t)}>{t.title}<small>{t.duration} min</small></button>)}</section>})}</div></div>}

function AuthModal({onClose,fullPage=false}:{onClose?:()=>void,fullPage?:boolean}){const [mode,setMode]=useState<"login"|"signup">("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError("");try{const auth=window.firebase.auth();if(mode==="signup")await auth.createUserWithEmailAndPassword(email,password);else await auth.signInWithEmailAndPassword(email,password);onClose?.()}catch(err:any){const code=err?.code||"";setError(code.includes("invalid-credential")?"That email or password doesn’t match.":code.includes("email-already")?"An account already exists for that email.":code.includes("weak-password")?"Use a password with at least 6 characters.":code.includes("operation-not-allowed")?"Email sign-in still needs to be enabled in the Firebase console.":err?.message||"We couldn’t sign you in.")}finally{setBusy(false)}};const reset=async()=>{if(!email){setError("Enter your email first, then choose reset password.");return}try{await window.firebase.auth().sendPasswordResetEmail(email);setError("Password reset email sent.")}catch(err:any){setError(err?.message||"Couldn’t send the reset email.")}};return <div className={fullPage?"auth-gate":"modal-backdrop"} onMouseDown={e=>!fullPage&&e.target===e.currentTarget&&onClose?.()}>{fullPage&&<div className="auth-brand"><span>✿</span><strong>Petal</strong><small>PLANNER</small><p>A softer way to organize what matters.</p></div>}<form className="modal auth-modal" onSubmit={submit}>{!fullPage&&<button type="button" className="modal-close" onClick={onClose}>×</button>}<span className="auth-flower">✿</span><p className="eyebrow">PETAL PLANNER</p><h2>{mode==="login"?"Welcome back":"Create your account"}</h2><p className="auth-intro">{mode==="login"?"Sign in to open your planner on every device.":"Your tasks will be private and synced to your account."}</p><label>Email<input autoFocus type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>{error&&<div className="auth-message">{error}</div>}<button className="primary auth-submit" disabled={busy}>{busy?"Please wait…":mode==="login"?"Open my planner":"Create account"}</button>{mode==="login"&&<button type="button" className="text-button" onClick={reset}>Forgot your password?</button>}<div className="auth-switch">{mode==="login"?"New to Petal?":"Already have an account?"}<button type="button" onClick={()=>{setMode(mode==="login"?"signup":"login");setError("")}}>{mode==="login"?"Create an account":"Sign in"}</button></div></form></div>}

function TaskModal({task,onSave,onDelete,onClose}:{task:Task,onSave:(t:Task)=>void,onDelete:(id:string)=>void,onClose:()=>void}){const [t,setT]=useState(task);const field=(k:keyof Task,v:string|number)=>setT({...t,[k]:v});return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal" onSubmit={e=>{e.preventDefault();if(t.title.trim())onSave(t)}}><button type="button" className="modal-close" onClick={onClose}>×</button><p className="eyebrow">ACTION ITEM</p><h2>{task.title?"Edit your task":"Create a new task"}</h2><label>Task name<input autoFocus required value={t.title} onChange={e=>field("title",e.target.value)} placeholder="What needs doing?"/></label><div className="form-grid"><label>Project<select value={t.project} onChange={e=>field("project",e.target.value)}>{projects.map(p=><option key={p}>{p}</option>)}</select></label><label>Due date<input type="date" value={t.due} onChange={e=>field("due",e.target.value)}/></label><label>Status<select value={t.status} onChange={e=>field("status",e.target.value)}>{["To Do","In Progress","Waiting","Completed"].map(s=><option key={s}>{s}</option>)}</select></label><label>Priority<select value={t.priority} onChange={e=>field("priority",e.target.value)}>{["Low","Medium","High","Critical"].map(p=><option key={p}>{p}</option>)}</select></label></div><label>Notes<textarea value={t.notes} onChange={e=>field("notes",e.target.value)} placeholder="Add a little context..."/></label><label>Estimated minutes<input type="number" min="5" step="5" value={t.duration} onChange={e=>field("duration",Number(e.target.value))}/></label><div className="modal-actions">{task.title&&<button type="button" className="danger" onClick={()=>onDelete(t.id)}>Delete</button>}<span></span><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Save task</button></div></form></div>}

function ProjectModal({project,onSave,onClose}:{project:ProjectInfo,onSave:(p:ProjectInfo)=>void,onClose:()=>void}){const [p,setP]=useState(project);return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal" onSubmit={e=>{e.preventDefault();onSave(p)}}><button type="button" className="modal-close" onClick={onClose}>×</button><p className="eyebrow">PROJECT DETAILS</p><h2>{p.name}</h2><label>Description<textarea autoFocus value={p.description} onChange={e=>setP({...p,description:e.target.value})} placeholder="What is this project for?"/></label><label>Project link<input type="url" value={p.link} onChange={e=>setP({...p,link:e.target.value})} placeholder="https://..."/></label><p className="form-hint">Add a link to a shared folder, document, website, repository, or project board.</p><div className="modal-actions"><span></span><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Save details</button></div></form></div>}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
