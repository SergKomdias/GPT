import React,{useEffect,useState,useCallback,useRef} from 'react';
import {api,post,dateLabel} from './api';
import Icon from './icons';
import CameraPanel from './CameraPanel';
import Events,{EventList} from './Events';
import Chat from './Chat';

function Modal({title,onClose,children}){
  const dialog=useRef(null);
  useEffect(()=>{const previous=document.activeElement;const handle=e=>{if(e.key!=='Tab')return;const items=[...dialog.current.querySelectorAll('button:not(:disabled),input,select,a[href]')];if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};const node=dialog.current;node.addEventListener('keydown',handle);return()=>{node.removeEventListener('keydown',handle);previous?.focus()}},[]);
  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[onClose]);
  return <div className="modal-backdrop" onClick={onClose}><section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>{title}</h2><button autoFocus className="icon-button" aria-label="Закрити" onClick={onClose}><Icon name="close"/></button></div>{children}</section></div>
}
function Login({onLogin}){
  const [value,setValue]=useState(''),[error,setError]=useState('');
  return <main className="login"><h1>ВАРТА</h1><h2>Вхід оператора</h2><p>Введіть пароль, заданий на міні-ПК.</p><form onSubmit={async e=>{e.preventDefault();try{await post('/login',{token:value});onLogin()}catch(err){setError(err.message)}}}><input type="password" aria-label="Пароль оператора" autoComplete="current-password" value={value} onChange={e=>setValue(e.target.value)}/><button className="primary">Увійти</button></form>{error&&<p role="alert">{error}</p>}</main>
}
export default function App(){
  const [authenticated,setAuthenticated]=useState(null),[status,setStatus]=useState(null),[events,setEvents]=useState([]),[recordings,setRecordings]=useState([]);
  const [tab,setTab]=useState('overview'),[settings,setSettings]=useState(false),[selected,setSelected]=useState(null),[expanded,setExpanded]=useState(null);
  const [camera,setCamera]=useState(''),[minutes,setMinutes]=useState('60'),[error,setError]=useState('');
  const refresh=useCallback(async()=>{
    try { const [s,e]=await Promise.all([api('/status'),api(`/events?minutes=${tab==='journal'?minutes:60}${tab==='journal'&&camera?`&camera=${camera}`:''}`)]);setStatus(s);setEvents(e);setError(''); }
    catch(err){setError(err.message)}
  },[camera,minutes,tab]);
  useEffect(()=>{api('/session').then(s=>setAuthenticated(s.authenticated)).catch(e=>setError(e.message));const handler=()=>setAuthenticated(false);window.addEventListener('varta:login',handler);return()=>window.removeEventListener('varta:login',handler)},[]);
  useEffect(()=>{if(!authenticated)return;let stopped=false,timer;async function poll(){await refresh();if(!stopped)timer=setTimeout(poll,2000)}poll();return()=>{stopped=true;clearTimeout(timer)}},[authenticated,refresh]);
  useEffect(()=>{if(tab==='journal'&&authenticated)api(`/recordings${camera?`?camera=${camera}`:''}`).then(setRecordings).catch(e=>setError(e.message))},[tab,camera,authenticated]);
  async function demo(){try{await post('/events/demo');await refresh()}catch(e){setError(e.message)}}
  async function review(){try{await post(`/events/${selected.id}/review`);setSelected(null);await refresh()}catch(e){setError(e.message)}}
  if(authenticated===false)return <Login onLogin={()=>setAuthenticated(true)}/>;
  if(!status)return <main className="login"><h1>ВАРТА</h1><p role="status">{error||'Підключення до міні-ПК…'}</p>{error&&<button onClick={()=>location.reload()}>Повторити</button>}</main>;
  const cameras=status.cameras, expandedCamera=cameras.find(c=>c.id===expanded);
  const recordingText=status.demo?'не налаштовано':!status.recording.storage_ok?'недостатньо місця':`${status.recording.active} / ${cameras.length} камер`;
  return <><header className="header"><a href="#" className="brand" onClick={()=>setTab('overview')}>ВАРТА</a><nav aria-label="Основна навігація"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Огляд</button><button className={tab==='journal'?'active':''} onClick={()=>setTab('journal')}>Журнал</button></nav><button className="settings-button" onClick={()=>setSettings(true)}><Icon name="settings"/>Налаштування</button></header>
    <main className="main"><h1>{tab==='overview'?'Огляд бази':'Журнал подій'}</h1>
      {status.demo&&<div className="banner"><span aria-hidden="true">⚠</span>Демонстраційний режим · Камери не підключені.</div>}
      {!status.demo&&status.cameras.some(c=>c.status!=='online')&&<div className="banner">Є камери без відеозв’язку. Перевірте стан підключення.</div>}
      {status.paused&&<div className="banner">Аналіз подій призупинено. {status.recording.active>0?'Запис відео продовжується.':'Запис зараз не активний.'}</div>}
      {!status.recording.storage_ok&&<div className="error-banner">Недостатньо місця для запису. Перевірте диск міні-ПК.</div>}
      {error&&<div className="error-banner" role="alert">{error}</div>}
      {tab==='overview'?<div className="dashboard"><div className="camera-grid">{cameras.map(c=><CameraPanel key={c.id} camera={c} onExpand={()=>setExpanded(c.id)}/>)}</div><aside><Events events={events} cameras={cameras} demo={status.demo} onDemo={demo} onSelect={setSelected}/><Chat camera="" minutes={60}/></aside></div>:<div className="journal-view"><div className="filters"><label>Камера<select aria-label="Камера" value={camera} onChange={e=>setCamera(e.target.value)}><option value="">Усі камери</option>{cameras.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Період<select aria-label="Період" value={minutes} onChange={e=>setMinutes(e.target.value)}><option value="15">15 хвилин</option><option value="60">Остання година</option><option value="480">8 годин</option><option value="1440">24 години</option></select></label><span>Подій: {events.length} · час цього пристрою</span>{status.demo&&<button className="primary" onClick={demo}>Тестова подія</button>}</div>
      {events.length?<EventList events={events} cameras={cameras} onSelect={setSelected}/>:<p className="journal-empty">За вибраний період подій немає.</p>}<h2>Відеоархів</h2><p className="muted">Останні завершені фрагменти. Нові записи доступні після закриття фрагмента й 3 хвилин очікування.</p>{recordings.length?<div className="recordings">{recordings.map(r=><a key={`${r.camera}/${r.name}`} href={`/api/recordings/${r.camera}/${r.name}`} download>{cameras.find(c=>c.id===r.camera)?.name} · {dateLabel(r.ts)} · {(r.bytes/1e6).toFixed(1)} МБ <span>Завантажити MKV ↓</span></a>)}</div>:<p className="muted">Завершених записів немає.</p>}</div>}
    </main><footer><span><Icon name="disk"/>Запис: {recordingText}</span><span><Icon name="cloud"/>Хмарний ШІ: {status.cloud.error|| (status.cloud.configured?`${status.cloud.calls}/${status.cloud.limit} запитів за годину`:'не підключено')}</span></footer>
    {settings&&<Modal title="Налаштування" onClose={()=>setSettings(false)}><p>Сервер працює на міні-ПК. Ця панель лише відображає його стан.</p><dl><dt>Режим</dt><dd>{status.demo?'Демонстраційний':'Реальні камери'}</dd><dt>Хмарна модель</dt><dd>{status.cloud.model}</dd><dt>Зберігання</dt><dd>{status.recording.retention_days} днів · {(status.recording.bytes/1e9).toFixed(2)} ГБ відео</dd><dt>Зображення в панелі</dt><dd>640 пікселів · 1 кадр/с. Архів зберігає оригінальний потік.</dd></dl><h3>Камери</h3>{cameras.map(c=><div className="config-row" key={c.id}><strong>{c.name}</strong><span>Зона: {c.roi.join(', ')} · поріг: {Math.round(c.motion_threshold*100)}% · пауза: {c.cooldown_seconds} с</span></div>)}<p className="muted">Адреси камер та API-ключ задаються локально у файлі .env; зони й режими — у config.local.json. Після зміни перезапустіть сервер. Інструкція є в README проєкту.</p><button className="primary" onClick={async()=>{try{await post('/monitoring',{paused:!status.paused});await refresh()}catch(e){setError(e.message)}}}>{status.paused?'Відновити аналіз подій':'Призупинити аналіз подій'}</button></Modal>}
    {selected&&<Modal title="Деталі події" onClose={()=>setSelected(null)}><div className="event-meta"><span>{dateLabel(selected.ts)}</span><span>{cameras.find(c=>c.id===selected.camera)?.name}</span></div>{selected.demo&&<div className="banner">Демонстраційний запис</div>}{selected.image?<img className="snapshot" src={`/api/events/${selected.id}/snapshot`} alt="Кадр у момент події"/>:<p className="muted">Для цієї події кадру немає.</p>}<p className="event-description">{selected.description}</p><p className="muted">{selected.cloud_status==='done'?'Опис ШІ. Перевірте його за зображенням.':'Локальний запис. Хмарний опис ще не отримано.'}</p><button className="primary" disabled={!!selected.reviewed} onClick={review}>{selected.reviewed?'Переглянуто':'Позначити як переглянуту'}</button></Modal>}
    {expandedCamera&&<div className="modal-backdrop" onClick={()=>setExpanded(null)}><div className="camera-modal" onClick={e=>e.stopPropagation()}><CameraPanel camera={expandedCamera} expanded onExpand={()=>setExpanded(null)}/></div></div>}
  </>;
}
