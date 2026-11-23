/**
 * Original locally synthesized background groove for installations without
 * the optional /audio/music/*.ogg assets (these are ignored by Git).
 * The fallback is quiet, instrumental, and remains independent of SFX.
 */
export interface AmbientMusic {resume:()=>Promise<void>;setVolume:(value:number)=>void;stop:()=>void}
const CHORDS:Record<string,number[][]>={
 lobby:[[60,64,67,71],[57,60,64,69],[62,65,69,72],[55,59,62,67]],
 guess:[[57,60,64,69],[53,57,60,65],[55,59,62,67],[52,55,59,64]],
 predict:[[62,65,69,74],[59,62,65,71],[60,64,67,72],[57,60,64,69]]
};
const midi=(note:number)=>440*Math.pow(2,(note-69)/12);
export function ambientChord(track:string,index:number){
 const chords=CHORDS[track]??CHORDS.lobby;
 return chords[Math.floor(index/8)%chords.length];
}
export function startPresidentAmbient(track:string,volume:number):AmbientMusic|null{
 if(typeof window==='undefined'||!window.AudioContext)return null;
 let ctx:AudioContext;
 try{ctx=new AudioContext();}catch{return null;}
 const master=ctx.createGain();
 master.gain.value=Math.max(0,Math.min(1,volume))*.17;
 master.connect(ctx.destination);
 let beat=0,stopped=false;
 const tick=()=>{
  if(stopped||ctx.state!=='running')return;
  const chord=ambientChord(track,beat);
  const note=chord[[0,2,1,3,2,1,0,3][beat%8]];
  const when=ctx.currentTime+.008;
  const playNote=(frequency:number,duration:number,strength:number)=>{
   const osc=ctx.createOscillator(),env=ctx.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(frequency,when);
   env.gain.setValueAtTime(.0001,when);
   env.gain.exponentialRampToValueAtTime(strength,when+.035);
   env.gain.exponentialRampToValueAtTime(.0001,when+duration);
   osc.connect(env);env.connect(master);
   osc.start(when);osc.stop(when+duration+.02);
  };
  playNote(midi(note),.3,.27);
  if(beat%8===0)playNote(midi(chord[0]-12),.95,.30);
  beat++;
 };
 const interval=setInterval(tick,310);
 const resume=async()=>{if(!stopped&&ctx.state==='suspended')try{await ctx.resume();}catch{/* Browser gesture may still be required. */}};
 void resume().then(tick);
 return {
  resume,
  setVolume(value){master.gain.value=Math.max(0,Math.min(1,value))*.17;},
  stop(){if(stopped)return;stopped=true;clearInterval(interval);void ctx.close().catch(()=>{});}
 };
}
