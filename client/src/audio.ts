import {useCallback,useEffect,useRef,useState} from 'react';
import type {PublicGame,Status} from '../../shared/types';

type SoundEvent={id:string;emoji:string;label:string;by:string;at:number;sound:string};
interface Params {enabled:boolean;roomStatus?:Status;game?:PublicGame;musicVolume:number;effectsVolume:number;eventSound?:SoundEvent}
type MusicPlayback={track:string;audio:HTMLAudioElement};
type ReactionJob={sound:string;receivedAt:number};

const musicTrack=(status?:Status,phase?:string)=>{
 if(status==='lobby'||status==='setup')return 'lobby';
 if(status==='results'||status==='resultsReveal')return 'lobby';
 if(status==='countdown')return 'finale';
 if(phase?.startsWith('finale'))return 'finale';
 if(phase==='predict'||phase==='predictReveal')return 'predict';
 if(phase==='answerReveal'||phase==='scoreReveal')return 'lobby';
 return 'guess';
};
const phaseCue=(status?:Status,phase?:string)=>{
 if(status==='countdown')return 'countdown';
 if(status==='resultsReveal')return 'winner';
 if(status!=='playing')return '';
 if(phase==='answerReveal'||phase==='finaleReveal')return 'reveal';
 if(phase==='scoreReveal'||phase==='finaleScore')return 'score';
 return '';
};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const file=(category:'music'|'sfx',name:string)=>`/audio/${category}/${name}.ogg`;

export function useGameAudio({enabled,roomStatus,game,musicVolume,effectsVolume,eventSound}:Params){
 const [unlocked,setUnlocked]=useState(false);
 const ctx=useRef<AudioContext|null>(null);
 const music=useRef<MusicPlayback|null>(null);
 const fading=useRef<HTMLAudioElement|null>(null);
 const fadeTimer=useRef<ReturnType<typeof setInterval>|null>(null);
 const currentEffect=useRef<HTMLAudioElement|null>(null);
 const reactionPlaying=useRef<HTMLAudioElement|null>(null);
 const reactionQueue=useRef<ReactionJob[]>([]);
 const reactionBusy=useRef(false);
 const lastReaction=useRef('');
 const lastCue=useRef('');
 const values=useRef({enabled,effectsVolume,musicVolume});
 values.current={enabled,effectsVolume,musicVolume};
 const phase=game?.phase;
 const startedAt=game?.phaseStartedAt;
 const track=musicTrack(roomStatus,phase);

 const tone=useCallback((frequency:number,duration:number,volume:number)=>{
  const c=ctx.current;
  if(!c||c.state!=='running')return;
  const oscillator=c.createOscillator(),gain=c.createGain(),at=c.currentTime+.005;
  oscillator.type='triangle';oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(Math.max(0,volume),at);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain);gain.connect(c.destination);oscillator.start(at);oscillator.stop(at+duration+.01);
 },[]);
 const unlock=useCallback(()=>{
  try{
   if(!ctx.current)ctx.current=new AudioContext();
   // A pointer/key interaction is needed for browsers that block autoplay.
   // React/Socket.IO events cannot grant playback permission by themselves.
   void ctx.current.resume().then(()=>setUnlocked(ctx.current?.state==='running')).catch(()=>{});
  }catch{/* Autoplay/browser permission is optional; game timing is unaffected. */}
 },[]);
 useEffect(()=>{
  if(!enabled||unlocked)return;
  // Unlock on the host's very first interaction, not only a settings button.
  const handler=()=>unlock();
  window.addEventListener('pointerdown',handler,{capture:true});
  window.addEventListener('keydown',handler,{capture:true});
  return()=>{window.removeEventListener('pointerdown',handler,{capture:true});window.removeEventListener('keydown',handler,{capture:true});};
 },[enabled,unlocked,unlock]);
 const stopMusic=useCallback(()=>{
  if(fadeTimer.current)clearInterval(fadeTimer.current);
  fadeTimer.current=null;
  music.current?.audio.pause();music.current=null;
  fading.current?.pause();fading.current=null;
 },[]);

 // The server's phase start timestamp determines the position after reconnects.
 // Actual tracks are self-hosted under /audio/music (install with npm run audio:fetch).
 useEffect(()=>{
  if(!enabled||!unlocked){stopMusic();return;}
  if(music.current?.track===track)return;
  if(fadeTimer.current)clearInterval(fadeTimer.current);
  fading.current?.pause();fading.current=music.current?.audio??null;
  const previous=fading.current;
  const next=new Audio(file('music',track));
  next.preload='auto';next.loop=true;next.volume=0;
  music.current={track,audio:next};
  const start=Date.now();
  const seek=()=>{
   if(!Number.isFinite(next.duration)||next.duration<=0)return;
   const elapsed=Math.max(0,(Date.now()-(startedAt??Date.now()))/1000);
   next.currentTime=elapsed%next.duration;
  };
  next.addEventListener('loadedmetadata',seek,{once:true});
  next.addEventListener('error',()=>{if(music.current?.audio===next)music.current=null;},{once:true});
  void next.play().catch(()=>{if(music.current?.audio===next)music.current=null;});
  fadeTimer.current=setInterval(()=>{
   const t=clamp((Date.now()-start)/700);
   const volume=clamp(values.current.musicVolume);
   next.volume=values.current.enabled?clamp(t*volume):0;
   if(previous)previous.volume=clamp((1-t)*volume);
   if(t>=1){if(fadeTimer.current)clearInterval(fadeTimer.current);fadeTimer.current=null;previous?.pause();fading.current=null;}
  },45);
  return()=>{if(fadeTimer.current)clearInterval(fadeTimer.current);fadeTimer.current=null;};
 },[enabled,unlocked,track,stopMusic]);
 useEffect(()=>{
  if(music.current?.audio&&!fadeTimer.current)music.current.audio.volume=enabled?clamp(musicVolume):0;
 },[enabled,musicVolume]);
 useEffect(()=>()=>{stopMusic();currentEffect.current?.pause();reactionPlaying.current?.pause();void ctx.current?.close();},[stopMusic]);

 // Keep a very quiet synthesized backup if the CC0 soundtrack hasn't been
 // downloaded yet. This fallback is never used when a real music file plays.
 useEffect(()=>{
  if(!enabled||!unlocked)return;
  const notes:Record<string,number[]>={lobby:[262,330,392,330],guess:[294,349,392,349],predict:[220,262,330,262],finale:[330,392,440,523]};
  let last=-1;
  const timer=setInterval(()=>{
   if(music.current)return;
   const beat=Math.floor(Date.now()/600);
   if(last===beat)return;
   last=beat;
   tone((notes[track]??notes.lobby)[beat%4],.16,clamp(values.current.musicVolume)*.055);
  },180);
  return()=>clearInterval(timer);
 },[enabled,unlocked,track,tone]);

 // A few phase stingers: the sourced Kenney Music Jingles pack supplies the audio.
 useEffect(()=>{
  const cue=phaseCue(roomStatus,phase);
  const key=`${roomStatus}:${phase}:${startedAt??''}`;
  if(!cue||!enabled||!unlocked||lastCue.current===key)return;
  lastCue.current=key;
  const sound=new Audio(file('sfx',`cue-${cue}`));
  sound.volume=clamp(effectsVolume*.75);
  currentEffect.current?.pause();currentEffect.current=sound;
  sound.addEventListener('error',()=>tone(660,.22,effectsVolume*.13),{once:true});
  void sound.play().catch(()=>tone(660,.22,effectsVolume*.13));
 },[roomStatus,phase,startedAt,enabled,unlocked,effectsVolume,tone]);

 // Reactions remain sequential per host. At most 1 playing + 3 waiting; a
 // queued sound expires if it has not begun within 2 s. Only AUDIO is dropped.
 const playQueued=useCallback(function playNext(){
  if(reactionBusy.current||!values.current.enabled)return;
  let next:ReactionJob|undefined;
  while((next=reactionQueue.current.shift())){if(Date.now()-next.receivedAt<=2000)break;}
  if(!next||Date.now()-next.receivedAt>2000)return;
  reactionBusy.current=true;
  const sound=new Audio(file('sfx',`reaction-${next.sound}`));
  reactionPlaying.current=sound;
  sound.volume=clamp(values.current.effectsVolume);
  let completed=false;
  const finish=()=>{
   if(completed)return;completed=true;
   reactionBusy.current=false;reactionPlaying.current=null;
   playNext();
  };
  sound.addEventListener('ended',finish,{once:true});
  sound.addEventListener('error',()=>{tone(420,.12,values.current.effectsVolume*.10);finish();},{once:true});
  void sound.play().catch(()=>{tone(420,.12,values.current.effectsVolume*.10);finish();});
 },[tone]);
 useEffect(()=>{
  if(!enabled){reactionQueue.current=[];reactionPlaying.current?.pause();reactionPlaying.current=null;reactionBusy.current=false;}
 },[enabled]);
 useEffect(()=>{
  if(!eventSound||!enabled||!unlocked)return;
  const key=`${eventSound.at}:${eventSound.id}:${eventSound.by}`;
  if(lastReaction.current===key)return;
  lastReaction.current=key;
  if(reactionBusy.current&&reactionQueue.current.length>=3)return;
  reactionQueue.current.push({sound:eventSound.sound,receivedAt:Date.now()});
  playQueued();
 },[eventSound,enabled,unlocked,playQueued]);
 return {unlock,unlocked};
}
