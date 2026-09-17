import React from 'react';
import Icon from './icons';
import {timeLabel} from './api';
const kinds={test:'Тестова подія',motion:'Зміна в кадрі',dark:'Темний кадр',offline:'Втрачено зв’язок',restored:'Зв’язок відновлено'};
const cloudLabels={pending:'Очікує ШІ',processing:'Аналіз…',retry:'Повторний запит',error:'ШІ недоступний',done:'Опис ШІ',disabled:'Локальна подія'};
export function EventList({events,cameras,onSelect}) {
  return <div className="event-list">{events.map(e=><button className={`event-row ${e.reviewed?'reviewed':''}`} key={e.id} onClick={()=>onSelect(e)}>
    <div className="event-meta"><time>{timeLabel(e.ts)}</time><span>{cameras.find(c=>c.id===e.camera)?.name || e.camera}</span></div>
    <strong>{e.demo?'ДЕМО · ':''}{kinds[e.kind]||e.kind}</strong><p>{e.description}</p><div className="event-meta"><span>{cloudLabels[e.cloud_status]}</span><span>{e.reviewed?'Переглянуто':'Перевірити →'}</span></div>
  </button>)}</div>;
}
export default function Events({events,cameras,demo,onDemo,onSelect}) {
  return <section className="panel events-panel"><h2><Icon name="list"/>Журнал подій</h2>
    {events.length?<EventList events={events.slice(0,20)} cameras={cameras} onSelect={onSelect}/>:<div className="empty-state"><Icon name="journal" size={58}/><h3>Подій ще немає</h3><p>Коли камери будуть підключені,<br/>події відображатимуться тут.</p>{demo&&<button className="primary" onClick={onDemo}>Тестова подія</button>}</div>}
    {events.length>0&&demo&&<button className="quiet" onClick={onDemo}>Додати тестову подію</button>}
  </section>;
}
