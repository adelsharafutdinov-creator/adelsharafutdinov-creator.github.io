import {heroes,monsters,intent} from './engine.mjs';
const endpoint='https://buitznzbhxuobphaabrv.supabase.co/functions/v1/rayan-arena';
const key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1aXR6bnpiaHh1b2JwaGFhYnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzM1MDcsImV4cCI6MjEwMzkwOTUwN30.nQ4JDJgo45c3SiEgXw8K2bLTFTdW2QpbcJ-UnPggs9Q';
const $=id=>document.getElementById(id);let selected='adel',run=null,busy=false;
function save(){try{localStorage.setItem('arena-current-v1',JSON.stringify(run));}catch{}}
function message(t){$('status').textContent=t;}
async function api(body){const r=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+key,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});const d=await r.json();if(!r.ok){if(d.state&&run){run.state=d.state;run.version=d.version;save();render();}throw Error(d.error||'Ошибка сервера');}return d;}
function heroCards(){ $('heroes').replaceChildren();for(const h of heroes){const b=document.createElement('button');b.className='hero'+(h.id===selected?' selected':'');b.setAttribute('aria-pressed',h.id===selected);b.innerHTML='<div class="portrait" style="background-image:url(assets/'+h.id+'.jpg)"></div><b>'+h.name+'</b><span>'+h.role+'</span><small>'+h.weapon+' • '+h.hp+' здоровья</small><small>'+h.skill+': '+h.detail+'</small>';b.onclick=()=>{selected=h.id;heroCards();};$('heroes').append(b);}}
function actionButton(name,desc,action,disabled=false){const b=document.createElement('button');b.innerHTML=name+'<small>'+desc+'</small>';b.disabled=disabled||busy;b.onclick=()=>act(action);return b;}
function render(){
 const s=run?.state;if(!s)return;const h=heroes.find(x=>x.id===s.hero),m=monsters[s.stage];
 $('selection').hidden=true;$('rules').open=false;$('battle').hidden=false;$('results').hidden=true;
 $('stage').textContent='Бой '+(s.stage+1)+' / 5'+(s.stage===4?' • БОСС':'');$('score').textContent=s.score+' очков';
 $('heroName').textContent=h.name+' • '+h.role;$('heroArt').style.backgroundImage='url(assets/'+h.id+'.jpg)';
 $('heroHealth').max=s.maxHp;$('heroHealth').value=s.hp;$('heroStats').textContent=s.hp+' / '+s.maxHp+' здоровья • атака '+s.attack;
 $('monsterName').textContent=m.name;$('monsterArt').textContent=m.icon;$('monsterHealth').max=m.hp;$('monsterHealth').value=s.enemyHp;$('monsterStats').textContent=s.enemyHp+' / '+m.hp+' здоровья';
 $('log').replaceChildren(...s.log.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));
 $('actions').replaceChildren();
 if(s.phase==='battle'){
  const i=intent(s);$('intent').textContent='Намерение: '+i.text+(i.damage?' • '+i.damage+' урона':'')+' • броня '+i.armor;
  $('actions').append(actionButton('⚔ Удар','Атака '+s.attack,'attack'),actionButton('🛡 Блок','Защита 14 + урон 2','block'),actionButton('✨ '+h.skill,s.cooldown?'Ещё '+s.cooldown+' хода':h.detail,'skill',s.cooldown>0),actionButton('🧪 Зелье','Лечение 28 • осталось '+s.potions,'potion',!s.potions||s.hp===s.maxHp));
 }else if(s.phase==='upgrade'){
  $('intent').textContent='Привал. Выберите одно улучшение';
  $('actions').append(actionButton('⚔ Оружие','Атака +3','power'),actionButton('♥ Стойкость','Макс. здоровье +12, лечение 22','vitality'),actionButton('🧪 Припасы','Зелье +1, лечение 10','supply'));
 }else{
  $('intent').textContent=s.phase==='won'?'Дракон побеждён!':'Поход завершён';
  $('results').hidden=false;$('results').innerHTML='<h2>'+(s.phase==='won'?'🏆 Победа!':'Новая попытка — новая тактика')+'</h2><p>'+h.name+' • <b>'+s.score+' очков</b></p><p>Результат сохранён на сервере. Общий рекорд может только вырасти.</p>';
  const again=document.createElement('button');again.className='primary wide';again.textContent='Играть ещё';again.onclick=choose;$('results').append(again);
 }
}
function choose(){ $('selection').hidden=false;$('battle').hidden=true;$('results').hidden=true;$('resume').hidden=!run||['won','lost'].includes(run.state.phase);$('discard').hidden=$('resume').hidden;message('');heroCards(); }
async function act(action){if(busy)return;busy=true;render();message('Ход обрабатывается…');try{const d=await api({op:'move',id:run.id,token:run.token,version:run.version,action});run={...run,...d};save();message('');if(['won','lost'].includes(d.state.phase))await board();}catch(e){message(e.message+' Если связь прервалась, вернитесь к выбору героя и нажмите «Продолжить текущий поход».');}finally{busy=false;render();}}
async function board(){try{const d=await api({op:'board'});$('records').replaceChildren(...d.records.map(r=>{const row=document.createElement('div');row.className='board-row';const h=heroes.find(x=>x.id===r.hero);row.innerHTML='<span>'+h.name+'</span><b>'+r.best+' очков</b><small>'+r.runs+' забегов</small>';return row;}));$('history').replaceChildren(...d.history.map(r=>{const p=document.createElement('p');p.textContent=heroes.find(x=>x.id===r.hero).name+' • '+r.score+' • '+(r.won?'Победа':'Поражение')+' • '+new Date(r.date).toLocaleString('ru-RU');return p;}));if(!d.history.length)$('history').textContent='Пока нет завершённых забегов.';}catch(e){$('records').textContent='Не удалось загрузить общие рекорды. Нажмите «Обновить».';}}
$('start').onclick=async()=>{if(busy)return;busy=true;$('start').disabled=true;let started=false;message('Подключаемся к арене…');try{run=await api({op:'start',hero:selected});started=true;save();message('');}catch(e){message(e.message);}finally{busy=false;$('start').disabled=false;if(started){render();$('battle').scrollIntoView({behavior:'smooth'});}}};
$('resume').onclick=async()=>{try{const d=await api({op:'resume',id:run.id,token:run.token});run={...run,...d};save();message('');render();}catch(e){message(e.message);}};
$('discard').onclick=()=>{run=null;try{localStorage.removeItem('arena-current-v1');}catch{}choose();};
$('abandon').onclick=choose;$('refresh').onclick=board;$('rulesButton').onclick=()=>{$('rules').open=!$('rules').open;if($('rules').open)$('rules').scrollIntoView({behavior:'smooth'});};
try{run=JSON.parse(localStorage.getItem('arena-current-v1'));if(!run?.id||!heroes.some(h=>h.id===run.state?.hero))run=null;}catch{}
choose();board();
