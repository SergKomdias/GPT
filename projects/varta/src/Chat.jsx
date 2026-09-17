import React,{useState,useRef,useEffect} from 'react';
import Icon from './icons';
import {post} from './api';
export default function Chat({camera,minutes}) {
  const [messages,setMessages]=useState([]),[text,setText]=useState(''),[busy,setBusy]=useState(false);
  const scroll=useRef(null);
  useEffect(()=>{scroll.current?.scrollTo(0,scroll.current.scrollHeight)},[messages,busy]);
  async function send(e){e.preventDefault();if(!text.trim()||busy)return;const question=text.trim();setText('');setBusy(true);setMessages(m=>[...m,{role:'user',text:question}]);
    try{const answer=await post('/chat',{message:question,camera:camera||null,minutes:Number(minutes)});setMessages(m=>[...m,{role:'assistant',text:answer.answer,source:answer.source}]);}
    catch(error){setMessages(m=>[...m,{role:'error',text:error.message}]);}finally{setBusy(false)}}
  return <section className="panel chat-panel"><h2><Icon name="chat"/>Агент Варта</h2>
    {messages.length?<div className="messages" aria-live="polite" ref={scroll}>{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><small>{m.role==='user'?'Оператор':m.role==='error'?'Помилка':m.source==='cloud'?'Варта · хмарний ШІ':'Варта · локальний журнал'}</small><p>{m.text}</p></div>)}{busy&&<p className="muted">Опрацьовую запит…</p>}</div>:<div className="empty-state chat-empty"><Icon name="chat" size={52}/><h3>Запитайте про події на базі</h3><p>Агент допоможе знайти події, пояснити ситуацію та надати стислий огляд.</p></div>}
    <form className="chat-form" onSubmit={send}><input aria-label="Повідомлення агенту" placeholder="Повідомлення агенту" maxLength={2000} value={text} onChange={e=>setText(e.target.value)}/><button className="primary" disabled={busy||!text.trim()}>{busy?'Очікуйте…':'Надіслати'}</button></form>
  </section>;
}
