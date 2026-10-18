import {useEffect,useState} from 'react';import {sb,URL_,KEY} from './supabase';import {Thesis,Briefings,History,ingest} from './extra';import {Landing,CsvTools,CompanyPage,toggleTheme} from './more';
const NAV=['Overview','Portfolio','Thesis','Review Queue','Research','Briefings','History'];
const ACTIONS=['Relevant','Needs more evidence','Not material','Incorrect interpretation','Duplicate'];
function Auth(){const [e,setE]=useState(''),[p,setP]=useState(''),[m,setM]=useState(''),[up,setUp]=useState(false);
async function go(){setM('');const f=up?sb.auth.signUp:sb.auth.signInWithPassword;const {error,data}=await f.call(sb.auth,{email:e,password:p});
if(error)setM(error.message);else if(up&&!data.session)setM('Check your email to verify your account, then sign in.')}
return <div className="auth"><div className="logo">orveta</div><h1>{up?'Create account':'Sign in'}</h1><p className="mut">Know what changed. Understand why it matters.</p>
<input placeholder="Email" value={e} onChange={x=>setE(x.target.value)}/><input type="password" placeholder="Password" value={p} onChange={x=>setP(x.target.value)}/>
<button className="p" onClick={go}>{up?'Sign up':'Login'}</button><button onClick={()=>sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}})}>Continue with Google</button><button onClick={()=>e?sb.auth.resetPasswordForEmail(e).then(()=>setM('Reset link sent if the account exists.')):setM('Enter your email first.')}>Forgot password?</button><button onClick={()=>setUp(!up)}>{up?'Have an account?':'Need an account?'}</button>
{m&&<p className="err">{m}</p>}</div>}
function Onboard({done}){const [n,setN]=useState(''),[m,setM]=useState('');
async function create(){const {data,error}=await sb.from('workspaces').insert({name:n}).select().single();
if(error)return setM(error.message);const r=await sb.from('workspace_members').insert({workspace_id:data.id,role:'owner'});if(r.error)return setM(r.error.message);done(data)}
return <div className="auth"><h1>Create your workspace</h1><input placeholder="Workspace name" value={n} onChange={x=>setN(x.target.value)}/><button className="p" disabled={!n} onClick={create}>Continue</button>{m&&<p className="err">{m}</p>}</div>}
function Overview({ws,co,fi}){const nw=fi.filter(f=>f.status==='new').length;
return <><h1>Overview</h1><p className="mut">{ws.name}</p>{!co.length?<div className="card">Add your first company in Portfolio to begin.</div>:
<div className="grid"><div className="card"><b>{co.length}</b>Companies</div><div className="card"><b>{nw}</b>New findings</div><div className="card"><b>{fi.length-nw}</b>Reviewed</div><div className="card"><b>Not connected</b>Source ingestion</div></div>}</>}
function Portfolio({ws,co,reload,openCo}){const [n,setN]=useState(''),[t,setT]=useState(''),[x,setX]=useState(''),[m,setM]=useState('');
async function add(){const {error}=await sb.from('companies').insert({workspace_id:ws.id,name:n,ticker:t.toUpperCase(),exchange:x});if(error)setM(error.message);else{setN('');setT('');setX('');reload()}}
return <><h1>Portfolio</h1>{co.map(c=><div className="card row" key={c.id}><div onClick={()=>openCo(c.id)} style={{cursor:'pointer'}}><b>{c.name}</b> <span className="mut">{c.ticker} · {c.exchange} · thesis: {c.thesis_status}</span></div><button onClick={async()=>{setM('Fetching filings…');const r=await ingest(ws,c.id);setM(r.error||`Added ${r.documents_added} filings, ${r.findings_created} findings (checked ${r.assumptions_checked} assumptions).`);reload()}}>Fetch filings</button></div>)}
<CsvTools ws={ws} co={co} reload={reload}/><h2>Add company</h2><div className="card"><input placeholder="Company name" value={n} onChange={e=>setN(e.target.value)}/><input placeholder="Ticker" value={t} onChange={e=>setT(e.target.value)}/><input placeholder="Exchange" value={x} onChange={e=>setX(e.target.value)}/><button className="p" disabled={!n} onClick={add}>Add</button>
<p className="mut">Monitoring starts once filings have been fetched.</p>{m&&<p className="mut">{m}</p>}</div></>}
function Queue({ws,co,fi,reload,open}){const [c,setC]=useState(''),[h,setH]=useState(''),[ps,setPs]=useState(''),[ex,setEx]=useState(''),[rp,setRp]=useState('');
async function add(){await sb.from('findings').insert({workspace_id:ws.id,company_id:c||co[0].id,headline:h,passage:ps,expected:ex||null,reported:rp||null});setH('');setPs('');setEx('');setRp('');reload()}
return <><h1>Review Queue</h1>{!fi.length&&<div className="card mut">No findings yet.</div>}
{fi.map(f=><div className="card row" key={f.id} onClick={()=>open(f)}><div><b>{f.companies?.ticker}</b> {f.headline}</div><span className="tag">{f.status}</span></div>)}
{co.length>0&&<><h2>Log a finding manually</h2><div className="card"><select value={c} onChange={e=>setC(e.target.value)}>{co.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
<input placeholder="Headline" value={h} onChange={e=>setH(e.target.value)}/><textarea placeholder="Exact source passage" value={ps} onChange={e=>setPs(e.target.value)}/>
<input placeholder="Expected value" value={ex} onChange={e=>setEx(e.target.value)}/><input placeholder="Reported value" value={rp} onChange={e=>setRp(e.target.value)}/><button className="p" disabled={!h} onClick={add}>Add finding</button></div></>}</>}
function Finding({f,back,reload}){async function decide(a){await sb.from('findings').update({status:a.toLowerCase()}).eq('id',f.id);await sb.from('decisions').insert({workspace_id:f.workspace_id,finding_id:f.id,action:a});reload();back()}
const diff=f.expected!=null&&f.reported!=null?Number(f.expected)-Number(f.reported):null;
return <><a style={{cursor:'pointer',color:'var(--acc)'}} onClick={back}>← Review Queue</a><h1>{f.headline}</h1><p className="mut">{f.companies?.name} · {f.status}</p>
{f.interpretation&&<><h2>AI interpretation (not a recommendation)</h2><div className="card"><pre>{f.interpretation}</pre></div></>}<h2>Source passage (verified)</h2><div className="card"><pre>{f.passage||'No passage recorded.'}</pre></div>
{diff!=null&&<><h2>Calculation</h2><div className="card">Expected {f.expected} · Reported {f.reported} · Difference {diff}</div></>}
<h2>Analyst decision</h2>{ACTIONS.map(a=><button key={a} onClick={()=>decide(a)}>{a}</button>)}</>}
function Research({ws}){const [q,setQ]=useState(''),[a,setA]=useState(''),[b,setB]=useState(false);
async function ask(){setA('');setB(true);const {data:{session}}=await sb.auth.getSession();
const r=await fetch(`${URL_}/functions/v1/research-assistant`,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({question:q,workspace_id:ws.id})});
if(!r.ok||!r.body){setA('Request failed.');setB(false);return}
const rd=r.body.getReader(),dec=new TextDecoder();let buf='';
for(;;){const {done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});const ls=buf.split('\n');buf=ls.pop();
for(const l of ls){if(!l.startsWith('data: ')||l.includes('[DONE]'))continue;try{const d=JSON.parse(l.slice(6)).choices?.[0]?.delta?.content;if(d)setA(x=>x+d)}catch{}}}setB(false)}
return <><h1>Research</h1><p className="mut">Answers use only findings in this workspace.</p><div className="card"><input placeholder="Which assumptions are challenged by recent evidence?" value={q} onChange={e=>setQ(e.target.value)}/><button className="p" disabled={!q||b} onClick={ask}>{b?'Answering…':'Ask'}</button></div>{a&&<div className="card"><pre>{a}</pre></div>}</>}
export default function App(){const [s,setS]=useState(undefined),[ws,setWs]=useState(null),[ld,setLd]=useState(true),[v,setV]=useState('Overview'),[co,setCo]=useState([]),[fi,setFi]=useState([]),[sel,setSel]=useState(null),[cid,setCid]=useState(null),[land,setLand]=useState(true);
useEffect(()=>{sb.auth.getSession().then(({data})=>setS(data.session));const {data:l}=sb.auth.onAuthStateChange((_,x)=>setS(x));return()=>l.subscription.unsubscribe()},[]);
useEffect(()=>{if(!s){setWs(null);return}sb.from('workspaces').select('*').limit(1).then(({data})=>{setWs(data?.[0]||null);setLd(false)})},[s]);
async function reload(){if(!ws)return;const a=await sb.from('companies').select('*').eq('workspace_id',ws.id).eq('archived',false);const b=await sb.from('findings').select('*,companies(name,ticker)').eq('workspace_id',ws.id).order('created_at',{ascending:false});setCo(a.data||[]);setFi(b.data||[])}
useEffect(()=>{reload()},[ws]);
if(s===undefined)return null;if(!s)return land?<Landing go={()=>setLand(false)}/>:<Auth/>;if(ld)return null;if(!ws)return <Onboard done={setWs}/>;
return <div className="app"><nav><div className="logo">orveta</div>{NAV.map(n=><a key={n} className={n===v&&!sel?'on':''} onClick={()=>{setV(n);setSel(null);setCid(null)}}>{n}</a>)}<a onClick={toggleTheme}>Theme</a><a onClick={()=>sb.auth.signOut()}>Sign out</a></nav>
<main>{cid?<CompanyPage ws={ws} c={co.find(x=>x.id===cid)||{}} fi={fi} back={()=>setCid(null)} open={f=>{setCid(null);setSel(f)}}/>:sel?<Finding f={sel} back={()=>setSel(null)} reload={reload}/>:v==='Overview'?<Overview ws={ws} co={co} fi={fi}/>:v==='Portfolio'?<Portfolio ws={ws} co={co} reload={reload} openCo={setCid}/>:v==='Thesis'?<Thesis ws={ws} co={co}/>:v==='Briefings'?<Briefings fi={fi}/>:v==='History'?<History ws={ws}/>:v==='Review Queue'?<Queue ws={ws} co={co} fi={fi} reload={reload} open={setSel}/>:<Research ws={ws}/>}</main></div>}
