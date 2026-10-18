import {useEffect,useState} from 'react';import {sb} from './supabase';
export function toggleTheme(){const r=document.documentElement,n=(r.dataset.theme||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))==='light'?'dark':'light';r.dataset.theme=n;try{localStorage.setItem('theme',n)}catch{}}
try{const t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch{}
export function Landing({go}){return <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div className="logo">orveta</div><div><button onClick={go}>Sign in</button><button className="p" onClick={go}>Get started</button></div></div>
<h1 style={{fontSize:40,margin:'60px 0 12px'}}>Know what changed. Understand why it matters.</h1>
<p className="mut" style={{fontSize:18}}>Connect new company disclosures to the investment assumptions behind your portfolio.</p>
<button className="p" onClick={go}>Get started</button>
<h2>How it works</h2><div className="grid"><div className="card"><b style={{fontSize:16}}>1 · Record a thesis</b><br/>Write assumptions with thresholds.</div><div className="card"><b style={{fontSize:16}}>2 · Monitor disclosures</b><br/>Fetch filings and compare them.</div><div className="card"><b style={{fontSize:16}}>3 · Review evidence</b><br/>Inspect the source and decide.</div></div>
<h2>Built for trust</h2><div className="card">Every finding links to a verbatim source passage. Calculations are shown separately from AI interpretation. Your decisions and thesis versions are preserved as a historical record. Orveta does not tell you to buy or sell.</div>
<p className="mut" style={{marginTop:40}}>Orveta · Product · Documentation · Contact · Privacy · Terms</p></div>}
const dl=(n,t)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=n;a.click()};
const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
function parse(t){return t.trim().split(/\r?\n/).map(l=>{const o=[];let c='',s=false;for(const ch of l){if(ch==='"')s=!s;else if(ch===','&&!s){o.push(c);c=''}else c+=ch}o.push(c);return o.map(x=>x.trim())})}
export function CsvTools({ws,co,reload}){const [m,setM]=useState('');
async function imp(e){const f=e.target.files[0];if(!f)return;const rows=parse(await f.text());const h=rows[0].map(x=>x.toLowerCase());
const i=k=>h.indexOf(k);if(i('name')<0)return setM('CSV needs a header row with at least: name (optional: ticker, exchange, sector).');
const recs=rows.slice(1).filter(r=>r[i('name')]).map(r=>({workspace_id:ws.id,name:r[i('name')],ticker:(r[i('ticker')]||'').toUpperCase(),exchange:r[i('exchange')]||null,sector:r[i('sector')]||null}));
const {error}=await sb.from('companies').insert(recs);setM(error?error.message:`Imported ${recs.length} companies.`);reload()}
return <div className="card"><b>CSV</b> <span className="mut">columns: name, ticker, exchange, sector</span><br/><input type="file" accept=".csv" onChange={imp}/>
<button onClick={()=>dl('portfolio.csv','name,ticker,exchange,sector,thesis_status\n'+co.map(c=>[c.name,c.ticker,c.exchange,c.sector,c.thesis_status].map(q).join(',')).join('\n'))}>Export portfolio</button>{m&&<p className="mut">{m}</p>}</div>}
const sents=t=>(t||'').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>30).slice(0,1500);
function Compare({docs}){const [a,setA]=useState(''),[b,setB]=useState(''),[r,setR]=useState(null),[fl,setFl]=useState('all');
async function run(){const x=await sb.from('documents').select('id,body').in('id',[a,b]);const A=x.data.find(d=>d.id===a)?.body,B=x.data.find(d=>d.id===b)?.body;
const sa=sents(A),sb_=sents(B),SA=new Set(sa),SB=new Set(sb_);setR({rem:sa.filter(s=>!SB.has(s)),add:sb_.filter(s=>!SA.has(s))})}
const opt=<><option value="">Select…</option>{docs.map(d=><option key={d.id} value={d.id}>{d.title} · {d.published_at}</option>)}</>;
const show=l=>(fl==='figures'?l.filter(s=>/\d/.test(s)):l).slice(0,60);
return <><h2>Compare two filings</h2><div className="card"><select value={a} onChange={e=>setA(e.target.value)}>{opt}</select><select value={b} onChange={e=>setB(e.target.value)}>{opt}</select>
<button className="p" disabled={!a||!b||a===b} onClick={run}>Compare (older → newer)</button><select value={fl} onChange={e=>setFl(e.target.value)}><option value="all">All changes</option><option value="figures">Only sentences with figures</option></select>
<p className="mut">Shows sentences that differ. A wording change is not automatically material.</p></div>
{r&&<div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))'}}>
<div><h2>Removed ({r.rem.length})</h2>{show(r.rem).map((s,i)=><div className="card" style={{borderColor:'var(--red)'}} key={i}>{s}</div>)}</div>
<div><h2>Added ({r.add.length})</h2>{show(r.add).map((s,i)=><div className="card" style={{borderColor:'var(--acc)'}} key={i}>{s}</div>)}</div></div>}</>}
export function CompanyPage({ws,c,fi,back,open}){const [tab,setTab]=useState('Summary'),[docs,setDocs]=useState([]),[th,setTh]=useState(null),[as,setAs]=useState([]),[nt,setNt]=useState([]),[tx,setTx]=useState('');
const mine=fi.filter(f=>f.company_id===c.id);
async function load(){const d=await sb.from('documents').select('id,title,source_url,published_at,period,status,ingested_at').eq('company_id',c.id).order('published_at',{ascending:false});setDocs(d.data||[]);
const t=await sb.from('theses').select('*').eq('company_id',c.id).order('version',{ascending:false}).limit(1);setTh(t.data?.[0]||null);
if(t.data?.[0]){const a=await sb.from('assumptions').select('*').eq('thesis_id',t.data[0].id);setAs(a.data||[])}
const n=await sb.from('notes').select('*').eq('company_id',c.id).order('created_at',{ascending:false});setNt(n.data||[])}
useEffect(()=>{load()},[c.id]);
async function addNote(){await sb.from('notes').insert({workspace_id:ws.id,company_id:c.id,body:tx});setTx('');load()}
const met=mine.filter(f=>f.expected!=null||f.reported!=null);
return <><a style={{cursor:'pointer',color:'var(--acc)'}} onClick={back}>← Portfolio</a><h1>{c.name}</h1><p className="mut">{c.ticker} · {c.exchange} · latest filing {docs[0]?.published_at||'none yet'}</p>
<div>{['Summary','Filings','Metrics','Notes'].map(t=><button key={t} className={t===tab?'p':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
{tab==='Summary'&&<><h2>Thesis</h2><div className="card">{th?<><b>{th.title}</b> <span className="mut">v{th.version}</span><pre>{th.rationale}</pre>{as.filter(a=>a.status==='active').map(a=><div key={a.id}>• {a.text}</div>)}</>:'No thesis recorded yet.'}</div>
<h2>Open findings</h2>{mine.filter(f=>f.status==='new').map(f=><div className="card row" key={f.id} onClick={()=>open(f)}>{f.headline}<span className="tag">new</span></div>)}{!mine.some(f=>f.status==='new')&&<div className="card mut">None.</div>}
<h2>Recent decisions</h2>{mine.filter(f=>f.status!=='new').slice(0,5).map(f=><div className="card" key={f.id}>{f.headline} <span className="mut">· {f.status}</span></div>)}</>}
{tab==='Filings'&&<>{docs.map(d=><div className="card" key={d.id}><b>{d.title}</b> <span className="mut">published {d.published_at} · period {d.period||'n/a'} · ingested {new Date(d.ingested_at).toLocaleDateString()} · {d.status}</span><br/><a href={d.source_url} target="_blank" rel="noreferrer" style={{color:'var(--acc)'}}>Open source</a></div>)}{!docs.length&&<div className="card mut">No filings yet. Use Fetch filings in Portfolio.</div>}{docs.length>1&&<Compare docs={docs}/>}</>}
{tab==='Metrics'&&<div className="card" style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:480}}><thead><tr><th align="left">Finding</th><th align="left">Period</th><th align="left">Analyst expectation</th><th align="left">Reported (filing)</th></tr></thead><tbody>{met.map(f=><tr key={f.id}><td>{f.headline}</td><td>{f.period||'—'}</td><td>{f.expected??'—'}</td><td>{f.reported??'—'}</td></tr>)}</tbody></table>{!met.length&&<span className="mut">No numeric observations yet.</span>}</div>}
{tab==='Notes'&&<><div className="card"><textarea placeholder="Analyst note" value={tx} onChange={e=>setTx(e.target.value)}/><button className="p" disabled={!tx} onClick={addNote}>Add note</button></div>{nt.map(n=><div className="card" key={n.id}><span className="mut">{new Date(n.created_at).toLocaleString()}</span><pre>{n.body}</pre></div>)}</>}</>}
