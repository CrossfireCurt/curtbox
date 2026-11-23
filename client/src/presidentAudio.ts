import {useCallback,useEffect,useRef,useState} from 'react';
import type {RoomView} from '../../shared/types';
import {newPresidentSoundCues,presidentSoundCues,type PACueKind} from './presidentSoundEvents';

const prefKey='curtbox.pa.effects';
function preference(){
 try{return window.localStorage.getItem(prefKey)!=='off';}catch{return true;}
}
function playSound(ctx:AudioContext,kind:PACueKind){
 if(ctx.state!=='running')return;
 const t=ctx.currentTime+.012;
 const voice=(hz:number,length:number,amp:number,start=0,wave:OscillatorType='triangle',endHz?:number)=>{
  const osc=ctx.createOscillator(),gain=ctx.createGain(),at=t+start;
  osc.type=wave;osc.frequency.setValueAtTime(hz,at);
  if(endHz)osc.frequency.exponentialRampToValueAtTime(Math.max(20,endHz),at+length);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),at+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start(at);osc.stop(at+length+.015);
 };
 const noise=(length:number,amp:number,start=0,low=450,high=4200)=>{
  const count=Math.max(1,Math.ceil(ctx.sampleRate*length)),buffer=ctx.createBuffer(1,count,ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<count;i++)data[i]=(Math.random()*2-1);
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),at=t+start;
  source.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(low,at);
  filter.frequency.linearRampToValueAtTime(high,at+length);
  filter.Q.value=.6;gain.gain.setValueAtTime(.0001,at);
  gain.gain.linearRampToValueAtTime(amp,at+Math.min(.05,length/3));
  gain.gain.linearRampToValueAtTime(.0001,at+length);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
  source.start(at);source.stop(at+length+.005);
 };
 switch(kind){
  case 'card':noise(.1,.15,0,1500,480);voice(310,.055,.045,.015);break;
  case 'turn':voice(620,.16,.13);voice(930,.24,.12,.17);break;
  case 'tick':noise(.055,.09,0,2000,1200);voice(1200,.06,.035);break;
  case 'skip':voice(630,.14,.14,0,'sawtooth',420);voice(380,.2,.14,.18,'triangle',230);break;
  case 'drink':voice(1720,.56,.085,0,'sine',1430);voice(2330,.34,.05,.065,'sine',1850);break;
  case 'clear':noise(.42,.24,.19,220,3500);voice(510,.29,.035,.20,'triangle',150);break;
  case 'social':
   // Original short synthesized applause/cheer — no external copyrighted recordings.
   for(let i=0;i<9;i++)noise(.13,.07,.045+i*.085,900+i*75,2000+i*80);
   voice(440,.45,.075,0,'sawtooth',620);
   voice(660,.65,.08,.17,'triangle',990);
   break;
 }
}
/** Client audio never controls the server game clock or gameplay. */
export function usePresidentSounds(view:RoomView,now:number,offset:number){
 const [enabled,setEnabled]=useState(preference);
 const context=useRef<AudioContext|null>(null),seen=useRef(new Set<string>());
 const room=useRef(view.code);
 const unlock=useCallback(()=>{
  try{
   if(!context.current||context.current.state==='closed')context.current=new AudioContext();
   if(context.current.state!=='running')void context.current.resume().catch(()=>{});
  }catch{/* Sound is optional if browser/TV does not support Web Audio. */}
 },[]);
 useEffect(()=>{
  if(!enabled)return;
  const onGesture=()=>unlock();
  window.addEventListener('pointerdown',onGesture,{capture:true});
  window.addEventListener('keydown',onGesture,{capture:true});
  return()=>{window.removeEventListener('pointerdown',onGesture,{capture:true});window.removeEventListener('keydown',onGesture,{capture:true});};
 },[enabled,unlock]);
 useEffect(()=>()=>{if(context.current){void context.current.close().catch(()=>{});context.current=null;}},[]);
 const toggle=useCallback(()=>{
  setEnabled(previous=>{
   const next=!previous;
   try{window.localStorage.setItem(prefKey,next?'on':'off');}catch{/* Storage optional. */}
   if(next)unlock();
   return next;
  });
 },[unlock]);
 useEffect(()=>{
  if(room.current!==view.code){seen.current.clear();room.current=view.code;}
  const game=view.pa;
  if(!game)return;
  const cues=presidentSoundCues({game,role:view.me.role==='host'?'host':'player',playerId:view.me.id,now,offset,turnSeconds:view.paSettings?.turnSeconds??30});
  const fresh=newPresidentSoundCues(cues,seen.current);
  if(!enabled)return;
  for(const cue of fresh){
   try{if(context.current)playSound(context.current,cue.kind);}catch{/* Sound failure never interrupts gameplay. */}
  }
 },[view,now,offset,enabled]);
 return {enabled,toggle,unlock};
}
