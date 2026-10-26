export function taskFor(mode,completed=0,random=Math.random){
 const int=(lo,hi)=>lo+Math.floor(random()*(hi-lo+1));
 const max=completed<3?5:10;
 if(mode==='add'){const a=int(1,max-1),b=int(1,max-a);return {mode,a,b,answer:a+b};}
 if(mode==='sub'){const a=int(1,max),b=int(1,a);return {mode,a,b,answer:a-b};}
 return {mode,answer:int(1,max)};
}
export function optionsFor(answer,random=Math.random){const values=new Set([answer]);while(values.size<3)values.add(Math.floor(random()*11));return [...values].sort((a,b)=>a-b);}
export function normalize(raw={}){return {cheeses:Number.isSafeInteger(raw.cheeses)&&raw.cheeses>=0?Math.min(raw.cheeses,9999):0,earned:Number.isSafeInteger(raw.earned)&&raw.earned>=0?raw.earned:0,outfit:['dress','casual','pajamas'].includes(raw.outfit)?raw.outfit:'dress',hair:['long','tail','braids'].includes(raw.hair)?raw.hair:'long',color:['#cba5e3','#ef9db7','#88c8b6','#efc975'].includes(raw.color)?raw.color:'#cba5e3',progress:Object.fromEntries(['digit','count','add','sub','art','salon'].map(k=>[k,Number.isSafeInteger(raw.progress?.[k])&&raw.progress[k]>=0?raw.progress[k]:0]))};}
