/* Static bilingual text only. Scientific records and DOM structure remain unchanged. */
(()=>{
 'use strict';
 const catalogue=window.BOOK_EN||{},key='n3dce-language',original=new WeakMap(),attributes=new WeakMap(),originalTitle=document.title;
 const normalize=s=>String(s).replace(/\s+/g,' ').trim();
 const ignore='script,style,code,pre,kbd,math,svg,[translate="no"],.book-language-switch';
 const numeric=/\d+(?:[.,]\d+)*(?:[eE][+\-]?\d+)?/g;
 const numbers=s=>s.match(numeric)||[];
 const rules=new Map();let language='es',mode='auto',observer,timer=null,control;
 for(const [from,to] of Object.entries(catalogue)){
  const a=numbers(from),b=numbers(to);
  if(a.length&&JSON.stringify(a)===JSON.stringify(b)){
   let i=0;const source=from.replace(numeric,()=>`@@N${i++}@@`);i=0;
   const target=to.replace(numeric,()=>`@@N${i++}@@`);
   if(!rules.has(source))rules.set(source,target);
  }
 }
 function text(s,lang=language,split=true){
  if(lang!=='en')return String(s);
  const normalized=normalize(s);let translated=catalogue[normalized];
  if(translated===undefined){
   let i=0,values=numbers(normalized);const template=normalized.replace(numeric,()=>`@@N${i++}@@`),rule=rules.get(template);
   if(rule!==undefined)translated=rule.replace(/@@N(\d+)@@/g,(_,index)=>values[+index]);
  }
  if(translated===undefined&&!split&&catalogue[normalized+'.']!==undefined)translated=catalogue[normalized+'.'].replace(/\.$/,'');
  if(translated===undefined&&split){
   const parts=normalized.split(/( · |\. (?=[A-ZÁÉÍÓÚ]))/);
   if(parts.length>1)translated=parts.map((part,i)=>i%2?part:text(part,lang,false)).join('');
  }
  if(translated===undefined)return String(s);
  const start=String(s).match(/^\s*/)[0],end=String(s).match(/\s*$/)[0];return start+translated+end;
 }
 function readPreference(){try{return localStorage.getItem(key)||'auto'}catch{return 'auto'}}
 function preferred(){
  try{if(parent!==window&&parent.BookI18n)return parent.BookI18n.language()}catch{}
  const forced=new URLSearchParams(location.search).get('lang');
  if(forced==='es'||forced==='en')return forced;
  if(mode==='es'||mode==='en')return mode;
  return (navigator.languages?.[0]||navigator.language||'es').toLowerCase().startsWith('es')?'es':'en';
 }
 function eligible(node){return node.parentElement&&!node.parentElement.closest(ignore)}
 function updateNode(node){
  const current=node.nodeValue,last=original.get(node);let source=current;
  if(last&&current===last.display)source=last.source;
  const display=text(source);if(current!==display)node.nodeValue=display;
  original.set(node,{source,display});
 }
 function updateAttribute(el,name){
  const current=el.getAttribute(name);if(!current)return;
  let records=attributes.get(el);if(!records){records={};attributes.set(el,records)}
  const last=records[name],source=last&&current===last.display?last.source:current,display=text(source);
  if(current!==display)el.setAttribute(name,display);records[name]={source,display};
 }
 function apply(){
  if(!document.body)return;observer?.disconnect();
  // Options without an explicit value otherwise change their programmatic value when translated.
  document.querySelectorAll('option:not([value])').forEach(o=>o.setAttribute('value',o.value));
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode())if(eligible(node))updateNode(node);
  document.querySelectorAll('[title],[alt],[placeholder],[aria-label],optgroup[label]').forEach(el=>{
   if(el.closest(ignore))return;
   for(const name of ['title','alt','placeholder','aria-label','label'])updateAttribute(el,name);
  });
  document.documentElement.lang=language;
  document.title=text(originalTitle);
  if(control)control.value=mode;
  observer?.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','alt','placeholder','aria-label','label']});
 }
 function broadcast(){
  for(const frame of document.querySelectorAll('iframe'))try{frame.contentWindow.postMessage({type:'book-language',language},location.protocol==='file:'?'*':location.origin)}catch{}
 }
 function set(value,{persist=true}={}){
  mode=['es','en','auto'].includes(value)?value:'auto';
  if(persist&&new URLSearchParams(location.search).has('lang'))try{const url=new URL(location.href);if(mode==='auto')url.searchParams.delete('lang');else url.searchParams.set('lang',mode);history.replaceState(null,'',url)}catch{}
  language=preferred();
  if(persist)try{localStorage.setItem(key,mode)}catch{}
  apply();broadcast();window.dispatchEvent(new CustomEvent('book-language-change',{detail:{language}}));
 }
 function init(){
  mode=readPreference();language=preferred();
  try{if(parent!==window&&parent.BookI18n)language=parent.BookI18n.language()}catch{}
  if(parent===window){
   const nav=document.createElement('div');nav.className='book-language-switch';nav.setAttribute('translate','no');
   nav.innerHTML='<label for="book-language">Idioma / Language</label><select id="book-language" aria-label="Idioma / Language"><option value="auto">Auto · dispositivo / device</option><option value="es">Español</option><option value="en">English</option></select>';
   document.body.prepend(nav);control=nav.querySelector('select');control.addEventListener('change',()=>set(control.value));
  }
  observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(apply,30)});apply();
 }
 window.BookI18n={set,text,language:()=>language,mode:()=>mode,refresh:apply,catalogueSize:()=>Object.keys(catalogue).length};
 window.addEventListener('storage',e=>{if(e.key===key)set(e.newValue||'auto',{persist:false})});
 window.addEventListener('languagechange',()=>{if(mode==='auto')set('auto',{persist:false})});
 window.addEventListener('message',e=>{
  if(e.source===parent&&parent!==window&&(e.origin===location.origin||(location.protocol==='file:'&&e.origin==='null'))&&e.data?.type==='book-language'&&['es','en'].includes(e.data.language)){
   language=e.data.language;apply();broadcast();
  }
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
