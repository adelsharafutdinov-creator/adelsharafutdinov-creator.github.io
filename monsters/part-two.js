'use strict';
const shadowArt=new Image();shadowArt.src='shadow-bullet.png';
function enterShadowArena(){enterCellar();wave=7;boss=null;ratClone=null;scopeTarget=null;remaining=9;pitOpen=false;notice='Ущелье теней. Теневая пуля уже здесь!';noticeTime=5;hud();}
function shadowShot(x,y,speed=310){const dx=player.x+20-x,dy=player.y+30-y,len=Math.hypot(dx,dy)||1;enemyShots.push({x,y,w:16,h:16,vx:dx/len*speed,vy:dy/len*speed,life:4,kind:'shadow',damage:5});}
function spawnBulletHelper(helper=false){monsters.push({type:'bulletHelper',helper,x:Math.max(30,Math.min(world-70,player.x+(Math.random()<.5?-1:1)*440)),y:200+Math.random()*200,w:44,h:52,hp:2,slow:0,cool:1.8});if(!helper)remaining--;}
function updateShadowHelper(m,dt){if(m.type==='shadowCopy'){m.life-=dt;if(m.life<=0||!boss||boss.hp<=0){m.hp=0;return;}}m.slow=Math.max(0,m.slow-dt);const slow=m.slow>0?.35:1;m.prevX=m.x;m.x+=Math.sign(player.x-m.x)*(m.type==='shadowCopy'?35:105)*dt*slow;m.y+=(player.y+10-m.y)*dt*.45*slow;m.x=Math.max(0,Math.min(world-m.w,m.x));m.y=Math.max(100,Math.min(ground-m.h,m.y));stopAtWalls(m);m.cool-=dt;if(m.cool<=0){shadowShot(m.x+m.w*.5,m.y+m.h*.5,260);m.cool=m.type==='shadowCopy'?1.8:2.5;}if(rect(player,m))hurt(m.type==='shadowCopy'?10:5);}
function updateShadowBoss(dt){const b=boss;b.slow=Math.max(0,b.slow-dt);b.timer-=dt;b.airTimer-=dt;b.summon-=dt;
 if(b.airTimer<=0){const angle=Math.random()*Math.PI*2,x=Math.max(20,Math.min(world-30,player.x+20+Math.cos(angle)*190)),y=Math.max(80,Math.min(ground-40,player.y-100+Math.sin(angle)*100));shadowShot(x,y);b.airTimer=1.6;}
 if(b.summon<=0){if(monsters.filter(m=>m.type==='bulletHelper'&&m.hp>0).length<4)spawnBulletHelper(true);b.summon=4;}
 if(b.mode==='burrow'){if(b.timer<=0){b.x=Math.max(20,Math.min(world-b.w-20,player.x+(Math.random()<.5?-260:260)));b.y=ground-b.h;b.mode='wait';b.timer=.5;b.burrowTimer=7;burst(b.x+b.w/2,ground,'#a493bb');}return;}
 b.burrowTimer-=dt;b.copyTimer-=dt;
 if(b.copyTimer<=0){if(!monsters.some(m=>m.type==='shadowCopy'&&m.hp>0)){for(let i=0;i<3;i++)monsters.push({type:'shadowCopy',x:Math.max(20,Math.min(world-140,player.x+[-280,230,440][i])),y:ground-170,w:135,h:170,hp:3,slow:0,cool:.7+i*.3,life:5});}b.copyTimer=11;}
 if(b.burrowTimer<=0){b.mode='burrow';b.timer=1.4;return;}
 b.prevX=b.x;b.x+=Math.sign(player.x-b.x)*30*dt*(b.slow>0?.35:1);b.x=Math.max(0,Math.min(world-b.w,b.x));stopAtWalls(b);b.y=ground-b.h+Math.sin(time*3)*6;
 if(b.timer<=0){shadowShot(b.x+b.w*.48,b.y+b.h*.48);shadowShot(b.x+b.w*.62,b.y+b.h*.6,270);b.timer=1.6;}if(rect(player,b))hurt(15);
}
function drawShadowSprite(m){if(m===boss&&m.mode==='burrow')return;if(shadowArt.complete&&shadowArt.naturalWidth){const scale=Math.min(m.w/shadowArt.naturalWidth,m.h/shadowArt.naturalHeight);ctx.drawImage(shadowArt,m.x+(m.w-shadowArt.naturalWidth*scale)/2,m.y,shadowArt.naturalWidth*scale,shadowArt.naturalHeight*scale);}else{polygon([[m.x,m.y+m.h],[m.x+m.w*.4,m.y],[m.x+m.w,m.y+m.h*.2]],'#c8bedb');circle(m.x+m.w*.5,m.y+m.h*.45,15,'#241b36');}}
function drawShadowHelper(m){ctx.save();ctx.globalAlpha=m.type==='shadowCopy'?.6:1;drawShadowSprite(m);ctx.restore();round(m.x,m.y-10,m.hp*12,4,2,'#d8b5ff');if(m.type==='shadowCopy'){ctx.fillStyle='#ead7ff';ctx.textAlign='center';ctx.font='bold 13px sans-serif';ctx.fillText('КОПИЯ · '+Math.ceil(m.life)+'с',m.x+m.w/2,m.y-18);}}
function drawShadowArena(){for(let i=0;i<14;i++){const x=i*200;polygon([[x-35,ground],[x+40,170+i%3*65],[x+130,ground]],'#302a41');polygon([[x+30,ground],[x+95,330],[x+160,ground]],'#706181');circle(x+80,400,24,'#be8fff13');}}
const kindRotorArt=new Image();kindRotorArt.src='fang-spinner-kind.png';
const rotorArt=new Image();rotorArt.src='fang-spinner.png';
let tunnel=null;
function beginTunnel(){phase='descent';descentTime=0;scopeTarget=null;tunnel={hp:6,cool:0,shots:[],flash:0,recoil:0};shots=[];enemyShots=[];monsters=[];ratClone=null;demiBuddy=null;demiShots=[];clearInputs();record();$('wave').textContent='Таинственный тоннель';}
function tunnelPositions(){return {x:W/2,heroY:H*.72,copyY:H*(.06+Math.min(1,Math.max(0,descentTime-1.3)/4)*.25)-(tunnel?.recoil||0)};}
function updateDescent(dt){
 if(!tunnel){beginTunnel();}descentTime+=dt;time+=dt;tunnel.cool-=dt;tunnel.recoil=Math.max(0,tunnel.recoil-55*dt);tunnel.flash=Math.max(0,tunnel.flash-dt);
 const p=tunnelPositions();
 if(descentTime>1.8&&descentTime<8.4&&tunnel.hp>0&&tunnel.cool<=0){const manual=pressed('Space')||pressed('KeyJ');tunnel.shots.push({y:p.heroY-35});tunnel.cool=manual?.25:.75;}
 for(const s of tunnel.shots){s.y-=H*1.7*dt;if(tunnel.hp>0&&s.y<=p.copyY+65){tunnel.recoil=Math.min(55,tunnel.recoil+24);tunnel.flash=.18;s.y=-100;}}
 tunnel.shots=tunnel.shots.filter(s=>s.y>-50);
 if(descentTime>=10)enterRotorField();
}
function drawTunnel(){
 const p=tunnelPositions(),half=Math.min(W*.29,210),left=p.x-half,right=p.x+half;
 ctx.clearRect(0,0,W,H);round(0,0,W,H,0,'#0a121c');round(left,0,half*2,H,0,'#263640');
 for(let i=0;i<18;i++){const y=(i*65-descentTime*60)% (H+100);round(left-65,y,70,48,7,i%2?'#4b504b':'#3b4548');round(right-5,y+22,70,48,7,i%2?'#3b4548':'#4b504b');}
 circle(p.x,22-descentTime*30,half*.85,'#8ea96e');
 ctx.strokeStyle='#8c7e64';ctx.lineWidth=6;for(const x of [p.x-38,p.x+38]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let i=0;i<18;i++)round(p.x-38,((i*45-descentTime*75)%(H+50)+H+50)%(H+50),76,5,2,'#b39b71');
 if(tunnel?.hp>0){ctx.save();ctx.globalAlpha=tunnel.flash>0?.35:.8;drawSnakeSprite({x:p.x-70,y:p.copyY-40,w:140,h:140});ctx.restore();ctx.fillStyle='#e6c8ff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(descentTime<1.8?'КОПИЯ СМОТРИТ СВЕРХУ…':'ОНА ЛЕЗЕТ ЗА ТОБОЙ!',p.x,p.copyY+115);}
 else if(descentTime<7.5){circle(p.x,p.copyY+30,30+Math.sin(descentTime*8)*8,'#b2f3d633');}
 const bob=Math.sin(descentTime*11)*4;ctx.save();ctx.translate(p.x,p.heroY+bob);ctx.rotate(-.12);if(hero.complete&&hero.naturalWidth)ctx.drawImage(hero,-31,-40,62,93);else round(-15,-20,30,60,8,'#ddd9ae');round(20,-35,10,30,3,'#8fcbd3');round(18,-42,14,9,3,'#ffd98a');ctx.restore();
 for(const s of tunnel?.shots||[]){round(p.x+21,s.y,6,25,3,'#fff0ab');circle(p.x+24,s.y+5,6,'#ffe39344');}
 round(8,H-52,W-16,44,10,'#101d29dd');ctx.fillStyle='#fff2c7';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText(descentTime<1.8?'Раян спускается в таинственный тоннель…':tunnel?.hp>0?'Стреляй вверх: Пробел / Стрелять!':'Копия всё ещё идёт за тобой…',W/2,H-25,W-28);
 if(descentTime>8.3){ctx.save();ctx.globalAlpha=Math.min(1,(descentTime-8.3)/1.2);round(0,0,W,H,0,'#030608');ctx.restore();if(descentTime>9.3){ctx.fillStyle='#fff0b5';ctx.font='bold 24px sans-serif';ctx.fillText('ЧАСТЬ 2',W/2,H/2);}}
}
function enterRotorField(){enterCellar();wave=6;boss=null;ratClone=null;scopeTarget=null;pitOpen=false;tunnel=null;descentTime=0;remaining=8;spawnTimer=1.5;player.inv=2;spawnTunnelPursuer();notice='Копия Змея-паука пролезла следом! Берегись её и вертушек.';noticeTime=6;hud();}
function spawnRotor(helper=false){const x=Math.max(40,Math.min(world-100,player.x+(Math.random()<.5?-1:1)*(75+Math.random()*210)));monsters.push({x,y:ground-44,w:48,h:44,hp:helper?2:3,type:'rotor',helper,slow:0,mode:'buried',timer:.9,vx:0,vy:0,phase:Math.random()*6});if(!helper)remaining--;}
function updateRotorHelper(m,dt){m.slow=Math.max(0,m.slow-dt);m.timer-=dt;const step=dt*(m.slow>0?.35:1);if(m.mode==='buried'){if(m.timer<=0){m.mode='air';m.y=ground-m.h;m.vx=Math.max(-200,Math.min(200,(player.x+20-m.x-m.w/2)*1.1));m.vy=-500;burst(m.x+24,ground,'#c0a876');}return;}m.prevX=m.x;m.x=Math.max(0,Math.min(world-m.w,m.x+m.vx*step));m.vy+=800*step;m.y+=m.vy*step;stopAtWalls(m);if(rect(player,m))hurt(5);if(m.y+m.h>=ground&&m.vy>0){m.y=ground-m.h;m.mode='buried';m.timer=1.4;m.x=Math.max(40,Math.min(world-100,player.x+(Math.random()<.5?-1:1)*(80+Math.random()*150)));}}
function drawRotorHelper(m){if(m.mode==='buried'){ctx.strokeStyle='#ffdc89';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x+24,ground-3,27+Math.sin(time*15)*3,7,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffe5a5';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('!',m.x+24,ground-17);return;}drawRotorBlades(m.x+24,m.y+22,23,time*14,m.slow>0?'#a5ebff':'#edb35d');circle(m.x+24,m.y+22,8,'#335b68');circle(m.x+22,m.y+20,2,'#fff0ad');round(m.x+6,m.y-9,m.hp*11,4,2,'#fff0ad');}
function drawRotorBlades(x,y,r,angle,color){ctx.save();ctx.translate(x,y);ctx.rotate(angle);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(r*.55,0,r*.65,r*.22,.3,0,Math.PI*2);ctx.fill();}ctx.restore();}
function updateRotorBoss(dt){const b=boss;if(!b.angry){b.y+=(220+Math.sin(time*1.5)*12-b.y)*Math.min(1,dt*2);return;}b.timer-=dt;b.summon-=dt;b.slow=Math.max(0,b.slow-dt);const speed=b.slow>0?.4:1;b.prevX=b.x;if(b.summon<=0){if(monsters.filter(m=>m.helper&&m.hp>0).length<3)spawnRotor(true);b.summon=4;}
 if(b.mode==='charge'){b.x+=b.vx*dt*speed;b.y+=b.vy*dt*speed;b.dashTime-=dt;if(b.dashTime<=0){b.mode='wait';b.timer=1.8;}}
 else if(b.mode==='warn'){if(b.timer<=0){const dx=player.x-b.x,dy=player.y-b.y,len=Math.hypot(dx,dy)||1;b.vx=dx/len*300;b.vy=dy/len*300;b.dashTime=.7;b.mode='charge';}}
 else{b.y+=(220+Math.sin(time*2)*50-b.y)*dt*1.5*speed;if(Math.abs(player.x-b.x)>250)b.x+=Math.sign(player.x-b.x)*35*dt*speed;if(b.timer<=0){if(b.attack++%2===0){launchBossShot('shot');b.timer=1.7;}else{b.mode='warn';b.timer=.9;}}}
 b.x=Math.max(0,Math.min(world-b.w,b.x));b.y=Math.max(100,Math.min(ground-b.h,b.y));stopAtWalls(b);if(rect(player,b))hurt(15);
}
function drawRotorBoss(b){const art=b.angry?rotorArt:kindRotorArt;if(art.complete&&art.naturalWidth){const scale=Math.min(b.w/art.naturalWidth,b.h/art.naturalHeight);ctx.drawImage(art,b.x+(b.w-art.naturalWidth*scale)/2,b.y,art.naturalWidth*scale,art.naturalHeight*scale);}else drawRotorBlades(b.x+b.w/2,b.y+b.h/2,70,time*5,'#df9c4b');ctx.save();ctx.globalAlpha=.25;drawRotorBlades(b.x+b.w/2,b.y+b.h*.76,b.w*.45,time*(b.angry?9:2),'#ffe0a1');ctx.restore();}
function drawRotorField(){for(let i=0;i<10;i++){const x=i*280;round(x+55,450,90,70,28,'#5d6657');round(x+70,452,65,11,5,'#8b9877');polygon([[x+130,520],[x+150,440],[x+175,520]],'#70765d');for(let j=0;j<3;j++){ctx.strokeStyle='#8d9e67';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+j*24,520);ctx.lineTo(x+j*24-10,470+j*5);ctx.stroke();}round(x+200,ground-8,55,8,4,'#3c4036');}}

function startSecondPart(){reset();wave=5;bossesDefeated=5;beginTunnel();}
$('startPartTwo').onclick=()=>{if(window.playerProfiles)window.playerProfiles.require(startSecondPart);else startSecondPart();};

function spawnTunnelPursuer(){monsters.push({type:'pursuer',x:Math.min(world-180,player.x+470),y:ground-180,w:150,h:180,hp:6,slow:0,cool:1.6,copyTimer:5,echo:false});}
function updatePursuer(m,dt){if(m.echo){m.life-=dt;if(m.life<=0||m.parent.hp<=0){m.hp=0;return;}}m.slow=Math.max(0,m.slow-dt);m.prevX=m.x;m.x=Math.max(0,Math.min(world-m.w,m.x+Math.sign(player.x-m.x)*40*dt*(m.slow>0?.35:1)));m.y=ground-m.h;stopAtWalls(m);m.cool-=dt;if(m.cool<=0){launchSnakeOrb(m);m.cool=m.echo?2.5:2;}if(rect(player,m))hurt(m.echo?5:10);if(!m.echo){m.copyTimer-=dt;if(m.copyTimer<=0){if(!monsters.some(c=>c.type==='pursuer'&&c.echo&&c.hp>0)){for(const dir of [-1,1])monsters.push({type:'pursuer',x:Math.max(0,Math.min(world-130,m.x+dir*190)),y:ground-150,w:125,h:150,hp:3,slow:0,cool:1,echo:true,life:5,parent:m});burst(m.x+75,m.y+70,'#c3a3ee');}m.copyTimer=11;}}}
function drawPursuer(m){ctx.save();ctx.globalAlpha=m.echo?.48:.82;drawSnakeSprite(m);ctx.restore();const max=m.echo?3:6;for(let i=0;i<max;i++)round(m.x+m.w/2-max*7+i*14,m.y-10,10,4,2,i<m.hp?'#d6b3ff':'#514965');ctx.fillStyle='#e9d0ff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(m.echo?'КОПИЯ · '+Math.ceil(m.life)+'с':'КОПИЯ ИЗ ТОННЕЛЯ',m.x+m.w/2,m.y-20);}
