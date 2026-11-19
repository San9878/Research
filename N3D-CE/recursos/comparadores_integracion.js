document.addEventListener('DOMContentLoaded',()=>{
 const dialog=document.getElementById('book-comparison-dialog'),modal=document.getElementById('book-dialog-mount'),bottom=document.getElementById('bottom-comparator');if(!dialog)return;
 let active=null,lastIds=['c3vd-v9','c3vd-vn19-a','c3vd-vn19-b'];
 const sameOrigin=event=>event.origin===location.origin||location.protocol==='file:'&&event.origin==='null';
 function send(){if(!active?.ready||!active.request||active.lastSent===active.request)return;active.lastSent=active.request;active.frame.contentWindow.postMessage(active.request,'*');}
 function release(){if(!active)return;active.frame.contentWindow?.postMessage({type:'bitacora-release'},'*');active.frame.src='about:blank';active.frame.remove();active=null;}
 function open(mount,ids,tab,load){
   lastIds=ids.length?ids:lastIds;
   const request={type:tab==='metrics'?'bitacora-open-metrics':'bitacora-open-clouds',ids:lastIds,load};
   if(active?.mount!==mount)release();
   if(!active){
     const frame=document.createElement('iframe');frame.title='Comparador de nubes y métricas';frame.className='book-comparator-frame';frame.allow='fullscreen';
     active={frame,mount,ready:false,request};
     frame.src='reconstrucciones/interactivo/comparador.html?v=20261119&embed=1&tab='+tab;
     frame.addEventListener('load',()=>{if(active?.frame===frame){active.ready=true;send();}});
     mount.append(frame);
   }else{active.request=request;send();}
   document.getElementById('book-dialog-title').textContent=tab==='clouds'?'Reconstrucciones · '+lastIds.length+' seleccionadas':'Tablas y protocolo de comparación';
   document.getElementById('book-dialog-external').href='reconstrucciones/interactivo/comparador.html?v=20261119&tab='+tab+'&models='+encodeURIComponent(lastIds.join(','));
 }
 function show(ids,tab){
   if(!dialog.open)dialog.showModal();open(modal,ids,tab,tab==='clouds');
 }
 document.querySelectorAll('.book-open-clouds').forEach(b=>b.addEventListener('click',()=>show(b.dataset.clouds.split(','),'clouds')));
 document.querySelectorAll('.book-open-metrics').forEach(b=>b.addEventListener('click',()=>show(b.dataset.metrics.split(','),'metrics')));
 document.getElementById('close-book-dialog').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{if(active?.mount===modal)release();});
 dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
 document.getElementById('maximize-book-dialog').onclick=()=>dialog.classList.toggle('book-dialog-full');
 document.getElementById('open-bottom-clouds').onclick=()=>open(bottom,['c3vd-v9','c3vd-vn19-a','c3vd-vn19-b'],'clouds',false);
 document.getElementById('open-bottom-metrics').onclick=()=>open(bottom,['c3vd-v9','c3vd-vn19-a','c3vd-vn19-b'],'metrics',false);
 document.getElementById('release-bottom').onclick=()=>{if(active?.mount===bottom)release();};
 window.addEventListener('message',event=>{
   if(!active||event.source!==active.frame.contentWindow||!sameOrigin(event))return;
   if(event.data?.type==='bitacora-comparator-ready'){active.ready=true;send();}
   if(event.data?.type==='bitacora-viewer-height'&&active.mount===bottom)active.frame.style.height=Math.min(1500,Math.max(820,Number(event.data.height)||900))+'px';
 });
 window.addEventListener('pagehide',release);
 window.BookComparators={open:show,release,active:()=>!!active};
});
