export class Game {
  constructor(random = Math.random) { this.random = random; this.reset(); }
  reset() { Object.assign(this,{mode:'ready',time:0,distance:0,stars:0,score:0,health:3,y:0,vy:0,attack:0,cooldown:0,invulnerable:0,spawn:1.4,objects:[],effects:[]}); }
  start() { this.reset(); this.mode='playing'; }
  jump() { if(this.mode==='playing' && this.y===0 && this.vy===0) { this.attack=0; this.vy=610; return true; } return false; }
  strike() { if(this.mode==='playing' && this.cooldown===0 && this.y===0 && this.vy===0) { this.attack=.6; this.cooldown=.85; return true; } return false; }
  get kicking() { return this.attack>0 && this.y===0 && this.vy===0; }
  get speed() { return 210 + this.stars * 8; }
  step(dt) {
    if(this.mode!=='playing') return;
    dt=Math.min(dt,.05); this.time+=dt; const speed=this.speed; this.distance+=speed*dt/10;
    this.cooldown=Math.max(0,this.cooldown-dt); this.attack=Math.max(0,this.attack-dt); this.invulnerable=Math.max(0,this.invulnerable-dt);
    if(this.y>0||this.vy>0){this.vy-=1450*dt;this.y=Math.max(0,this.y+this.vy*dt);if(this.y===0){this.vy=0;this.attack=0;}}
    this.spawn-=dt;
    if(this.spawn<=0){ const kind=this.random()<.5?'barrier':'pad';this.objects.push({kind,x:560,y:0,hit:false});this.objects.push({kind:'star',x:560,y:kind==='barrier'?110:35,hit:false});this.spawn=1.8+this.random()*.55;}
    for(const o of this.objects){o.x-=speed*dt;if(o.hit)continue;
      if(o.kind==='star'&&Math.abs(o.x-100)<30&&Math.abs(o.y-(this.y+35))<48){o.hit=true;this.stars++;this.score+=100;this.effects.push({x:o.x,y:o.y,life:.5,text:'+100'});}
      else if(o.kind==='pad'&&this.kicking&&o.x>85&&o.x<195&&this.y<145){o.hit=true;this.score+=50;this.effects.push({x:o.x,y:40,life:.5,text:'Кудо! +50'});}
      else if(o.kind!=='star'&&Math.abs(o.x-100)<28&&this.y<65&&this.invulnerable===0){o.hit=true;this.health--;this.invulnerable=1.2;if(this.health<=0)this.mode='lost';}
    }
    this.objects=this.objects.filter(o=>o.x>-60);this.effects=this.effects.filter(e=>(e.life-=dt)>0);
    if(this.time>=60&&this.mode==='playing'){this.mode='won';this.score+=Math.round(this.distance);}
  }
  snapshot(){return {mode:this.mode,health:this.health,stars:this.stars,score:this.score,speed:this.speed,y:this.y,kicking:this.kicking,seconds:Math.max(0,Math.ceil(60-this.time))};}
}
