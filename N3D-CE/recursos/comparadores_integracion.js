document.addEventListener('DOMContentLoaded',()=>{
 const dialog=document.getElementById('book-comparison-dialog'),mount=document.getElementById('book-dialog-mount');if(!dialog)return;
 let active=null;
 function release(){if(!active)return;active.frame.contentWindow?.postMessage({type:'bitacora-release'},'*');active.frame.src='about:blank';active.frame.remove();active=null;}
 function send(){if(!active?.ready||active.sent===active.request)return;active.sent=active.request;active.frame.contentWindow.postMessage(active.request,'*');}
 function show(ids,tab,scope=''){
  release();const frame=document.createElement('iframe');frame.title='Nubes, trayectorias y métricas comparadas';frame.className='book-comparator-frame';frame.allow='fullscreen';
  const request={type:'bitacora-open-'+(tab==='metrics'?'metrics':tab==='trajectories'?'trajectories':'clouds'),ids,scope,load:tab==='clouds'};
  active={frame,request,ready:false};
  const query='?v=20261125-usability2&embed=1&tab='+tab+'&models='+encodeURIComponent(ids.join(','))+'&scope='+encodeURIComponent(scope)+'&lang='+(window.BookI18n?.language()||'es');
  frame.src='reconstrucciones/interactivo/comparador.html'+query;
  frame.addEventListener('load',()=>{if(active?.frame===frame){active.ready=true;send();}});mount.append(frame);
  document.getElementById('book-dialog-title').textContent=tab==='metrics'?'Métricas · selección dinámica':'Nubes y trayectorias · selección dinámica';
  document.getElementById('book-dialog-external').href=frame.src.replace('&embed=1','');
  if(!dialog.open)dialog.showModal();
 }
 function scopeOf(button){return button.dataset.scope||(button.closest('.model-workspace')?.id==='vggt'?'VGGT':button.closest('.model-workspace')?.id==='vgg-t3'?'VGG-T³':'');}
 document.querySelectorAll('.book-open-clouds').forEach(b=>b.addEventListener('click',()=>show(b.dataset.clouds.split(','),'clouds',scopeOf(b))));
 document.querySelectorAll('.book-open-metrics').forEach(b=>b.addEventListener('click',()=>show(b.dataset.metrics.split(','),'metrics',scopeOf(b))));
 document.querySelectorAll('.book-open-trajectories').forEach(b=>b.addEventListener('click',()=>show(b.dataset.trajectories.split(','),'trajectories',scopeOf(b))));
 document.getElementById('close-book-dialog').onclick=()=>dialog.close();
 // A queued close event must not release a comparison that was already reopened.
 dialog.addEventListener('close',()=>{if(!dialog.open)release();});
 document.getElementById('maximize-book-dialog').onclick=()=>dialog.classList.toggle('book-dialog-full');
 window.addEventListener('message',event=>{
  if(!active||event.source!==active.frame.contentWindow)return;
  if(event.origin!==location.origin&&!(location.protocol==='file:'&&event.origin==='null'))return;
  if(event.data?.type==='bitacora-comparator-ready'){active.ready=true;send();}
 });
 window.addEventListener('pagehide',release);window.BookComparators={open:show,release,active:()=>!!active};
});
