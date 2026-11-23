import {useCallback,useEffect,useRef,useState} from 'react';
import type {RoomView} from '../../shared/types';
import {clampPresidentVolume,readPresidentVolume} from './presidentVolume';
import {startPresidentAmbient,type AmbientMusic} from './presidentAmbientMusic';
import {newPresidentSoundCues,presidentSoundCues,type PACueKind} from './presidentSoundEvents';

const prefKey='curtbox.pa.effects';
// CC0 recording: two tankards clink in a toast (SFXMint).
// https://sfxmint.com/sounds/tavern-ambience-05
// The publisher explicitly permits linking to the MP3 from other sites.
const socialCheersUrl='https://sfxmint.com/dl/tavern-ambience-05.mp3';
function preference(){
 try{return window.localStorage.getItem(prefKey)!=='off';}catch{return true;}
}
function playSound(ctx:AudioContext,kind:PACueKind,output:AudioNode){
 if(ctx.state!=='running')return;
 const t=ctx.currentTime+.012;
 const voice=(hz:number,length:number,amp:number,start=0,wave:OscillatorType='triangle',endHz?:number)=>{
  const osc=ctx.createOscillator(),gain=ctx.createGain(),at=t+start;
  osc.type=wave;osc.frequency.setValueAtTime(hz,at);
  if(endHz)osc.frequency.exponentialRampToValueAtTime(Math.max(20,endHz),at+length);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),at+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  osc.connect(gain);gain.connect(output);
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
  source.connect(filter);filter.connect(gain);gain.connect(output);
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
 const [volume,setVolumeState]=useState(()=>{
  try{return readPresidentVolume(window.localStorage.getItem('curtbox.pa.effectsVolume'),.65);}catch{return .65;}
 });
 const context=useRef<AudioContext|null>(null),seen=useRef(new Set<string>());
 const output=useRef<GainNode|null>(null),volumeRef=useRef(volume);
 const cheersMedia=useRef<HTMLAudioElement|null>(null);
 volumeRef.current=volume;
 useEffect(()=>{
  const media=new Audio(socialCheersUrl);
  media.preload='auto';
  media.volume=volumeRef.current;
  cheersMedia.current=media;
  return()=>{
   media.pause();media.removeAttribute('src');media.load();
   if(cheersMedia.current===media)cheersMedia.current=null;
  };
 },[]);
 const room=useRef(view.code);
 const unlock=useCallback(()=>{
  try{
   if(!context.current||context.current.state==='closed'){
    context.current=new AudioContext();
    const gain=context.current.createGain();
    gain.gain.value=volumeRef.current;
    gain.connect(context.current.destination);
    output.current=gain;
   }
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
 useEffect(()=>{if(!enabled&&context.current?.state==='running')void context.current.suspend().catch(()=>{});},[enabled]);
 useEffect(()=>()=>{if(context.current){void context.current.close().catch(()=>{});context.current=null;}},[]);
 const setVolume=useCallback((next:number)=>{
  const normalized=clampPresidentVolume(next);
  setVolumeState(normalized);
  if(output.current)output.current.gain.value=normalized;
  if(cheersMedia.current)cheersMedia.current.volume=normalized;
  try{window.localStorage.setItem('curtbox.pa.effectsVolume',String(normalized));}catch{/* Storage optional. */}
 },[]);
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
   try{
    if(cue.kind==='social'&&cheersMedia.current){
     // Play a licensed real-world toast. A blocked/unavailable media stream
     // falls back to the original local synthesized cheer.
     const media=cheersMedia.current;
     media.pause();media.currentTime=0;
     void media.play().catch(()=>{
      if(context.current&&output.current)playSound(context.current,'social',output.current);
     });
    }else if(context.current&&output.current)playSound(context.current,cue.kind,output.current);
   }catch{/* Sound failure never interrupts gameplay. */}
  }
 },[view,now,offset,enabled]);
 return {enabled,volume,setVolume,toggle,unlock};
}


/**
 * The presenter prefers an optional downloaded track. If absent, the game
 * synthesizes a local instrumental loop instead of silently playing nothing.
 * Never starts any background music on player phones.
 */
export function usePresidentMusic(view:RoomView){
 const [enabled,setEnabled]=useState(()=>{
  try{return window.localStorage.getItem('curtbox.pa.music')==='on';}catch{return false;}
 });
 const [volume,setVolumeState]=useState(()=>{
  try{return readPresidentVolume(window.localStorage.getItem('curtbox.pa.musicVolume'),.20);}catch{return .20;}
 });
 const volumeRef=useRef(volume);volumeRef.current=volume;
 const active=view.me.role==='host'&&!view.me.hostWaiting;
 const stage=view.pa?.stage;
 const track=stage==='play'?'guess':stage==='exchange'||stage==='decree'||stage==='vote'?'predict':'lobby';
 const audio=useRef<HTMLAudioElement|null>(null);
 const synth=useRef<AmbientMusic|null>(null);
 const setVolume=useCallback((next:number)=>{
  const normalized=clampPresidentVolume(next);
  setVolumeState(normalized);
  if(audio.current)audio.current.volume=normalized;
  synth.current?.setVolume(normalized);
  try{window.localStorage.setItem('curtbox.pa.musicVolume',String(normalized));}catch{/* Storage optional. */}
 },[]);
 const toggle=useCallback(()=>{
  const next=!enabled;
  // Starting a real AudioContext directly inside the click/TV remote action
  // unlocks synthesized music even if media later reports 404 asynchronously.
  if(next&&active&&!synth.current)synth.current=startPresidentAmbient(track,volumeRef.current);
  setEnabled(next);
  try{window.localStorage.setItem('curtbox.pa.music',next?'on':'off');}catch{/* Storage optional. */}
 },[enabled,active,track]);
 useEffect(()=>{
  if(!active||!enabled)return;
  const music=new Audio(`/audio/music/${track}.ogg`);
  music.loop=true;music.preload='auto';music.volume=volumeRef.current;
  audio.current=music;
  const onPlaying=()=>{synth.current?.stop();synth.current=null;};
  const onError=()=>{
   if(audio.current!==music)return;
   if(!synth.current)synth.current=startPresidentAmbient(track,volumeRef.current);
   void synth.current?.resume();
  };
  music.addEventListener('playing',onPlaying);
  music.addEventListener('error',onError);
  const unlock=()=>{
   if(audio.current!==music)return;
   void synth.current?.resume();
   void music.play().catch(()=>{/* Missing assets use original synthesized loop. */});
  };
  unlock();
  window.addEventListener('pointerdown',unlock,{capture:true});
  window.addEventListener('keydown',unlock,{capture:true});
  return()=>{
   window.removeEventListener('pointerdown',unlock,{capture:true});
   window.removeEventListener('keydown',unlock,{capture:true});
   music.removeEventListener('playing',onPlaying);
   music.removeEventListener('error',onError);
   music.pause();music.removeAttribute('src');music.load();
   if(audio.current===music)audio.current=null;
   synth.current?.stop();synth.current=null;
  };
 },[active,enabled,track]);
 return {enabled,volume,setVolume,toggle};
}
