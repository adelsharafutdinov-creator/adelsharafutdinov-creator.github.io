import {createClient} from './supabase.js';
const db=createClient('https://buitznzbhxuobphaabrv.supabase.co','sb_publishable_GNuhd_o0Cp1p666IUt2O9Q_RPOciTwK');
let suggestions=[],submissionId=null;
let canEdit=false,busy=false,version=null,baseline=null,currentEmail='',loaded=false;
const originalTexts=Object.fromEntries([...document.querySelectorAll('[data-key]')].map(el=>[el.dataset.key,el.textContent]));
let legacy=null;
try {
  const saved=localStorage.getItem('rayanState');
  if(saved){legacy=JSON.parse(saved);if(!localStorage.getItem('rayanStateBeforeCloud'))localStorage.setItem('rayanStateBeforeCloud',saved);}
}catch{}
const cloudStatus=document.getElementById('cloudStatus');
function report(text){cloudStatus.textContent=text}
function payload(){return {ideas:structuredClone(state.ideas),texts:{...state.texts}}}
function localBackup(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function acceptRemote(row){version=row.version;baseline=structuredClone(row.data);state.ideas=row.data.ideas;state.texts=row.data.texts;loaded=true;render()}
async function loadSuggestions(){
  const {data,error}=await db.from('rayan_suggestions').select('id,title,description,topic,created_at').eq('status','suggested').order('created_at',{ascending:false});
  if(error)throw error;
  suggestions=data.map(i=>({...i,suggested:true}));
}
async function submitSuggestion(title,description,topic){
  busy=true;renderAccess();
  const status=document.getElementById('ideaStatus');status.textContent='Добавление…';
  try {
    const {error}=await db.from('rayan_suggestions').insert({id:submissionId,title,description,topic});
    if(error&&error.code!=='23505')throw error;
    await loadSuggestions();
    if(state.filter!=='all')state.filter=topic;
    ideaDialog.close();render();report('Идея добавлена как предложение гостя.');
  }catch{status.textContent='Не удалось добавить идею. Текст остался в форме — проверьте соединение и попробуйте ещё раз.'}
  finally{busy=false;render()}
}
async function changeSuggestion(id,changes){
  if(!canEdit||busy)return false;
  busy=true;render();
  try{
    const {data,error}=await db.from('rayan_suggestions').update(changes).eq('id',id).eq('status','suggested').select('id').maybeSingle();
    if(error)throw error;
    await loadSuggestions();
    if(!data){report('Предложение уже изменено другим редактором.');return false}
    report('Предложение обновлено.');return true;
  }catch{document.getElementById('ideaStatus').textContent='Не удалось сохранить. Попробуйте ещё раз.';report('Не удалось сохранить предложение.');return false}
  finally{busy=false;render()}
}
async function acceptSuggestion(id){
  if(!canEdit||busy)return;
  busy=true;render();
  try{
    const {data,error}=await db.rpc('rayan_accept_suggestion',{suggestion_id:id});
    if(error)throw error;
    await loadCloud();report(data?'Предложение принято и добавлено в основные идеи.':'Предложение уже обработано.');
  }catch{report('Не удалось принять предложение. Попробуйте ещё раз.')}
  finally{busy=false;render()}
}
async function loadCloud(){
  const {data,error}=await db.from('rayan_content').select('data,version').eq('id',1).single();
  if(error)throw error;
  await loadSuggestions();
  acceptRemote(data);
}
function legacyCandidates(){
  if(!loaded||!Array.isArray(legacy?.ideas))return [];
  return legacy.ideas.filter(i=>typeof i.title==='string'&&!state.ideas.some(n=>n.title===i.title&&(n.description||'')===(i.description||'')&&categoryId(n.topic)===categoryId(i.topic)));
}
function renderAccess(){
  document.getElementById('editBtn').hidden=!canEdit;
  document.getElementById('editBtn').disabled=busy||!loaded;
  document.getElementById('addIdea').hidden=false;
  document.getElementById('addIdea').disabled=busy||!loaded;
  document.getElementById('loginBtn').hidden=!!currentEmail;
  document.getElementById('logoutBtn').hidden=!currentEmail;
  document.getElementById('logoutBtn').disabled=busy;
  document.getElementById('accessLabel').textContent=canEdit?'Редактор · '+currentEmail:currentEmail?'Участник · '+currentEmail:'Гость';
  ideaForm?.querySelector('[type=submit]')?.toggleAttribute('disabled',busy);
  const candidates=legacyCandidates();
  document.getElementById('legacyNotice').hidden=!canEdit||!candidates.length;
  document.getElementById('legacyText').textContent='В этом браузере есть сохранённые идеи, которых нет в общей версии: '+candidates.length+'. При добавлении существующие идеи останутся на месте.';
  document.getElementById('importLegacy').disabled=busy;
}
async function save(){
  if(!canEdit||busy||!loaded)return false;
  const draft=payload();localBackup('rayanPendingDraft',draft);
  busy=true;render();report('Сохранение…');
  try {
    const {data,error}=await db.from('rayan_content').update({data:draft}).eq('id',1).eq('version',version).select('data,version').maybeSingle();
    if(error)throw error;
    if(!data){
      await loadCloud();
      report('Кто-то уже изменил данные или доступ завершён. Общая версия загружена заново. Ваш черновик сохранён в этом браузере; повторите изменение.');
      await updateAccess();
      return false;
    }
    acceptRemote(data);
    localBackup('rayanLastSaved',data);
    try{localStorage.removeItem('rayanPendingDraft')}catch{}
    report('Сохранено для всех участников.');
    return true;
  }catch(error){
    if(baseline){state.ideas=structuredClone(baseline.ideas);state.texts={...baseline.texts}}
    report('Не удалось сохранить. Изменения не опубликованы; черновик сохранён в этом браузере. Проверьте соединение и повторите.');
    return false;
  }finally{busy=false;render()}
}
async function updateAccess(){
  const {data:{session}}=await db.auth.getSession();
  currentEmail=session?.user?.email||'';
  canEdit=false;
  if(session){
    const {data,error}=await db.rpc('rayan_can_edit');
    canEdit=!error&&data===true;
  }
  if(!canEdit){state.editing=false;if(editingIdea)ideaDialog.close()}
  render();
}
async function startCloud(){
  try{
    await updateAccess();await loadCloud();report('');
  }catch{report('Не удалось загрузить общие идеи. Проверьте соединение и обновите страницу.')}
  db.auth.onAuthStateChange(()=>{setTimeout(()=>{void updateAccess()},0)});
}
document.getElementById('googleLogin').onclick=async()=>{
  const button=document.getElementById('googleLogin');button.disabled=true;
  const status=document.getElementById('googleStatus');
  try{
    status.textContent='Открываем Google…';
    const response=await fetch('https://buitznzbhxuobphaabrv.supabase.co/auth/v1/settings',{headers:{apikey:'sb_publishable_GNuhd_o0Cp1p666IUt2O9Q_RPOciTwK'}});
    if(!response.ok)throw new Error('settings');
    const settings=await response.json();
    if(!settings.external?.google){status.textContent='Вход через Google ещё настраивается. Пока можно войти по ссылке из письма ниже.';button.disabled=false;return}
    const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/',queryParams:{prompt:'select_account'}}});if(error)throw error;
  }catch{status.textContent='Не удалось открыть вход через Google. Попробуйте ещё раз.';button.disabled=false}
};
const loginDialog=document.getElementById('loginDialog');
document.getElementById('loginBtn').onclick=()=>{loginDialog.showModal();document.getElementById('googleLogin').focus()};
document.getElementById('closeLogin').onclick=()=>loginDialog.close();
document.getElementById('loginForm').onsubmit=async event=>{
  event.preventDefault();
  const button=document.getElementById('sendLogin'),status=document.getElementById('loginStatus');
  button.disabled=true;status.textContent='Отправка…';
  try {
    const email=document.getElementById('loginEmail').value.trim().toLowerCase();
    const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+'/'}});
    if(error)throw error;
    status.textContent='Проверьте почту и папку «Спам». Откройте ссылку из письма. Право редактирования появится только у разрешённого адреса.';
  }catch(error){
    status.textContent=error.code==='over_email_send_rate_limit'?'Слишком много запросов. Попробуйте позже.':error.code==='email_address_not_authorized'?'Отправка на этот адрес пока недоступна. Требуется настройка почтового сервиса проекта.':'Не удалось отправить письмо. Попробуйте позже или сообщите владельцу сайта.';
  }finally{button.disabled=false}
};
document.getElementById('logoutBtn').onclick=async()=>{
  const {error}=await db.auth.signOut();
  if(error){report('Не удалось выйти. Проверьте соединение.');return}
  currentEmail='';canEdit=false;state.editing=false;render();report('Вы вышли. Можно смотреть и предлагать идеи.');
};
document.getElementById('importLegacy').onclick=async()=>{
  if(!canEdit||busy)return;
  const candidates=legacyCandidates();
  if(!confirm('Добавить в общую версию '+candidates.length+' сохранённых идей? Существующие идеи не изменятся.'))return;
  state.ideas.push(...candidates.map(i=>({id:crypto.randomUUID(),title:i.title.slice(0,1000),description:String(i.description||'').slice(0,5000),topic:categoryId(i.topic),status:'idea'})));
  await save();
};

const CATEGORIES = [
  {id:'ai',title:'Искусственный интеллект',text:'Раян исследует искусственный интеллект: создаёт игры, сайты, мультфильмы и проводит эксперименты.'},
  {id:'biz',title:'Бизнес по-детски',text:'Деньги и бизнес через реальные ситуации: прибыль, зарплата, магазин и первый заработок.'},
  {id:'sis',title:'Комиксы с Дией',text:'Короткие семейные сценки: Раян пытается всё организовать, Дия вносит хаос.'},
  {id:'science',title:'Наука',text:'Математика, логика, физика, память, шахматы, программирование и техника. Задача → эксперимент → результат.'},
  {id:'humor',title:'Юмор',text:'Мини-сценки: ребёнок и папа, учитель, директор или ИИ.'},
  {id:'jobs',title:'Профессии',text:'Раян пробует профессии: строитель, повар, программист, архитектор, инженер, предприниматель и механик.'}
];
let state={ideas:[],texts:{},editing:false,filter:'all'};
const categoryId = id => CATEGORIES.some(c=>c.id===id) ? id : 'all';
if (state.filter !== 'all') state.filter = categoryId(state.filter);

function render(){
  renderAccess();
  document.querySelectorAll('[data-key]').forEach(el=>{const k=el.dataset.key;if(document.activeElement!==el)el.textContent=state.texts[k]??originalTexts[k];el.contentEditable=canEdit&&state.editing&&!busy?'true':'false'});
  document.getElementById('editBtn').textContent=state.editing?'✅ Готово':'✏️ Редактировать';
  renderFilters();renderIdeas();
}
function renderFilters(){
  const box=document.getElementById('filters');box.replaceChildren();
  [...CATEGORIES,{id:'all',title:'Все вместе'}].forEach(category=>{
    const button=document.createElement('button');button.type='button';
    button.className='chip'+(state.filter===category.id?' active':'');
    button.textContent=category.title;button.setAttribute('aria-pressed',String(state.filter===category.id));
    button.addEventListener('click',()=>{state.filter=category.id;render()});box.append(button);
  });
}
function renderIdeas(){
  const description=document.getElementById('categoryDescription');
  const selected=CATEGORIES.find(c=>c.id===state.filter);
  description.hidden=!selected;description.textContent=selected?selected.text:'';
  const box=document.getElementById('ideas');box.replaceChildren();
  const mainRows=state.ideas.filter(i=>state.filter==='all'||categoryId(i.topic)===state.filter);
  const rows=[...mainRows,...suggestions.filter(i=>state.filter==='all'||categoryId(i.topic)===state.filter)];
  rows.forEach((idea,index)=>{
    const row=document.createElement('article');row.className='bank-idea'+(idea.suggested?' suggested-idea':'');
    const title=document.createElement('div');title.className='idea-title';title.textContent=idea.title;
    const category=document.createElement('div');category.className='idea-meta';category.textContent=CATEGORIES.find(c=>c.id===categoryId(idea.topic))?.title || 'Все вместе';
    const copy=document.createElement('div');copy.className='idea-copy';copy.append(title,category);
    if(idea.suggested){const badge=document.createElement('span');badge.className='suggestion-badge';badge.textContent='Предложение гостя';copy.append(badge)}
    if(idea.description){const details=document.createElement('p');details.className='idea-description';details.textContent=idea.description;copy.append(details)}
    const controls=document.createElement('div');controls.className='idea-order';controls.hidden=!canEdit;
    (idea.suggested?[]:[-1,1]).forEach(direction=>{const button=document.createElement('button');button.type='button';button.className='ghost';button.textContent=direction===-1?'↑':'↓';button.setAttribute('aria-label',(direction===-1?'Выше: ':'Ниже: ')+idea.title);button.disabled=busy||(direction===-1?index===0:index===mainRows.length-1);button.onclick=async()=>{if(!canEdit||busy)return;const neighbor=mainRows[index+direction];if(!neighbor)return;const from=state.ideas.indexOf(idea),to=state.ideas.indexOf(neighbor);[state.ideas[from],state.ideas[to]]=[state.ideas[to],state.ideas[from]];await save();const moved=[...box.children].find(el=>el.dataset.ideaId===String(idea.id));const buttons=moved?.querySelectorAll('button');const focus=buttons?.[direction===-1?0:1];(focus?.disabled?buttons[direction===-1?1:0]:focus)?.focus()};controls.append(button)});
    const remove=document.createElement('button');remove.type='button';remove.className='ghost idea-delete';remove.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';remove.title='Удалить идею';remove.setAttribute('aria-label','Удалить: '+idea.title);remove.disabled=busy;remove.onclick=async()=>{if(!canEdit||busy)return;if(!confirm('Удалить идею «'+idea.title+'»?'))return;if(idea.suggested){await changeSuggestion(idea.id,{status:'deleted'});return}state.ideas=state.ideas.filter(item=>item!==idea);await save()};controls.append(remove);
    const edit=document.createElement('button');edit.type='button';edit.className='ghost idea-edit';edit.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5L8 21H3v-5ZM14 5l5 5"/></svg>';edit.title='Редактировать идею';edit.setAttribute('aria-label','Редактировать: '+idea.title);edit.disabled=busy;edit.onclick=()=>openIdeaEditor(idea);controls.append(edit);
    if(idea.suggested){const accept=document.createElement('button');accept.type='button';accept.className='ghost';accept.textContent='✓';accept.title='Принять идею';accept.setAttribute('aria-label','Принять: '+idea.title);accept.disabled=busy;accept.onclick=()=>acceptSuggestion(idea.id);controls.append(accept)}
    row.dataset.ideaId=String(idea.id);row.append(copy,controls);box.append(row);
  });
  if(!rows.length){const empty=document.createElement('p');empty.className='empty-ideas';empty.textContent=!loaded?'Загрузка идей…':'В этой категории пока нет идей.';box.append(empty)}
}
document.getElementById('editBtn').onclick=async function(){if(!canEdit||busy)return;state.editing=!state.editing;if(!state.editing){document.querySelectorAll('[data-key]').forEach(el=>state.texts[el.dataset.key]=el.textContent.trim());await save()}else render()};
document.querySelectorAll('[data-key]').forEach(el=>el.addEventListener('input',()=>{if(state.editing){state.texts[el.dataset.key]=el.textContent;/* Saved on Done, with a server version check. */}}));
const ideaDialog=document.getElementById('ideaDialog'),ideaForm=document.getElementById('ideaForm'),ideaInput=document.getElementById('ideaInput'),ideaCategory=document.getElementById('ideaCategory');
CATEGORIES.forEach(c=>{const option=document.createElement('option');option.value=c.id;option.textContent=c.title;ideaCategory.append(option)});
let editingIdea=null;
function openIdeaEditor(idea=null){if(busy||(idea&&!canEdit))return;submissionId=crypto.randomUUID();document.getElementById('ideaStatus').textContent='';document.getElementById('ideaGuestNote').hidden=canEdit;editingIdea=idea;ideaForm.reset();ideaInput.setCustomValidity('');document.getElementById('ideaTitle').textContent=idea?'Редактировать идею':'Добавить идею';ideaForm.querySelector('[type=submit]').textContent=idea?'Сохранить':'Добавить';ideaCategory.querySelector('[value="all"]')?.remove();if(idea&&categoryId(idea.topic)==='all'){const option=document.createElement('option');option.value='all';option.textContent='Все вместе';ideaCategory.append(option)}ideaCategory.value=idea?categoryId(idea.topic):(state.filter==='all'?'ai':state.filter);ideaInput.value=idea?.title||'';document.getElementById('ideaDescription').value=idea?.description||'';ideaDialog.showModal();ideaInput.focus()}
document.getElementById('addIdea').onclick=()=>openIdeaEditor();
document.getElementById('closeIdea').onclick=()=>ideaDialog.close();
ideaDialog.addEventListener('close',()=>document.getElementById('addIdea').focus());
ideaInput.addEventListener('input',()=>ideaInput.setCustomValidity(''));
ideaForm.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||(editingIdea&&!canEdit))return;const title=ideaInput.value.trim();ideaInput.setCustomValidity(title?'':'Напишите идею.');if(!ideaForm.reportValidity())return;
  const description=document.getElementById('ideaDescription').value.trim();
  if(!canEdit){await submitSuggestion(title,description,ideaCategory.value);return}
  if(editingIdea?.suggested){if(await changeSuggestion(editingIdea.id,{title,description,topic:ideaCategory.value}))ideaDialog.close();return}
  if(editingIdea){
    const target=state.ideas.find(i=>String(i.id)===String(editingIdea.id));
    if(!target){alert('Эта идея уже удалена другим редактором. Текст остался в форме. Нажмите «Добавить», чтобы сохранить его новой идеей.');editingIdea=null;document.getElementById('ideaTitle').textContent='Добавить идею';ideaForm.querySelector('[type=submit]').textContent='Добавить';return}
    target.title=title;target.description=description;if(categoryId(target.topic)!==ideaCategory.value)target.topic=ideaCategory.value;
  }else{state.ideas.unshift({id:crypto.randomUUID(),title,description,topic:ideaCategory.value,status:'idea'})}
  if(state.filter!=='all')state.filter=ideaCategory.value;
  if(await save())ideaDialog.close();
});
const tabNames = ['games','comics','videos','content'];
const tabs = tabNames.map(name=>document.getElementById(name+'-tab'));
function selectTab(name, updateAddress = true){
  if(name==='existing')name='comics';
  if(!tabNames.includes(name)) name='roadmap';
  document.getElementById('roadmap-panel').hidden=name!=='roadmap';
  const awayFromRoadmap = name !== 'roadmap';
  document.querySelector('.toolbar').hidden = awayFromRoadmap;
  if(awayFromRoadmap && state.editing){state.editing=false;void save()}
  tabs.forEach(function(tab,index){const selected = tabNames[index] === name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected});
  if(updateAddress) history.replaceState(null,'','#'+name);
}
tabs.forEach(function(tab,index){
  tab.addEventListener('click',function(){selectTab(tabNames[index])});
  tab.addEventListener('keydown',function(event){if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectTab(tabNames[next]);tabs[next].focus()});
});
window.addEventListener('hashchange',function(){selectTab(location.hash.slice(1),false)});
selectTab(location.hash.slice(1),false);

render();
void startCloud();
window.addEventListener('focus',()=>{if(loaded&&!busy&&!state.editing&&!ideaDialog.open)void loadCloud().catch(()=>report('Не удалось обновить идеи. Показана последняя загруженная версия.'))});
