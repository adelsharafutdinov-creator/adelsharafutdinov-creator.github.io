/* Shared, optional analytics. Game code never waits for the network. */
(() => {
 'use strict';
 const endpoint='https://buitznzbhxuobphaabrv.supabase.co/rest/v1/rpc/';
 const key='sb_publishable_GNuhd_o0Cp1p666IUt2O9Q_RPOciTwK';
 const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
 const uuid=()=>crypto.randomUUID();
 let token=storage.get('rayan-player-v1');
 if(!/^[a-f0-9-]{36}$/.test(token||'')){token=uuid();storage.set('rayan-player-v1',token)}
 const incoming=new URLSearchParams(location.search).get('from');
 if(['family','classmates','test'].includes(incoming))storage.set('rayan-source-v1',incoming);
 let source=storage.get('rayan-source-v1')||'direct';
 if(!['direct','family','classmates','test'].includes(source))source='direct';
 let game=null,playing=()=>false,session=uuid(),seconds=0,started=false,lastInput=0,lastTick=performance.now(),previousActive=false,inflight=false,lastSent=-1;
 let vote=null,summary,buttons=[],status,acknowledged=false;
 const held=new Set();
 async function rpc(name,body={},keepalive=false){const r=await fetch(endpoint+name,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),keepalive,signal:keepalive?undefined:AbortSignal.timeout(10000)});if(!r.ok)throw Error('analytics unavailable');return r.json()}
 function optedOut(){return storage.get('rayan-metrics-off')==='1'}
 function active(){try{return started&&!document.hidden&&document.hasFocus()&&!optedOut()&&playing()&&(held.size>0||performance.now()-lastInput<60000)}catch{return false}}
 async function send(keepalive=false){
  if(!started||optedOut()||inflight)return;
  inflight=true;const total=Math.min(28800,Math.floor(seconds)),sentVote=vote;
  try{await rpc('rayan_game_event',{p_token:token,p_session:session,p_game:game,p_seconds:total,p_source:source,p_vote:sentVote,p_self:storage.get('rayan-self-v1')==='1'},keepalive);lastSent=total;acknowledged=true;if(vote===sentVote)vote=null;buttons.forEach(b=>b.disabled=false);if(status)status.textContent=sentVote===null?'': 'Оценка сохранена. Её можно изменить.';if(sentVote!==null)await refresh();}
  catch{if(status)status.textContent='Статистика временно недоступна. Игра работает.'}
  finally{inflight=false}
 }
 function tick(){const now=performance.now(),dt=Math.min(2,Math.max(0,(now-lastTick)/1000));lastTick=now;const on=active();if(previousActive&&on)seconds+=dt;if(previousActive&&!on)void send();previousActive=on;if(on&&(Math.floor(seconds)-lastSent>=15||!acknowledged))void send()}
 function input(e){if(!e.isTrusted||e.target.closest?.('[data-metrics-ui]'))return;lastInput=performance.now();if(e.type==='keydown')held.add(e.code);if(e.type==='pointerdown')held.add('pointer'+e.pointerId);if(!started){setTimeout(()=>{try{if(!started&&playing()&&!optedOut()){started=true;void send()}}catch{}},0)}}
 for(const type of ['pointerdown','pointermove','keydown'])document.addEventListener(type,input,{passive:true,capture:true});
 document.addEventListener('keyup',e=>held.delete(e.code),true);
 for(const t of ['pointerup','pointercancel'])document.addEventListener(t,e=>held.delete('pointer'+e.pointerId),true);
 window.addEventListener('blur',()=>{held.clear();previousActive=false;void send(true)});
 document.addEventListener('visibilitychange',()=>{tick();if(document.hidden){held.clear();void send(true)}});
 window.addEventListener('pagehide',()=>{tick();void send(true)});
 async function refresh(){try{const rows=await rpc('rayan_game_stats');for(const box of document.querySelectorAll('[data-game-stats]')){const r=rows.find(x=>x.id===box.dataset.gameStats);if(r)box.textContent=`Попробовали: ${r.players} · ${(r.seconds/60).toLocaleString('ru-RU',{maximumFractionDigits:1})} мин · 👍 ${r.likes} · 🛠 ${r.improve}`;}}catch{for(const box of document.querySelectorAll('[data-game-stats]'))box.textContent='Статистика временно недоступна';}}
 async function cast(id,value,row,msg){const sid=game===id&&started?session:storage.get('rayan-played-'+id);if(!sid){msg.textContent='Сначала начни игру.';return}row.querySelectorAll('button').forEach(b=>b.disabled=true);try{await rpc('rayan_game_event',{p_token:token,p_session:sid,p_game:id,p_seconds:0,p_source:source,p_vote:value,p_self:storage.get('rayan-self-v1')==='1'});storage.set('rayan-vote-'+id,String(value));row.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vote===String(value))));msg.textContent='Оценка сохранена. Её можно изменить.';await refresh()}catch{msg.textContent='Не удалось сохранить оценку. Попробуй ещё раз.'}finally{row.querySelectorAll('button').forEach(b=>b.disabled=false)}}
 function styles(){if(document.getElementById('metrics-style'))return;const link=document.createElement('link');link.id='metrics-style';link.rel='stylesheet';link.href='/assets/game-analytics.css';document.head.append(link)}
 function widget(id,compact=false){
  const box=document.createElement('section');box.className='game-metrics';box.dataset.metricsUi='';box.setAttribute('aria-label','Статистика и оценка игры');
  summary=document.createElement('div');summary.dataset.gameStats=id;summary.textContent='Загружаем статистику…';box.append(summary);
  const row=document.createElement('div');row.className='metrics-actions';
  const msg=document.createElement('div');msg.setAttribute('role','status');
  for(const [value,label] of [[true,'👍 Класс!'],[false,'🛠 Хочу улучшений']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.vote=String(value);b.disabled=!storage.get('rayan-played-'+id);b.setAttribute('aria-pressed',String(storage.get('rayan-vote-'+id)===String(value)));b.onclick=()=>cast(id,value,row,msg);if(!compact)buttons.push(b);row.append(b)}box.append(row,msg);
  const note=document.createElement('small');note.textContent='Один браузер ≈ один игрок. Оценка доступна после начала игры.';box.append(note);
  status=document.createElement('div');status.setAttribute('role','status');box.append(status);
  return box;
 }
 function register(id,isPlaying){game=id;playing=isPlaying;styles();const panel=document.createElement('details');panel.className='metrics-panel';panel.dataset.metricsUi='';const title=document.createElement('summary');title.textContent='Оценить игру';panel.append(title,widget(id));const label=document.createElement('label');const off=document.createElement('input');off.type='checkbox';off.checked=optedOut();off.onchange=()=>{storage.set('rayan-metrics-off',off.checked?'1':'0');previousActive=false};label.append(off,' Не учитывать мою игру');panel.append(label);document.body.append(panel);void refresh();setInterval(()=>{if(!started&&lastInput&&performance.now()-lastInput<60000){try{if(playing()&&!optedOut()){started=true;void send()}}catch{}}tick();if(started&&acknowledged)storage.set('rayan-played-'+id,session)},1000);}
 function catalog(){styles();document.querySelectorAll('#games-panel .media-card').forEach(card=>{const id=new URL(card.href).pathname.split('/')[1];const wrap=document.createElement('article');wrap.className='metrics-card';card.replaceWith(wrap);wrap.append(card,widget(id,true));if(incoming){const u=new URL(card.href);u.searchParams.set('from',source);card.href=u.href}});void refresh();window.addEventListener('focus',()=>void refresh());}
 window.RayanAnalytics={register,catalog,rpc,refresh};
})();
