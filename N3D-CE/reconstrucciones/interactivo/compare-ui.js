/* Presentation only: identifiers, numerical values and comparison guards remain untouched. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),t=s=>window.BookI18n?.text(s)||s,clouds=new Map(CLOUD_REGISTRY.clouds.map(r=>[r.id,r])),metrics=new Map(METRIC_REGISTRY.entries.map(r=>[r.id,r]));
 let popup=null,observer,scheduled=false,tipBox;
 const definitions={AbsRel:'Error relativo medio de profundidad; menor es mejor.','δ1':'Porcentaje de píxeles con razón de profundidad menor que 1,25; mayor es mejor.',XYZ:'Distancia 3D al GT; comprueba qué ruta geométrica se está evaluando.',p95:'Percentil 95 del error: describe la cola, no el promedio.',CD:'Distancia entre superficies. Comprueba escala y si se utilizó ICP.',NC:'Consistencia de normales de superficie; mayor es mejor.',ATE:'Error global de centros de cámara tras el alineamiento declarado.',RPEr:'Error de rotación del movimiento relativo entre vistas.',RPEt:'Error de traslación del movimiento relativo entre vistas.'};
 function current(r){if(clouds.has(r.id))return true;return /^(c3vd-(zero|v9|vn19-[ab])$|scared[89]-(zero-new|vn18|scared-v9)$|vggt-c3vd-r1-|vggt-scared-review-context-(validation|reserved)-N50-|c3vd-paired-r1-v9-)/.test(r.id)}
 function description(id){
  const scoreDescription=window.BookCloudRankings?.description(id);if(scoreDescription)return scoreDescription;
  const r=clouds.get(id)||metrics.get(id)||(window.TRAJECTORY_REGISTRY?.trajectories||[]).find(r=>r.id===id);if(!r)return '';
  const profile=/vggt-scared.*best|VGGT_SCARED_BEST/.test(id)?'VGGT-SCARED: solo profundidad; BEST500 seleccionado por validación.':/vggt-c3vd-r1|paired-R1/.test(id)?'VGGT-C3VD R1: cámara y profundidad; FINAL3000 de referencia, BEST800 diagnóstico.':/vn19-a/.test(id)?'VN19-A: C3VD, selección aleatoria de vistas supervisadas.':/vn19-b/.test(id)?'VN19-B: C3VD, cobertura controlada y repetición de vistas profundas.':/scared-v9/.test(id)?'V9-SCARED: adaptación de profundidad y puntos; cámara congelada.':/scared.*vn18|ttt-scared/.test(id)?'VN18-SCARED: profundidad y puntos; cámara congelada.':/c3vd-v9|scared[89]-v9|paired-V9/.test(id)?'V9-C3VD: referencia conservada, checkpoint 850.':/zero|VGGT_ZS|-zs-/.test(id)?'Pesos oficiales, sin fine-tuning local.':'';
  if(profile&&clouds.has(id))return profile+' '+r.case+' '+(r.gt_trajectory?'Trayectoria GT disponible.':'Sin GT temporal certificado.');
  if(r.context)return r.context;
  return [r.case,r.scale_note,r.gt_trajectory?'Trayectoria GT disponible.':'Sin GT temporal certificado.',r.accepted===false?'Candidato diagnóstico: no pasó todas las guardas.':''].filter(Boolean).join(' ');
 }
 function tip(message,x,y){if(!tipBox){tipBox=document.createElement('div');tipBox.id='compare-tooltip';tipBox.className='compare-tooltip';tipBox.setAttribute('role','tooltip');document.body.append(tipBox)}tipBox.textContent=t(message);tipBox.hidden=false;tipBox.style.left=Math.max(8,Math.min(x+14,innerWidth-330))+'px';tipBox.style.top=Math.max(8,Math.min(y+16,innerHeight-tipBox.offsetHeight-12))+'px';}
 function hideTip(){if(tipBox)tipBox.hidden=true}
 function close(){if(popup){popup.remove();popup=null}document.querySelectorAll('.choice-trigger[aria-expanded="true"]').forEach(b=>b.setAttribute('aria-expanded','false'));hideTip()}
 function enhanceSelect(select){
  if(select.closest('.pretty-choice'))return;
  const wrapper=document.createElement('span');wrapper.className='pretty-choice';select.before(wrapper);wrapper.append(select);select.classList.add('choice-native');
  const button=document.createElement('button');button.type='button';button.className='choice-trigger';button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');wrapper.append(button);
  const refreshButton=()=>{const option=select.selectedOptions[0];button.textContent=option?.textContent||t('Seleccionar…');button.dataset.tip=description(select.value)||option?.textContent||'';button.disabled=select.disabled;};
  select.addEventListener('change',refreshButton);wrapper.refreshButton=refreshButton;
  button.onclick=()=>{
   close();popup=document.createElement('div');popup.className='choice-popover';popup.innerHTML='<input type="search" placeholder="'+t('Buscar versión o inferencia…')+'" aria-label="'+t('Buscar versión o inferencia…')+'"><div role="listbox" class="choice-options"></div>';document.body.append(popup);
   const box=button.getBoundingClientRect(),width=Math.min(650,innerWidth-24);popup.style.width=width+'px';popup.style.left=Math.max(12,Math.min(box.left,innerWidth-width-12))+'px';popup.style.top=Math.max(12,Math.min(box.bottom+6,innerHeight-430))+'px';button.setAttribute('aria-expanded','true');
   const input=popup.querySelector('input'),list=popup.querySelector('.choice-options');
   function render(){list.replaceChildren();const q=input.value.toLowerCase();
    for(const option of select.options){if(!option.value||q&&!(option.textContent+' '+description(option.value)+' '+t(description(option.value))).toLowerCase().includes(q))continue;
     const row=document.createElement('button');row.type='button';row.setAttribute('role','option');row.setAttribute('aria-selected',option.selected?'true':'false');row.dataset.value=option.value;const label=document.createElement('strong');label.textContent=option.textContent;const help=document.createElement('small');help.textContent=t(description(option.value)||option.parentElement?.label||'');row.append(label,help);
     row.onpointerenter=e=>tip(description(option.value),e.clientX,e.clientY);row.onpointerleave=hideTip;row.onfocus=()=>{const r=row.getBoundingClientRect();tip(description(option.value),r.right,r.top)};
     row.onclick=()=>{select.value=option.value;close();button.setAttribute('aria-expanded','false');select.dispatchEvent(new Event('change',{bubbles:true}));refreshButton();button.focus()};list.append(row);
    }
    if(!list.children.length)list.textContent=t('Sin resultados para este filtro.');
   }
   input.oninput=render;input.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();list.querySelector('button')?.focus()}if(e.key==='Escape'){close();button.focus()}};
   list.onkeydown=e=>{const options=[...list.querySelectorAll('button')],index=options.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();options[(index+(e.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus()}if(e.key==='Escape'){close();button.focus()}};
   render();input.focus();
  };
  refreshButton();
 }
 function refresh(){
  observer?.disconnect();
  document.querySelectorAll('#metric-selectors select,#slots select,#trajectory-selectors select,#cloud-case,#cloud-protocol').forEach(enhanceSelect);
  document.querySelectorAll('.pretty-choice').forEach(w=>w.refreshButton?.());
  const joined=$('joined-metrics')?.querySelector('tbody tr');
  document.querySelectorAll('.metric-card:not([data-tidied])').forEach(card=>{
   card.dataset.tidied='1';const paragraphs=[...card.querySelectorAll('.metric-context')];
   if(paragraphs.length){const detail=document.createElement('details'),sum=document.createElement('summary');detail.className='metric-protocol';sum.textContent=t('Protocolo y contexto');detail.append(sum,...paragraphs);card.append(detail)}
   const tab=card.querySelector('.table-wrap');if(joined&&tab){const detail=document.createElement('details'),sum=document.createElement('summary');sum.textContent=t('Métricas individuales');detail.append(sum,tab);card.append(detail)}
  });
  document.querySelectorAll('th').forEach(th=>{const k=Object.keys(definitions).find(k=>th.textContent.includes(k));if(k)th.dataset.tip=definitions[k]});
  document.querySelectorAll('button,input,select').forEach(el=>{
   if(el.dataset.tip||el.closest('.pretty-choice,.choice-popover'))return;
   const byId={'load-all':'Carga el 100 % de los puntos guardados de la selección.','release-all':'Libera los paquetes y buffers gráficos; no elimina archivos.','sync':'Usa la misma orientación de cámara del visor en todos los paneles.','fit-mode':'El encuadre modifica la presentación; no mejora ni registra la geometría.','show-gt':'La línea GT solo aparece donde hay una referencia temporal validada.','point-size':'Cambia el tamaño dibujado de los puntos; no modifica su cantidad ni posición.','show-archive':'Añade diagnósticos, comparaciones históricas y tablas de los papers.','trajectory-align':'Sim(3) elimina diferencias globales de escala y colocación; no corrige la forma local.','trajectory-threshold':'Diagnóstico posicional añadido; no evalúa orientación ni constituye un umbral clínico.'};
   if(byId[el.id])el.dataset.tip=byId[el.id];
  });
  // Recover the one archived camera track without rewriting point data or cloud packages.
  if(window.BookViewer&&window.TRAJECTORY_REGISTRY)for(const r of TRAJECTORY_REGISTRY.trajectories){const c=BookViewer.registry.get(r.id);if(c&&!c.trajectory)c.trajectory=r.positions_cm.map(p=>p.map(x=>x/100))}
  document.querySelectorAll('.cloud-slot').forEach(slot=>{
   const id=slot.querySelector('select')?.value,row=window.TRAJECTORY_REGISTRY?.trajectories.find(r=>r.id===id);let badge=slot.querySelector('.trajectory-badge');
   if(!row){badge?.remove();return}if(!badge){badge=document.createElement('button');badge.type='button';badge.className='trajectory-badge';slot.querySelector('.slot-footer')?.append(badge)}
   badge.textContent=row.GT_temporal_certified?t('Tras Sim(3): centros @2 mm')+' · '+row.accuracy_at_2mm_pct.toFixed(1)+' %':t('Trayectoria sin GT temporal · acierto N/D');
   badge.dataset.tip='Diagnóstico posicional tras Sim(3), calculado en todas las vistas; no mide orientación ni valida la nube completa.';
   badge.onclick=()=>window.BookTrajectories?.choose([id]);
  });
  observer?.observe(document.getElementById('app'),{subtree:true,childList:true});
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})}
 document.addEventListener('pointerover',e=>{const el=e.target.closest('[data-tip]');if(el)tip(el.dataset.tip,e.clientX,e.clientY)});document.addEventListener('pointerout',e=>{if(e.target.closest('[data-tip]'))hideTip()});
 document.addEventListener('focusin',e=>{const el=e.target.closest('[data-tip]');if(el){const r=el.getBoundingClientRect();tip(el.dataset.tip,r.left,r.bottom)}});document.addEventListener('focusout',hideTip);
 document.addEventListener('pointerdown',e=>{if(popup&&!popup.contains(e.target)&&!e.target.closest('.choice-trigger'))close()});window.addEventListener('scroll',hideTip,true);
 function init(){
  observer=new MutationObserver(schedule);refresh();
  const requested=(new URLSearchParams(location.search).get('models')||'').split(',').map(id=>clouds.get(id)||metrics.get(id)||(window.TRAJECTORY_REGISTRY?.trajectories||[]).find(r=>r.id===id)).filter(Boolean),datasets=requested.map(r=>(r.dataset||r.case||'').startsWith('C3VD')?'C3VD':(r.dataset||r.case||'').startsWith('SCARED')?'SCARED':'');
  if(datasets.length&&datasets[0]&&datasets.every(d=>d===datasets[0])){for(const id of ['metric-dataset','cloud-dataset','trajectory-dataset'])if($(id))$(id).value=datasets[0];const active=document.querySelector('.tabs [aria-selected="true"]')?.id.replace('tab-','')||'clouds';window.BookMetrics?.choose(BookMetrics.selected());$('cloud-filter')?.dispatchEvent(new Event('input'));window.BookTrajectories?.refresh();activateTab(active)}
  $('show-archive')?.addEventListener('change',()=>{const active=document.querySelector('.tabs [aria-selected="true"]')?.id.replace('tab-','')||'clouds';window.BookMetrics?.choose(BookMetrics.selected());$('cloud-filter')?.dispatchEvent(new Event('input'));activateTab(active);schedule()});
  window.addEventListener('book-language-change',refresh);
 }
 window.BookCompareUI={currentOnly:()=>!$('show-archive')?.checked,isCurrent:current,description,tip,hideTip,refresh:schedule};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
