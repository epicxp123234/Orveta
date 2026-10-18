import {useEffect,useState} from 'react';import {sb,URL_,KEY} from './supabase';
const CMP=['below threshold','above threshold','at least','at most','qualitative'];
export function Thesis({ws,co}){const [c,setC]=useState(co[0]?.id||''),[th,setTh]=useState([]),[as,setAs]=useState([]),[t,setT]=useState(''),[r,setR]=useState(''),[why,setWhy]=useState(''),[m,setM]=useState('');
const [a,setA]=useState({text:'',metric:'',threshold:'',comparison:CMP[2],horizon:'',rationale:''});
async function load(){if(!c)return;const x=await sb.from('theses').select('*').eq('company_id',c).order('version',{ascending:false});setTh(x.data||[]);
if(x.data?.[0]){const y=await sb.from('assumptions').select('*').eq('thesis_id',x.data[0].id).order('created_at');setAs(y.data||[])}else setAs([])}
useEffect(()=>{load()},[c]);
async function saveThesis(){const v=(th[0]?.version||0)+1;const {data,error}=await sb.from('theses').insert({company_id:c,workspace_id:ws.id,version:v,title:t,rationale:r,change_reason:why}).select().single();
if(error)return setM(error.message);if(as.length)await sb.from('assumptions').insert(as.filter(x=>x.status==='active').map(({id,created_at,...x})=>({...x,thesis_id:data.id})));
await sb.from('companies').update({thesis_status:'active'}).eq('id',c);setT('');setR('');setWhy('');setM('');load()}
async function addA(){if(!th[0])return setM('Save a thesis first.');const q=a.comparison==='qualitative';
const {error}=await sb.from('assumptions').insert({...a,threshold:a.threshold===''?null:a.threshold,qualitative:q,thesis_id:th[0].id,workspace_id:ws.id});if(error)return setM(error.message);setA({...a,text:'',metric:'',threshold:'',rationale:''});load()}
async function archive(x){if(!confirm('Archive this active assumption?'))return;await sb.from('assumptions').update({status:'archived'}).eq('id',x.id);load()}
const f=(k)=>e=>setA({...a,[k]:e.target.value});
return <><h1>Investment thesis</h1>{!co.length?<div className="card">Add a company first.</div>:<>
<select value={c} onChange={e=>setC(e.target.value)}>{co.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
{th[0]&&<div className="card"><b>{th[0].title}</b> <span className="mut">v{th[0].version} · {new Date(th[0].created_at).toLocaleDateString()}</span><pre>{th[0].rationale}</pre></div>}
<h2>Assumptions</h2>{as.map(x=><div className="card row" key={x.id}><div>{x.text}<br/><span className="mut">{x.metric} · {x.comparison} {x.threshold??''} · {x.horizon} · {x.status}</span></div>{x.status==='active'&&<button onClick={()=>archive(x)}>Archive</button>}</div>)}
{th[0]&&<div className="card"><input placeholder="Assumption (e.g. Revenue growth stays above 15%)" value={a.text} onChange={f('text')}/><input placeholder="Metric" value={a.metric} onChange={f('metric')}/>
<input placeholder="Threshold (number)" value={a.threshold} onChange={f('threshold')}/><select value={a.comparison} onChange={f('comparison')}>{CMP.map(x=><option key={x}>{x}</option>)}</select>
<input placeholder="Time horizon" value={a.horizon} onChange={f('horizon')}/><textarea placeholder="Rationale" value={a.rationale} onChange={f('rationale')}/><button className="p" disabled={!a.text} onClick={addA}>Add assumption</button></div>}
<h2>{th[0]?'Save a new version':'Create thesis'}</h2><div className="card"><input placeholder="Thesis title" value={t} onChange={e=>setT(e.target.value)}/><textarea placeholder="Investment rationale" value={r} onChange={e=>setR(e.target.value)}/>
{th[0]&&<input placeholder="Why is the thesis changing?" value={why} onChange={e=>setWhy(e.target.value)}/>}<button className="p" disabled={!t||(th[0]&&!why)} onClick={saveThesis}>Save version {(th[0]?.version||0)+1}</button>
<p className="mut">Earlier versions are kept and never overwritten. A new version copies the active assumptions.</p></div>
{th.length>1&&<><h2>Version history</h2>{th.map(x=><div className="card" key={x.id}>v{x.version} · {x.title} <span className="mut">{new Date(x.created_at).toLocaleString()} {x.change_reason&&'· '+x.change_reason}</span></div>)}</>}
{m&&<p className="err">{m}</p>}</>}</>}
export function Briefings({fi}){const w=Date.now()-7*864e5,rec=fi.filter(f=>new Date(f.created_at)>w),by={};rec.forEach(f=>(by[f.companies?.name]??=[]).push(f));
return <><h1>Weekly briefing</h1><p className="mut">{rec.length} findings in the last 7 days · {rec.filter(f=>f.status==='new').length} unresolved</p>
{!rec.length&&<div className="card mut">No new evidence this week.</div>}{Object.entries(by).map(([n,l])=><div className="card" key={n}><b>{n}</b>{l.map(f=><div key={f.id}>• {f.headline} <span className="mut">({f.status})</span></div>)}</div>)}</>}
export function History({ws}){const [ev,setEv]=useState([]);
useEffect(()=>{(async()=>{const d=await sb.from('decisions').select('action,note,created_at,findings(headline,companies(ticker))').eq('workspace_id',ws.id);
const t=await sb.from('theses').select('version,title,change_reason,created_at,companies(ticker)').eq('workspace_id',ws.id);
setEv([...(d.data||[]).map(x=>({at:x.created_at,tx:`${x.findings?.companies?.ticker}: marked "${x.action}" — ${x.findings?.headline}`})),...(t.data||[]).map(x=>({at:x.created_at,tx:`${x.companies?.ticker}: thesis v${x.version} "${x.title}"${x.change_reason?' — '+x.change_reason:''}`}))].sort((a,b)=>b.at.localeCompare(a.at)))})()},[]);
return <><h1>History</h1>{!ev.length&&<div className="card mut">Nothing recorded yet.</div>}{ev.map((e,i)=><div className="card" key={i}><span className="mut">{new Date(e.at).toLocaleString()}</span><br/>{e.tx}</div>)}</>}
export async function ingest(ws,id){const {data:{session}}=await sb.auth.getSession();
const r=await fetch(`${URL_}/functions/v1/ingest-filings`,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({company_id:id,workspace_id:ws.id})});return r.json()}
