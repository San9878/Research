document.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id),root=$('experimentos');
 document.querySelectorAll('main table').forEach(table=>{
  if(table.closest('.table-responsive'))return;
  const wrap=document.createElement('div');wrap.className='table-responsive';wrap.tabIndex=0;
  wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Tabla con desplazamiento horizontal');
  table.before(wrap);wrap.append(table);
 });
 const cards=[...(root?.querySelectorAll('[data-experiment]')||[])];
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const entries=cards.map(card=>({card,text:normalize(card.textContent)}));
 function filter(){
  const query=normalize($('experiment-search')?.value||''),model=$('experiment-model')?.value||'',dataset=$('experiment-dataset')?.value||'';
  let count=0;
  for(const {card,text} of entries){card.hidden=!!((query&&!(text+' '+normalize(card.textContent)).includes(query))||(model&&card.dataset.model!==model)||(dataset&&card.dataset.scope!==dataset&&!(dataset!=='Global'&&(card.dataset.datasets||'').split(/[ ,;·]+/).includes(dataset))));if(!card.hidden)count++;}
  for(const group of root?.querySelectorAll('.experiment-group,.experiment-model')||[]){
   const visible=[...group.querySelectorAll('[data-experiment]')].some(card=>!card.hidden);
   group.hidden=!visible;if(visible&&(query||model||dataset))group.open=true;
  }
  if($('experiment-count'))$('experiment-count').textContent=count+' de '+cards.length+' experimentos realizados';
  if($('experiment-empty'))$('experiment-empty').hidden=count>0;
 }
 function reset(){for(const id of ['experiment-search','experiment-model','experiment-dataset'])if($(id))$(id).value='';filter();}
 $('experiment-search')?.addEventListener('input',filter);
 for(const id of ['experiment-model','experiment-dataset'])$(id)?.addEventListener('change',filter);
 $('experiment-reset')?.addEventListener('click',reset);
 $('experiment-collapse')?.addEventListener('click',()=>cards.forEach(card=>card.open=false));
 function reveal(hash){
  let id;try{id=decodeURIComponent(hash.replace(/^#/,''));}catch{return;}
  let target=$(id);if(!target)return;
  if(target.dataset.aliasTarget)target=$(target.dataset.aliasTarget)||target;
  if(target.closest('#experimentos'))reset();
  for(let node=target;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
  requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant',block:'start'}));
 }
 document.addEventListener('click',event=>{const a=event.target.closest('a[href^="#"]');if(a)reveal(a.hash);});
 window.addEventListener('hashchange',()=>reveal(location.hash));filter();
 if(location.hash){reveal(location.hash);let interacted=false;
  for(const name of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(name,()=>interacted=true,{once:true,passive:true});
  const initial=location.hash,settle=()=>{if(!interacted&&location.hash===initial)reveal(initial);};
  window.addEventListener('load',settle,{once:true});document.fonts?.ready.then(settle);setTimeout(settle,1200);
 }
 window.BookResearch={filter,reveal,count:()=>cards.length};
});
