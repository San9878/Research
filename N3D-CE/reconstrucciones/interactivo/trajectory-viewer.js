/* Saved camera centers only: this view never loads point-cloud packages or runs a model. */
(()=>{
 'use strict';
 const root=document.getElementById('trajectories-panel');if(!root)return;
 const records=TRAJECTORY_REGISTRY.trajectories,map=new Map(records.map(r=>[r.id,r])),colors=['#2776c7','#d66a24','#a34db2','#168b88'];
 const t=s=>window.BookI18n?.text(s)||s,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let selected=['vggt-c3vd-r1-final-trans4','c3vd-v9','c3vd-vn19-a'],pose={yaw:.45,pitch:-.25,zoom:1,x:0,y:0},scheduled=false;
 const charts=new Map(),$=id=>document.getElementById(id);
 function eligible(){const model=$('trajectory-model').value,dataset=$('trajectory-dataset').value;return records.filter(r=>(!model||r.model_family===model)&&(!dataset||r.case.startsWith(dataset)))}
 function sameCase(rows){if(!rows.length||!rows.every(r=>r.family===rows[0].family&&JSON.stringify(r.frames)===JSON.stringify(rows[0].frames)))return false;const gt=rows.filter(r=>r.GT_positions_cm);return gt.length<2||gt.slice(1).every(r=>r.GT_positions_cm.every((p,i)=>Math.hypot(...p.map((x,k)=>x-gt[0].GT_positions_cm[i][k]))<1e-4))}
 function errors(r){return $('trajectory-align').value==='sim3'?r.errors_cm:r.raw_errors_cm}
 function points(r){return $('trajectory-align').value==='sim3'&&r.aligned_positions_cm?r.aligned_positions_cm:r.positions_cm}
 function statistic(r){if(!r)return null;const e=errors(r);if(!e)return null;const threshold=+$('trajectory-threshold').value,sorted=e.slice().sort((a,b)=>a-b),pct=100*e.filter(x=>x<=threshold).length/e.length,k=.95*(sorted.length-1),lo=Math.floor(k),hi=Math.ceil(k);return {pct,rmse:Math.sqrt(e.reduce((s,x)=>s+x*x,0)/e.length),p95:sorted[lo]+(sorted[hi]-sorted[lo])*(k-lo)}}
 function options(id){return '<option value="">Seleccionar recorrido…</option>'+eligible().map(r=>'<option value="'+esc(r.id)+'"'+(r.id===id?' selected':'')+'>'+esc(r.label+' · '+r.case)+'</option>').join('')}
 function render(){
  const n=+$('trajectory-count').value,pool=eligible(),allowed=new Set(pool.map(r=>r.id));selected=selected.slice(0,n).map((id,i)=>allowed.has(id)?id:pool[i]?.id||'');while(selected.length<n)selected.push(pool[selected.length]?.id||'');
  $('trajectory-selectors').innerHTML=selected.map((id,i)=>'<label class="trajectory-selector">Recorrido '+(i+1)+'<select data-trajectory-select="'+i+'">'+options(id)+'</select></label>').join('');
  $('trajectory-selectors').querySelectorAll('select').forEach((s,i)=>s.onchange=()=>{selected[i]=s.value;render()});
  const rows=selected.map(id=>map.get(id)).filter(Boolean),paired=sameCase(rows);
  const gtCount=rows.filter(r=>r.GT_temporal_certified).length;$('trajectory-align').options[0].disabled=gtCount===0;if(!gtCount)$('trajectory-align').value='native';
  if($('trajectory-layout').value==='overlay'&&!paired)$('trajectory-layout').value='panels';
  $('trajectory-notice').textContent=(paired?'Mismo caso y mismos frames seleccionados. ':'Casos distintos: comparación visual por panel; sin promedio común. ')+(!gtCount?'Sin GT temporal: no se aplica Sim(3) a las trayectorias y no se calcula acierto. ':$('trajectory-align').value==='sim3'?(gtCount===rows.length?'Centros alineados con un Sim(3) global por recorrido, ajustado sobre todas las vistas. ':'Sim(3) solo en los recorridos con GT; los demás conservan su escala de exportación. '):'Sin ajuste global adicional; se conserva la escala GT de la exportación. ');
  $('trajectory-results').innerHTML=rows.map((r,i)=>{const s=statistic(r);return '<article class="trajectory-stat"><h3><span style="color:'+colors[i]+'">●</span> '+esc(r.label)+'</h3><p>'+esc(r.case)+'</p>'+(s?'<strong>'+s.pct.toFixed(1)+' %</strong><span>Centros dentro del umbral</span><p>RMSE '+s.rmse.toFixed(4)+' cm · p95 '+s.p95.toFixed(4)+' cm</p>':'<strong>N/D</strong><span>Sin GT temporal certificado</span>')+'</article>'}).join('');
  const maximum=Math.max(1,...rows.map(r=>r.frames.length));$('trajectory-prefix').max=String(maximum);if(+$('trajectory-prefix').value>maximum||!$('trajectory-prefix').dataset.used)$('trajectory-prefix').value=String(maximum);
  $('trajectory-canvas').innerHTML=($('trajectory-layout').value==='overlay'?['overlay']:rows.map(r=>r.id)).map(id=>'<canvas data-trajectory-canvas="'+esc(id)+'" tabindex="0" aria-label="Trayectoria interactiva"></canvas>').join('');
  charts.clear();for(const c of $('trajectory-canvas').querySelectorAll('canvas')){charts.set(c,{candidates:[]});bind(c)}
  requestDraw();window.BookCompareUI?.refresh();
 }
 function choose(ids,scope=''){
  const good=ids.filter(id=>map.has(id)).slice(0,4);if(!good.length)return;
  $('trajectory-model').value=scope;$('trajectory-dataset').value='';selected=good;$('trajectory-count').value=String(good.length);$('trajectory-prefix').dataset.used='';render();activateTab('trajectories');
 }
 function requestDraw(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw()})}
 function draw(){
  if(root.hidden)return;
  const rows=selected.map(id=>map.get(id)).filter(Boolean),all=rows.flatMap(r=>[...points(r),...(r.GT_positions_cm||[])]);if(!all.length)return;
  const lo=[0,1,2].map(k=>Math.min(...all.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...all.map(p=>p[k]))),center=lo.map((x,k)=>(x+hi[k])/2),extent=Math.max(...hi.map((x,k)=>x-lo[k]),1e-6),count=+$('trajectory-prefix').value;
  $('trajectory-progress').textContent='Vistas mostradas: '+count+' / '+$('trajectory-prefix').max+' · predicción en color · GT verde';
  for(const [canvas,state] of charts){
   const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)continue;
   const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);
   const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.fillStyle='#f7faf8';ctx.fillRect(0,0,rect.width,rect.height);
   const cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch),factor=.77*Math.min(rect.width,rect.height)*pose.zoom/extent;
   const project=p=>{const x=p[0]-center[0],y=p[1]-center[1],z=p[2]-center[2],u=cy*x+sy*z,v=-sy*x+cy*z;return [rect.width/2+factor*u+pose.x,rect.height/2+factor*(cp*y-sp*v)+pose.y]};
   state.candidates=[];
   const rr=canvas.dataset.trajectoryCanvas==='overlay'?rows:rows.filter(r=>r.id===canvas.dataset.trajectoryCanvas);
   const drawnGT=new Set();
   for(const r of rr){
    const color=colors[rows.indexOf(r)],paths=[];
    if(r.GT_positions_cm&&!drawnGT.has(r.family)){paths.push([r.GT_positions_cm,'#269652',true]);drawnGT.add(r.family)}
    paths.push([points(r),color,false]);
    for(const [path,color,isGT] of paths){const p=path.slice(0,count).map(project);if(!p.length)continue;ctx.strokeStyle=color;ctx.lineWidth=isGT?3:2;ctx.setLineDash(isGT?[5,4]:[]);ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);
     p.forEach(([x,y],i)=>{ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,i===p.length-1?5:2.3,0,2*Math.PI);ctx.fill();if(!isGT)state.candidates.push({x,y,row:r,index:i})});
    }
   }
   ctx.fillStyle='#496b5c';ctx.font='12px system-ui';ctx.fillText(t('Centros de cámara · cm'),12,22);
  }
 }
 function bind(c){
  let drag=null;
  c.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2};c.setPointerCapture(e.pointerId)});
  c.addEventListener('pointerup',()=>{drag=null});c.addEventListener('pointercancel',()=>{drag=null});c.addEventListener('contextmenu',e=>e.preventDefault());
  c.addEventListener('pointermove',e=>{
   if(drag){let dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;if(drag.pan){pose.x+=dx;pose.y+=dy}else{pose.yaw+=dx*.008;pose.pitch+=dy*.008}requestDraw();return}
   const box=c.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top,near=charts.get(c).candidates.find(p=>Math.hypot(p.x-x,p.y-y)<9);
   if(near){const r=near.row,k=near.index,error=errors(r)?.[k],message=r.label+' · frame '+r.frames[k]+' · '+(error===undefined?t('Sin GT temporal certificado'):t('Error del centro')+': '+(error*10).toFixed(2)+' mm');window.BookCompareUI?.tip(message,e.clientX,e.clientY)}else window.BookCompareUI?.hideTip();
  });
  c.addEventListener('pointerleave',()=>window.BookCompareUI?.hideTip());
  c.addEventListener('wheel',e=>{e.preventDefault();pose.zoom=Math.min(15,Math.max(.15,pose.zoom*Math.exp(-e.deltaY*.001)));requestDraw()},{passive:false});
  c.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')pose.yaw-=.1;else if(e.key==='ArrowRight')pose.yaw+=.1;else if(e.key==='ArrowUp')pose.pitch-=.1;else if(e.key==='ArrowDown')pose.pitch+=.1;else return;e.preventDefault();requestDraw()});
 }
 for(const id of ['trajectory-count','trajectory-layout','trajectory-align','trajectory-threshold','trajectory-model','trajectory-dataset'])$(id).addEventListener('change',render);
 $('trajectory-prefix').addEventListener('input',()=>{$('trajectory-prefix').dataset.used='1';requestDraw()});
 $('trajectory-reset').onclick=()=>{pose={yaw:.45,pitch:-.25,zoom:1,x:0,y:0};requestDraw()};
 $('trajectory-from-clouds').onclick=()=>choose(window.BookViewer.snapshot().slots.map(s=>s.id));
 new ResizeObserver(requestDraw).observe(root);window.addEventListener('book-language-change',requestDraw);
 window.addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='bitacora-open-trajectories'&&Array.isArray(e.data.ids))choose(e.data.ids,e.data.scope||'')});
 window.BookTrajectories={choose,refresh:render,draw:requestDraw,records,snapshot:()=>({selected:selected.slice(),statistics:selected.map(id=>({id,...statistic(map.get(id))})),alignment:$('trajectory-align').value,threshold_cm:+$('trajectory-threshold').value,canvas_count:charts.size})};
 const p=new URLSearchParams(location.search),requested=(p.get('models')||'').split(',').filter(id=>map.has(id)).slice(0,4);if(p.get('scope'))$('trajectory-model').value=p.get('scope');if(requested.length){selected=requested;$('trajectory-count').value=String(requested.length)}if(p.get('tab')==='trajectories')choose(requested,p.get('scope')||'');else render();
})();
