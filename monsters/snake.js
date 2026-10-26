'use strict';
const snakeArt=new Image();snakeArt.src='snake-spider.png';
let pitOpen=false,descentTime=0;
function enterSnakeLair(){enterCellar();wave=5;ratClone=null;boss=null;remaining=8;pitOpen=false;descentTime=0;notice='Логово Змея-паука. Следи за трещинами в земле!';noticeTime=5;hud();}
function launchSnakeOrb(source){const x=source.x+source.w/2,y=source.y+source.h*.3,dx=player.x+20-x,dy=player.y+35-y,len=Math.hypot(dx,dy)||1;enemyShots.push({x,y,w:20,h:20,vx:dx/len*260,vy:dy/len*260,life:5,kind:'orb',damage:5});}
function updateSnakeBoss(dt){
 const b=boss;b.slow=Math.max(0,b.slow-dt);b.timer-=dt;b.summon-=dt;
 if(b.summon<=0){if(monsters.filter(m=>m.helper&&m.hp>0).length<3)spawn(true);b.summon=6;}
 updateSnakeClone(dt);
 if(b.mode==='burrow'){
  if(b.timer<=0){b.mode='rise';b.timer=.7;b.y=ground;burst(b.x+b.w/2,ground,'#ac9672');}
 }else if(b.mode==='rise'){
  b.y=ground-b.h*(1-Math.max(0,b.timer)/.7);
  if(b.timer<=0){b.y=ground-b.h;b.mode='wait';b.timer=1.1;}
 }else if(b.mode==='flipWarn'){
  if(b.timer<=0){b.mode='flip';b.timer=1;b.flipFrom=b.x;b.flipTo=Math.max(0,Math.min(world-b.w,b.x+(player.x>b.x?220:-220)));}
 }else if(b.mode==='flip'){
  const t=1-Math.max(0,b.timer);b.x=b.flipFrom+(b.flipTo-b.flipFrom)*t;b.y=ground-b.h-Math.sin(t*Math.PI)*120;
  if(b.timer<=0){b.mode='wait';b.timer=1.8;b.y=ground-b.h;}
 }else{
  b.prevX=b.x;b.x=Math.max(0,Math.min(world-b.w,b.x+Math.sign(player.x-b.x)*22*dt*(b.slow>0?.4:1)));stopAtWalls(b);
  if(b.timer<=0){const attack=b.attack++%4;
   if(attack===0){launchSnakeOrb(b);b.timer=1.4;}
   else if(attack===1){ratClone={x:Math.max(0,Math.min(world-180,b.x+(player.x<b.x?-230:230))),y:ground-210,w:180,h:210,hp:3,slow:0,life:5,cool:.8};burst(ratClone.x+90,ratClone.y+100,'#b4f487');b.timer=1.6;}
   else if(attack===2){b.mode='flipWarn';b.timer=.7;}
   else{b.mode='burrow';b.timer=1.5;b.x=Math.max(0,Math.min(world-b.w,player.x+(player.dir>0?150:-300)));b.y=ground-b.h;}
  }
 }
 if(!['burrow','flipWarn'].includes(b.mode)&&rect(player,b))hurt(15);
}
function updateSnakeClone(dt){if(!ratClone)return;const c=ratClone;c.life-=dt;if(c.life<=0||!boss||boss.hp<=0){ratClone=null;return;}c.slow=Math.max(0,c.slow-dt);c.prevX=c.x;c.x=Math.max(0,Math.min(world-c.w,c.x+Math.sign(player.x-c.x)*35*dt*(c.slow>0?.4:1)));stopAtWalls(c);c.y=ground-c.h;c.cool-=dt;if(c.cool<=0){launchSnakeOrb(c);c.cool=1.5;}if(rect(player,c))hurt(10);}
function drawSnakeSprite(m){ctx.save();ctx.translate(m.x+m.w/2,m.y+m.h/2);if(player.x<m.x)ctx.scale(-1,1);if(snakeArt.complete&&snakeArt.naturalWidth){const scale=Math.min(m.w/snakeArt.naturalWidth,m.h/snakeArt.naturalHeight);ctx.drawImage(snakeArt,-snakeArt.naturalWidth*scale/2,m.h/2-snakeArt.naturalHeight*scale,snakeArt.naturalWidth*scale,snakeArt.naturalHeight*scale);}else{round(-22,-80,44,145,20,'#52b981');for(let i=0;i<4;i++)polygon([[-10,45],[-70+i*12,95],[-45+i*10,45]],'#9b6dca');circle(0,-65,32,'#9bdc5c');}ctx.restore();}
function drawSnakeBoss(b){
 if(b.mode==='burrow'){ctx.strokeStyle='#f6d47a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(b.x,ground-2);ctx.lineTo(b.x+35,ground-14);ctx.lineTo(b.x+70,ground-3);ctx.lineTo(b.x+120,ground-18);ctx.lineTo(b.x+b.w,ground-3);ctx.stroke();ctx.fillStyle='#fff2b2';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('⚠ ИЗ ЗЕМЛИ!',b.x+b.w/2,ground-35);return;}
 ctx.save();ctx.beginPath();ctx.rect(0,0,world,ground);ctx.clip();
 if(b.mode==='flip'){ctx.translate(b.x+b.w/2,b.y+b.h/2);ctx.rotate((1-b.timer)*Math.PI*2);ctx.translate(-b.x-b.w/2,-b.y-b.h/2);circle(b.x+b.w/2,b.y+b.h/2,Math.max(b.w,b.h)/2+8,'#adf6ff55');}
 drawSnakeSprite(b);ctx.restore();
 if(b.mode==='flipWarn'){ctx.fillStyle='#fff2b2';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText('⚠ СЕЙЧАС САЛЬТО!',b.x+b.w/2,b.y-12);}
}
function drawLittleSnake(m){ctx.save();ctx.translate(m.x+m.w/2,m.y+m.h/2);ctx.scale(player.x<m.x?-1:1,1);ctx.strokeStyle=m.slow>0?'#a9eaff':'#85c86c';ctx.lineWidth=14;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-24,18);ctx.bezierCurveTo(-8,18,-18,0,0,5);ctx.bezierCurveTo(18,11,2,-8,12,-12);ctx.stroke();circle(14,-12,13,'#b6dc75');circle(19,-16,3,'#233c30');round(23,-10,10,2,1,'#ed8195');ctx.restore();}
function drawSnakeLair(){round(0,0,world,ground,0,'#243c37');for(let i=0;i<18;i++){const x=i*160;polygon([[x-20,0],[x+110,0],[x+80,75],[x+45,120]],'#3b5144');ctx.strokeStyle='#6d7951';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x+25,0);ctx.bezierCurveTo(x+85,90,x-40,140,x+30,230);ctx.stroke();round(x+15,290,120,230,60,'#142d29');circle(x+75,435,38,'#a6dd5b18');for(let j=0;j<3;j++){round(x+45+j*15,ground-40,5,40,2,'#9c9b72');circle(x+47+j*15,ground-42,10,'#87bc84');}}}
function drawExitPit(){if(!pitOpen)return;const x=world-120;ctx.save();ctx.fillStyle='#101a21';ctx.beginPath();ctx.ellipse(x,ground+8,70,19,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#bba877';ctx.lineWidth=5;ctx.stroke();for(const side of [-1,1])round(x+side*20-3,ground,6,80,2,'#d2ae76');for(let i=0;i<5;i++)round(x-20,ground+10+i*15,40,4,2,'#d2ae76');ctx.fillStyle='#fff3b8';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.fillText('↓ ВНИЗ · СЛЕДУЮЩАЯ ЧАСТЬ',x-30,ground-160);ctx.restore();}
