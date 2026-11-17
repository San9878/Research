document.addEventListener('DOMContentLoaded',()=>{
 const dialog=document.getElementById('book-comparison-dialog'),modalMount=document.getElementById('book-dialog-mount'),bottom=document.getElementById('bottom-comparator');if(!dialog)return;
 const frames=new Set();
 function iframe(mount,models,tab,load){
  const existing=mount.querySelector('iframe');if(existing){const f=existing;f.contentWindow.postMessage({type:tab==='metrics'?'bitacora-open-metrics':'bitacora-open-clouds',ids:models,load},'*');return f}
  const f=document.createElement('iframe');f.title='Comparador interactivo de reconstrucciones y métricas';f.className='book-comparator-frame';f.src='reconstrucciones/interactivo/comparador.html?embed=1&tab='+tab+(tab==='clouds'?'&models='+encodeURIComponent(models.join(',')):'');f.setAttribute('allow','fullscreen');f.onload=()=>{f.contentWindow.postMessage({type:tab==='metrics'?'bitacora-open-metrics':'bitacora-open-clouds',ids:models,load},'*')};mount.append(f);frames.add(f);return f;
 }
 function release(mount){for(const f of [...mount.children]){f.contentWindow?.postMessage({type:'bitacora-release'},'*');f.src='about:blank';frames.delete(f);f.remove()}}
 document.querySelectorAll('.book-open-clouds').forEach(b=>b.onclick=()=>{dialog.showModal();iframe(modalMount,b.dataset.clouds.split(','),'clouds',true)});
 document.querySelectorAll('.book-open-metrics').forEach(b=>b.onclick=()=>{dialog.showModal();iframe(modalMount,b.dataset.metrics.split(','),'metrics',false)});
 document.getElementById('close-book-dialog').onclick=()=>dialog.close();dialog.addEventListener('close',()=>release(modalMount));
 document.getElementById('open-bottom-clouds').onclick=()=>iframe(bottom,['c3vd-v9','c3vd-vn19-a','c3vd-vn19-b'],'clouds',false);
 document.getElementById('open-bottom-metrics').onclick=()=>iframe(bottom,['c3vd-v9','c3vd-vn19-a','c3vd-vn19-b'],'metrics',false);
 document.getElementById('release-bottom').onclick=()=>release(bottom);
 window.addEventListener('message',e=>{if(e.data?.type!=='bitacora-viewer-height')return;for(const f of frames)if(f.contentWindow===e.source&&f.parentElement===bottom)f.style.height=Math.min(3400,Math.max(700,Number(e.data.height)||900))+'px'});
});
