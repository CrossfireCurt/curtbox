/** D-pad focus navigation used only inside the native Curtbox Android TV WebView. */
const SELECTOR='button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
type Direction='ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight';

function candidates():HTMLElement[]{
 const dialog=document.querySelector<HTMLElement>('[role="dialog"]');
 return [...(dialog??document).querySelectorAll<HTMLElement>(SELECTOR)].filter(element=>{
   const style=getComputedStyle(element),rect=element.getBoundingClientRect();
   return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;
 });
}
function center(el:HTMLElement){
 const rect=el.getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
}
/**
 * Navigate between actual controls when one is in the requested direction.
 * On a presentation, much of the TV display has no controls (only the table).
 * Return false so a D-pad Up/Down can instead scroll the document.
 */
function move(direction:Direction):boolean{
 const all=candidates();if(!all.length)return false;
 const active=document.activeElement as HTMLElement|null;
 if(!active||!all.includes(active)){all[0].focus();return true;}
 const origin=center(active),horizontal=direction==='ArrowRight'||direction==='ArrowLeft';
 const sign=direction==='ArrowRight'||direction==='ArrowDown'?1:-1;
 let best:HTMLElement|undefined,score=Infinity;
 for(const target of all){
   if(target===active)continue;
   const dest=center(target),main=(horizontal?dest.x-origin.x:dest.y-origin.y)*sign;
   if(main<=2)continue;
   const cross=Math.abs(horizontal?dest.y-origin.y:dest.x-origin.x);
   const next=main+2.5*cross;
   if(next<score){score=next;best=target;}
 }
 if(!best)return false;
 best.focus();
 best.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
 return true;
}
/** A focused toolbar button must not trap users above the un-focusable table. */
function scrollPresentation(direction:'ArrowUp'|'ArrowDown'){
 const dialog=document.querySelector<HTMLElement>('[role="dialog"]');
 const scroller=(dialog??document.scrollingElement) as HTMLElement|null;
 if(!scroller)return;
 const limit=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
 const step=Math.max(130,Math.round(window.innerHeight*.65));
 const delta=direction==='ArrowDown'?step:-step;
 scroller.scrollTop=Math.max(0,Math.min(limit,scroller.scrollTop+delta));
}

function closeModal():boolean{
 const modal=document.querySelector<HTMLElement>('[role="dialog"]');
 const close=modal&&[...modal.querySelectorAll<HTMLButtonElement>('button')]
   .find(button=>/^(close|done|cancel|×)$/i.test((button.textContent??'').trim()));
 if(!close)return false;
 close.click();return true;
}
export function installTvNavigation():()=>void{
 if(!navigator.userAgent.includes('CurtboxTV/'))return()=>{};
 document.documentElement.classList.add('tv-mode');
 const keydown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&closeModal()){event.preventDefault();return;}
   if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
   const active=document.activeElement as HTMLElement|null;
   // Left/right remain available for native editing and range sliders.
   if(active&&['INPUT','TEXTAREA','SELECT'].includes(active.tagName)
     &&(event.key==='ArrowLeft'||event.key==='ArrowRight'))return;
   event.preventDefault();
   const direction=event.key as Direction;
   if(!move(direction)&&(direction==='ArrowDown'||direction==='ArrowUp'))scrollPresentation(direction);
 };
 document.addEventListener('keydown',keydown,true);
 const focusFirst=()=>{
   if(!document.hasFocus())return;
   const all=candidates();
   if(all.length&&!all.includes(document.activeElement as HTMLElement))all[0].focus();
 };
 const observer=new MutationObserver(()=>window.requestAnimationFrame(focusFirst));
 observer.observe(document.body,{childList:true,subtree:true});
 window.setTimeout(focusFirst,180);
 const bridge={back:closeModal};
 Object.assign(window,{__curtboxTv:bridge});
 return()=>{
   observer.disconnect();
   document.removeEventListener('keydown',keydown,true);
   document.documentElement.classList.remove('tv-mode');
   delete (window as Window&{__curtboxTv?:typeof bridge}).__curtboxTv;
 };
}
