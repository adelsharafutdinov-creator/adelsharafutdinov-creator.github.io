import {Game} from './engine.js';
const $=id=>document.getElementById(id);
const game=new Game();
const canvas=$('scene'),ctx=canvas.getContext('2d');
const characters=new Map();let selected='rayan';
let coach=null;
let atlas=null,paused=false,last=0,feedbackUntil=0,previousStars=0,previousHealth=3,clock=0;
const ready=()=>Boolean(atlas);
function announce(text){$('feedback').textContent=text;feedbackUntil=performance.now()+1300;}
function controls(){const enabled=ready()&&game.mode==='playing'&&!paused;$('jump').disabled=!enabled;$('strike').disabled=!enabled;$('pause').disabled=!ready()||game.mode!=='playing';$('pause').textContent=paused?'Продолжить':'Пауза';}
function overlay(title,message,button,eyebrow){$('overlay').hidden=false;$('characterPicker').hidden=game.mode==='playing';$('title').textContent=title;$('message').textContent=message;$('start').textContent=button;$('eyebrow').textContent=eyebrow;}
function start(){if(!ready())return;if(paused&&game.mode==='playing'){paused=false;}else{game.start();previousStars=0;previousHealth=3;}last=performance.now();$('overlay').hidden=true;controls();}
function pause(){if(game.mode!=='playing'||!ready())return;paused=!paused;if(paused)overlay('Передохнём?','Забег остановлен. Продолжай, когда будешь готов.','Продолжить','Пауза');else{$('overlay').hidden=true;last=performance.now();}controls();}
function action(kind){if(!ready()||paused)return;kind==='jump'?game.jump():game.strike();}
$('start').addEventListener('click',start);$('pause').addEventListener('click',pause);
for(const [id,kind]of[['jump','jump'],['strike','strike']])$(id).addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();action(kind);});
// Keyboard activation of accessible buttons remains available to assistive input.
for(const [id,kind]of[['jump','jump'],['strike','strike']])$(id).addEventListener('click',e=>{if(e.detail===0)action(kind);});
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey)return;if(e.target?.closest?.('.character-choice'))return;const key=e.key.toLowerCase();if([' ','arrowup','k','л','enter','p','з','escape'].includes(key)){e.preventDefault();if(key==='p'||key==='з'||key==='escape')pause();else if(key==='enter'&&(game.mode!=='playing'||paused))start();else action(key===' '||key==='arrowup'?'jump':'strike');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.mode==='playing'&&!paused)pause();});
function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}
new ResizeObserver(resize).observe(canvas);
function drawCharacter(floor){
 if(!atlas)return;
 const state=game.mode==='playing'?(game.y>0?'jump':game.kicking?'strike':'run'):game.mode==='won'?'wave':game.mode==='lost'?'lost':'idle';
 const animation=atlas.animations[state]||atlas.animations.idle;
 let index=Math.floor((game.mode==='playing'?game.time:clock)*(animation.fps||8))%animation.frames.length;
 if(state==='jump')index=animation.frames.length<=2?(Math.abs(game.vy)<200?animation.frames.length-1:0):Math.min(animation.frames.length-1,game.vy>180?1:game.vy>-120?2:3);
 const frame=animation.frames[index],height=158,width=height*frame.w/frame.h;
 const extension=game.kicking?Math.sin((.6-game.attack)/.6*Math.PI):0;
 ctx.save();ctx.globalAlpha=.24;ctx.fillStyle='#040d1e';ctx.beginPath();ctx.ellipse(100,floor+4,38-game.y*.1,7,0,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();if(game.invulnerable>0&&Math.floor(game.time*12)%2)ctx.globalAlpha=.4;
 if(game.kicking&&atlas.kick){
  // One planted-foot kick pose. Its source pixels are preserved, never cut or rotated.
  const k=atlas.kick,f=k.frame,h=142,w=h*f.w/f.h;
  ctx.drawImage(k.image,f.x,f.y,f.w,f.h,100-w*k.anchorX,floor-h*k.anchorY,w,h);
 }else ctx.drawImage(atlas.image,frame.x,frame.y,frame.w,frame.h,100-width/2,floor-game.y-height+8,width,height);
 ctx.restore();
 if(game.kicking){ctx.save();ctx.globalAlpha=extension*.75;ctx.strokeStyle='#ffe9a3';ctx.lineWidth=5;ctx.beginPath();ctx.arc(166,floor-70,29,-.7,.65);ctx.stroke();ctx.restore();}
}
function drawCoach(floor){
 if(!coach)return;
 const waving=game.mode==='ready'||game.mode==='won'||(game.mode==='playing'&&game.time<5);
 const f=waving?coach.wave:coach.idle,h=104,w=h*f.w/f.h,x=492,foot=floor-82;
 // A raised side platform is scenery only, ahead of the runner and above the obstacle lane.
 ctx.save();ctx.fillStyle='#416174';ctx.beginPath();ctx.ellipse(x,foot+3,33,5,0,0,Math.PI*2);ctx.fill();
 ctx.drawImage(coach.image,f.x,f.y,f.w,f.h,x-w/2,foot-h,w,h);
 ctx.restore();
}
function draw(){
 const scale=canvas.width/560,H=canvas.height/scale,floor=H-66;
 ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,560,H);
 const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1c3b57');bg.addColorStop(.8,'#183049');bg.addColorStop(1,'#101e34');ctx.fillStyle=bg;ctx.fillRect(0,0,560,H);
 // Abstract illuminated training grid, with separate distant and foreground speeds.
 ctx.strokeStyle='#638fa41d';ctx.lineWidth=1;
 const drift=(game.distance*1.5)%100;
 for(let x=-drift;x<650;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,floor);ctx.stroke();}
 for(let y=floor-80;y>0;y-=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(560,y);ctx.stroke();}
 ctx.fillStyle='#213e51';ctx.fillRect(0,floor,560,H-floor);ctx.fillStyle='#83e0eb';ctx.shadowColor='#83e0eb';ctx.shadowBlur=8;ctx.fillRect(0,floor,560,3);ctx.shadowBlur=0;
 const offset=game.distance*10%100;ctx.fillStyle='#547787';for(let x=-offset;x<560;x+=100)ctx.fillRect(x,floor+37,45,3);
 drawCoach(floor);
 for(const o of game.objects){if(o.hit)continue;const y=floor-o.y;
 if(o.kind==='star'){ctx.save();ctx.font='36px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffdb7c';ctx.shadowColor='#ffc85a';ctx.shadowBlur=15;ctx.fillText('★',o.x,y-20+Math.sin(clock*4+o.x*.01)*3);ctx.restore();}
 else if(o.kind==='barrier'){ctx.fillStyle='#ec8f8a';ctx.beginPath();ctx.roundRect(o.x-22,y-56,44,56,6);ctx.fill();ctx.fillStyle='#ffe8da';ctx.fillRect(o.x-22,y-43,44,7);ctx.font='bold 23px system-ui';ctx.textAlign='center';ctx.fillStyle='#854241';ctx.fillText('↑',o.x,y-10);}
 else{ctx.fillStyle='#eab95e';ctx.beginPath();ctx.roundRect(o.x-20,y-74,40,74,8);ctx.fill();ctx.strokeStyle='#946524';ctx.lineWidth=3;ctx.beginPath();ctx.arc(o.x,y-47,11,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff0b5';ctx.font='20px system-ui';ctx.textAlign='center';ctx.fillText('✦',o.x,y-15);}}
 drawCharacter(floor);
 for(const e of game.effects){ctx.save();ctx.globalAlpha=Math.min(1,e.life*3);ctx.font='bold 21px system-ui';ctx.fillStyle='#fff0a2';ctx.textAlign='center';ctx.fillText(e.text,e.x,floor-20-e.y-(.5-e.life)*60);ctx.restore();}
}
function tick(now){const dt=last?Math.max(0,(now-last)/1000):0;last=now;clock=now/1000;if(!paused){const before=game.mode;game.step(dt);if(game.stars>previousStars){announce('Звезда! +100 · Скорость ↑');previousStars=game.stars;}if(game.health<previousHealth){announce('Столкновение! Осталось попыток: '+game.health);previousHealth=game.health;}if(before==='playing'&&game.mode!=='playing'){overlay(game.mode==='won'?'Забег завершён!':'Ещё одна попытка?',`Звёзд: ${game.stars} · Очков: ${game.score}. ${game.mode==='won'?'Тренер Адель: «Отличная работа! Так держать!»':'Попробуй ещё раз — у тебя получится!'}`, 'Играть снова',game.mode==='won'?'Отличный финиш':'Тренировка продолжается');controls();}}
 $('coachBubble').hidden=!coach||paused||game.mode!=='playing'||game.time>=5;
 const s=game.snapshot();$('progress').style.width=(Math.min(game.time/60,1)*100)+'%';$('stars').textContent=s.stars;$('time').textContent=s.seconds+' с';$('health').textContent=s.health;$('cooldown').style.width=(game.cooldown/.85*100)+'%';if(now>feedbackUntil)$('feedback').textContent='';draw();requestAnimationFrame(tick);}
function selectCharacter(id){
 if(game.mode==='playing')return;
 const c=characters.get(id);if(!c)return;selected=id;atlas=c;
 $('heroName').textContent=c.name;
 $('choose-rayan').setAttribute('aria-pressed',String(id==='rayan'));
 $('choose-dia').setAttribute('aria-pressed',String(id==='dia'));
 $('scene').setAttribute('aria-label',c.name+' бежит по дорожке. Перепрыгивай красные преграды и разбивай золотые мишени.');
 $('start').disabled=false;controls();
}
for(const id of ['rayan','dia'])$('choose-'+id).addEventListener('click',()=>selectCharacter(id));
async function load(){
 try{
  const config=await fetch('character.json').then(r=>{if(!r.ok)throw Error('config');return r.json();});
  if(config.coach){
   const c=config.coach,image=new Image();image.src=c.src;
   image.decode().then(()=>{
    for(const f of [c.idle,c.wave])if(!f||![f.x,f.y,f.w,f.h].every(Number.isFinite)||f.x<0||f.y<0||f.w<=0||f.h<=0||f.x+f.w>image.naturalWidth||f.y+f.h>image.naturalHeight)return;
    coach={...c,image};
   }).catch(()=>{});
  }
  const entries=config.characters||[{...config.character,id:'rayan',name:'Раян'}];
  await Promise.all(entries.map(async c=>{
   try{
    const image=new Image();image.src=c.src;await image.decode();
    for(const name of ['idle','run','jump','strike']){const a=c.animations?.[name];if(!a?.frames?.length)throw Error('frames');for(const f of a.frames)if(![f.x,f.y,f.w,f.h].every(Number.isFinite)||f.x<0||f.y<0||f.w<=0||f.h<=0||f.x+f.w>image.naturalWidth||f.y+f.h>image.naturalHeight)throw Error('bounds');}
    let kick=null;
    if(c.kick){
     const kickImage=new Image();kickImage.src=c.kick.src;await kickImage.decode();
     const f=c.kick.frame;if(!f||![f.x,f.y,f.w,f.h].every(Number.isFinite)||f.x<0||f.y<0||f.w<=0||f.h<=0||f.x+f.w>kickImage.naturalWidth||f.y+f.h>kickImage.naturalHeight)throw Error('kick bounds');
     kick={image:kickImage,frame:f,anchorX:c.kick.anchorX??.35,anchorY:c.kick.anchorY??1};
    }
    characters.set(c.id,{image,animations:c.animations,name:c.name,kick});
    const avatar=$('avatar-'+c.id),f=c.animations.idle.frames[0];
    avatar.width=160;avatar.height=184;const k=Math.min(160/f.w,184/f.h);
    avatar.getContext('2d').drawImage(image,f.x,f.y,f.w,f.h,(160-f.w*k)/2,(184-f.h*k)/2,f.w*k,f.h*k);
    $('choose-'+c.id).disabled=false;
    if(c.id===selected)selectCharacter(c.id);
   }catch{ $('choose-'+c.id).disabled=true; }
  }));
  if(!atlas&&characters.size)selectCharacter(characters.keys().next().value);
  $('assetNote').hidden=characters.size===entries.length;
  if(characters.size<entries.length)$('assetNote').textContent=characters.size?'Один из героев не загрузился. Можно играть другим или обновить страницу.':'Не удалось загрузить игру. Обнови страницу и попробуй ещё раз.';
  $('draft').hidden=true;
 }catch{$('assetNote').hidden=false;$('assetNote').textContent='Не удалось загрузить игру. Обнови страницу и попробуй ещё раз.';$('start').disabled=true;}
}
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_rayan_game_state',description:'Прочитать результат и состояние текущего забега.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({...game.snapshot(),paused,character:selected,characterReady:ready(),coachReady:Boolean(coach)})})).catch(()=>{});}catch{}}
resize();requestAnimationFrame(tick);load();
