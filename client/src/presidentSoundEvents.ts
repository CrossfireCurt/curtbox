import type {PAPublic} from '../../shared/president';

export type PACueKind='card'|'turn'|'tick'|'skip'|'social'|'drink'|'clear';
export interface PASoundCue {kind:PACueKind;key:string}
interface CueInput {game:PAPublic;role:'host'|'player';playerId:string;now:number;offset:number;turnSeconds:number}
/** Pure server-event to sound routing. Safe under repeated room:view snapshots. */
export function presidentSoundCues({game,role,playerId,now,offset,turnSeconds}:CueInput):PASoundCue[]{
 const serverNow=now-offset;
 const cues:PASoundCue[]=[];
 const fresh=(at:number)=>at<=serverNow+1200&&serverNow-at<=3100;
 if(game.stage!=='play')return cues;
 if(role==='host'){
  if(game.lastPlayed&&fresh(game.lastPlayed.at))cues.push({kind:'card',key:`card:${game.lastPlayed.serial}`});
  if(game.lastClear&&fresh(game.lastClear.at)){
   if(game.lastClear.reason==='Social')cues.push({kind:'social',key:`social:${game.lastClear.serial}`});
   cues.push({kind:'clear',key:`clear:${game.lastClear.serial}`});
  }
  if(game.lastSkip&&fresh(game.lastSkip.at))cues.push({kind:'skip',key:`skip:${game.lastSkip.serial}`});
  return cues;
 }
 if(game.currentPlayerId===playerId&&game.turnEndsAt!==undefined){
  const start=game.turnEndsAt-turnSeconds*1000,age=serverNow-start,remaining=game.turnEndsAt-serverNow;
  if(age>=-500&&age<=2500)cues.push({kind:'turn',key:`turn:${game.turnEndsAt}:${playerId}`});
  const seconds=Math.ceil(remaining/1000);
  if(seconds>=1&&seconds<=5)cues.push({kind:'tick',key:`tick:${game.turnEndsAt}:${seconds}:${playerId}`});
 }
 if(game.lastSkip?.skipped===playerId&&fresh(game.lastSkip.at))
  cues.push({kind:'skip',key:`skip:${game.lastSkip.serial}`});
 if(game.myDrinkEvent&&fresh(game.myDrinkEvent.at))
  cues.push({kind:'drink',key:`drink:${game.myDrinkEvent.serial}`});
 return cues;
}
/** Mark each authoritative cue once; cap memory across long sessions. */
export function newPresidentSoundCues(cues:readonly PASoundCue[],seen:Set<string>){
 const fresh:PASoundCue[]=[];
 for(const cue of cues){
  if(seen.has(cue.key))continue;
  seen.add(cue.key);
  fresh.push(cue);
 }
 if(seen.size>500){
  const prune=seen.size-350;
  for(let i=0;i<prune;i++)seen.delete(seen.values().next().value!);
 }
 return fresh;
}
