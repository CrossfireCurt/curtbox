import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {installTvNavigation} from '../src/tvNavigation.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(resolve(root,p),'utf8');

test('the Fire TV native presentation occupies the entire screen, with native actions in Back/Menu',()=>{
 const native=read('android-tv/app/src/main/java/fm/curtbox/tv/MainActivity.java');
 assert.doesNotMatch(native,/root\.addView\(toolbar/);
 assert.doesNotMatch(native,/button\("Reload"\)|button\("Server"\)/);
 assert.match(native,/root\.addView\(web,new LinearLayout\.LayoutParams\(-1,-1\)\)/);
 assert.match(native,/Continue hosting","Reload presentation","Change server","Exit Curtbox TV/);
 assert.match(native,/if\(keyCode == KeyEvent\.KEYCODE_MENU\) \{ exitMenu\(\); return true; \}/);
 assert.match(native,/private void confirmChangeServer\(\)/);
});

test('TV presenter prioritizes the table over a slim Presidencies/decrees sidebar',()=>{
 const css=read('client/src/styles.css');
 assert.match(css,/\.tv-mode \.pa-stage-columns\{grid-template-columns:minmax\(0,1fr\) 175px/);
 assert.match(css,/\.tv-mode \.pa-aside \.panel\{padding:11px 10px/);
 assert.match(css,/\.tv-mode \.pa-table-ring\{height:clamp\(420px,calc\(100vh - 195px\),740px\)/);
 assert.match(css,/\.tv-mode \.pa-table\{min-height:0/);
 assert.match(css,/\.tv-mode \.pa-stage\{max-width:none/);
});

test('D-pad scrolls the presenter when the noninteractive table has no focus target, including inside a modal',()=>{
 let keydown;
 let dialog=null;
 const button={
  getBoundingClientRect:()=>({left:900,top:30,width:90,height:36}),
  focus(){document.activeElement=button;},
  scrollIntoView(){}
 };
 const scroller={scrollHeight:1900,clientHeight:700,scrollTop:0};
 const modal={scrollHeight:1100,clientHeight:350,scrollTop:0,
  querySelectorAll:()=>[button]};
 const classNames=new Set();
 const documentMock={
  activeElement:button, scrollingElement:scroller,body:{},
  documentElement:{classList:{add:n=>classNames.add(n),remove:n=>classNames.delete(n)}},
  querySelector:s=>s==='[role="dialog"]'?dialog:null,
  querySelectorAll:()=>[button],
  addEventListener:(type,listener)=>{if(type==='keydown')keydown=listener;},
  removeEventListener:(type)=>{if(type==='keydown')keydown=undefined;},
  hasFocus:()=>true
 };
 const originals=new Map();
 for(const key of ['navigator','window','document','getComputedStyle','MutationObserver']){
  originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
 }
 try{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'FireTV CurtboxTV/1.0'}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:{innerHeight:700,setTimeout:()=>0,requestAnimationFrame:()=>0}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:documentMock});
  Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({display:'block',visibility:'visible'})});
  Object.defineProperty(globalThis,'MutationObserver',{configurable:true,value:class{observe(){} disconnect(){}}});
  const dispose=installTvNavigation();
  const press=key=>{let prevented=false;keydown({key,preventDefault(){prevented=true;}});assert.equal(prevented,true);};
  assert.equal(classNames.has('tv-mode'),true);
  press('ArrowDown');
  assert.equal(scroller.scrollTop,455);
  press('ArrowDown');
  assert.equal(scroller.scrollTop,910);
  press('ArrowUp');
  assert.equal(scroller.scrollTop,455);
  dialog=modal;
  press('ArrowDown');
  assert.equal(modal.scrollTop,455,'an open modal scrolls rather than scrolling the table behind it');
  assert.equal(scroller.scrollTop,455);
  press('ArrowUp');
  assert.equal(modal.scrollTop,0);
  dispose();
  assert.equal(classNames.has('tv-mode'),false);
 }finally{
  for(const [key,descriptor] of originals){
   if(descriptor)Object.defineProperty(globalThis,key,descriptor);
   else delete globalThis[key];
  }
 }
});
