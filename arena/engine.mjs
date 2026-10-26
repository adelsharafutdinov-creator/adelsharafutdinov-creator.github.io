export const heroes=[
{id:'adel',name:'Адель',role:'Маг искры',weapon:'Посох',skill:'Разряд',detail:'20 урона сквозь броню',hp:64,attack:10},
{id:'denis',name:'Денис',role:'Щитоносец',weapon:'Щит и меч',skill:'Контрудар',detail:'12 урона и блок 18',hp:76,attack:9},
{id:'larisa',name:'Лариса',role:'Стрелок',weapon:'Арбалет',skill:'Пробитие',detail:'24 урона сквозь броню',hp:60,attack:11},
{id:'marat',name:'Марат',role:'Хранитель',weapon:'Рунный клинок',skill:'Восстановление',detail:'12 урона и лечение 14',hp:66,attack:9},
{id:'roman',name:'Роман',role:'Воин',weapon:'Молот',skill:'Сокрушение',detail:'22 урона и блок 6',hp:72,attack:10},
{id:'sveta',name:'Света',role:'Дуэлянт',weapon:'Парные клинки',skill:'Двойной удар',detail:'26 урона, броня действует дважды',hp:62,attack:12}
];
export const monsters=[
{name:'Моховой слизень',icon:'🟢',hp:26,damage:7,armor:0},
{name:'Клыкастый гриб',icon:'🍄',hp:34,damage:9,armor:1},
{name:'Каменный страж',icon:'🗿',hp:42,damage:10,armor:3},
{name:'Теневой волк',icon:'🐺',hp:44,damage:12,armor:1},
{name:'Король драконов',icon:'🐉',hp:72,damage:15,armor:2}
];
export function start(hero){const h=heroes.find(x=>x.id===hero);if(!h)throw Error('Неизвестный герой');return {hero,hp:h.hp,maxHp:h.hp,attack:h.attack,stage:0,enemyHp:26,turn:0,moves:0,cooldown:0,potions:2,score:0,phase:'battle',log:['Поход начался. Впереди пять боёв!']};}
export function intent(s){const m=monsters[s.stage];const t=s.turn%4;return t===1?{text:'Готовит тяжёлый удар',damage:0,armor:m.armor}:t===2?{text:'Тяжёлый удар',damage:m.damage*2,armor:m.armor}:t===3?{text:'Защита и удар',damage:m.damage-2,armor:m.armor+4}:{text:'Обычный удар',damage:m.damage,armor:m.armor};}
export function move(source,action){
 const s=structuredClone(source),h=heroes.find(x=>x.id===s.hero);
 if(s.phase==='won'||s.phase==='lost')throw Error('Забег уже завершён');
 if(s.moves>=200)throw Error('Лимит ходов');
 s.log=[];
 if(s.phase==='upgrade'){
  if(!['power','vitality','supply'].includes(action))throw Error('Выберите улучшение');
  if(action==='power'){s.attack+=3;s.log.push('Оружие усилено: +3 к атаке.');}
  if(action==='vitality'){s.maxHp+=12;s.hp=Math.min(s.maxHp,s.hp+22);s.log.push('Здоровье +12, лечение 22.');}
  if(action==='supply'){s.potions++;s.hp=Math.min(s.maxHp,s.hp+10);s.log.push('Получено зелье и лечение 10.');}
  s.stage++;s.enemyHp=monsters[s.stage].hp;s.turn=0;s.phase='battle';s.moves++;if(s.moves>=200){s.phase='lost';s.log.push('Достигнут лимит 200 ходов.');}return s;
 }
 if(!['attack','block','skill','potion'].includes(action))throw Error('Недопустимый ход');
 if(action==='skill'&&s.cooldown>0)throw Error('Способность ещё восстанавливается');
 if(action==='potion'&&(!s.potions||s.hp===s.maxHp))throw Error('Зелье сейчас недоступно');
 const i=intent(s);let damage=0,block=0;
 if(action==='attack')damage=Math.max(1,s.attack-i.armor);
 if(action==='block'){block=14;damage=2;s.log.push('Щит поглощает до 14 урона.');}
 if(action==='potion'){s.potions--;s.hp=Math.min(s.maxHp,s.hp+28);s.log.push('Зелье восстанавливает 28 здоровья.');}
 if(s.cooldown>0)s.cooldown--;
 if(action==='skill'){
  s.cooldown=3;
  if(h.id==='adel')damage=20;
  if(h.id==='denis'){damage=Math.max(1,12-i.armor);block=18;}
  if(h.id==='larisa')damage=24;
  if(h.id==='marat'){damage=Math.max(1,12-i.armor);s.hp=Math.min(s.maxHp,s.hp+14);}
  if(h.id==='roman'){damage=Math.max(1,22-i.armor);block=6;}
  if(h.id==='sveta')damage=2*Math.max(1,13-i.armor);
  s.log.push(h.skill+'!');
 }
 s.enemyHp=Math.max(0,s.enemyHp-damage);if(damage)s.log.push('Вы наносите '+damage+' урона.');
 s.turn++;s.moves++;
 if(s.enemyHp===0){
  const bonus=100*(s.stage+1)+Math.max(0,70-s.turn*5);s.score+=bonus;s.log.push('Монстр побеждён! +'+bonus+' очков.');
  if(s.stage===4){s.score+=500+s.hp*3;s.phase='won';s.log.push('Дракон повержен! Бонус победы 500 + здоровье × 3.');}
  else{s.phase='upgrade';s.hp=Math.min(s.maxHp,s.hp+8);s.log.push('Привал: лечение 8. Выберите улучшение.');}
 }else{
  const taken=Math.max(0,i.damage-block);s.hp=Math.max(0,s.hp-taken);s.log.push(i.damage?'Монстр наносит '+taken+' урона.':'Монстр готовит удар. Сейчас можно атаковать.');
  if(!s.hp||s.moves>=200){s.phase='lost';s.log.push('Поход завершён. Попробуйте другую тактику!');}
 }
 return s;
}
