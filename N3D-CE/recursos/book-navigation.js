document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  document.querySelectorAll('main table').forEach(table => {
    if (table.closest('.table-responsive')) return;
    const wrap = document.createElement('div');wrap.className='table-responsive';
    wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Tabla: desplazamiento horizontal');
    table.before(wrap);wrap.append(table);
  });
  const cards=[...document.querySelectorAll('[data-research-card]')], search=$('experiment-search');
  const controls=['experiment-problem','experiment-dataset','experiment-status','experiment-result','experiment-order'];
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const entries=cards.map(card=>({card,text:normalize(card.textContent)}));
  function filter(){
    if(!search)return;
    const q=normalize(search.value),topic=$('experiment-problem').value,dataset=$('experiment-dataset').value,status=$('experiment-status').value,result=$('experiment-result').value;
    let n=0;
    for(const {card,text} of entries){
      card.hidden=!!((q&&!text.includes(q))||(topic&&!card.dataset.problems.split('|').includes(topic))||(dataset&&!card.dataset.datasets.split('|').includes(dataset))||(status&&card.dataset.status!==status)||(result==='negative'&&card.dataset.negative!=='true'));
      if(!card.hidden)n++;
    }
    $('experiment-count').textContent=n+' de '+cards.length+' fichas';
    $('experiment-empty').hidden=n>0;
    const order=$('experiment-order').value,host=$('all-experiment-cards');
    [...cards].sort((a,b)=>order==='problem'?a.dataset.primary.localeCompare(b.dataset.primary,'es')||Number(a.dataset.order)-Number(b.dataset.order):Number(a.dataset.order)-Number(b.dataset.order)).forEach(c=>host.append(c));
  }
  search?.addEventListener('input',filter);controls.forEach(id=>$(id)?.addEventListener('change',filter));
  $('experiment-reset')?.addEventListener('click',()=>{search.value='';for(const id of controls)$(id).value=id==='experiment-order'?'series':'';filter();});
  document.querySelectorAll('[data-filter-problem]').forEach(button=>button.addEventListener('click',()=>{
    $('experiment-problem').value=button.dataset.filterProblem;filter();$('experiment-controls').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  $('experiment-collapse')?.addEventListener('click',()=>cards.forEach(c=>c.open=false));
  function reveal(hash){
    let id;try{id=decodeURIComponent(hash.replace(/^#/,''));}catch{return;}
    const aliases={'scared-experimentos':'experimentos','scared-seguimiento-b':'experimentos','scared-protocolos-preparados':'scared-e13'};
    const target=$(aliases[id]||id);if(!target)return;
    const card=target.matches('[data-research-card]')?target:target.closest('[data-research-card]');
    if(card){search.value='';for(const c of controls)if(c!=='experiment-order')$(c).value='';filter();card.open=true;}
    for(let parent=target;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
    requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant',block:'start'}));
  }
  document.addEventListener('click',e=>{const link=e.target.closest('a[href^="#"]');if(link)reveal(link.hash);});
  window.addEventListener('hashchange',()=>reveal(location.hash));filter();if(location.hash)reveal(location.hash);
  window.BookResearch={filter,reveal,count:()=>cards.length};
});
