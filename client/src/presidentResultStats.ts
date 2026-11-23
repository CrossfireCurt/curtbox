import type {PAPlayerStats} from '../../shared/president';

/** Stats shown in both presentation and the affected player's last hand.
 * Hide zeros and fields the UI intentionally omits, but preserve stored counters.
 */
export function resultStatChips(stats:PAPlayerStats|undefined,presidencies:number){
 const candidates=[
  {key:'clears',name:'Clears',label:'Clears',value:stats?.pilesCleared??0},
  {key:'socials',name:'Socials',label:'🍻',value:stats?.socials??0},
  {key:'skips',name:'Skips issued',label:'⏭️',value:stats?.skips??0},
  {key:'passes',name:'Passes',label:'Passes',value:stats?.passes??0},
  {key:'presidencies',name:'Presidencies',label:'🇺🇸',value:presidencies}
 ];
 return candidates.filter(stat=>Number.isFinite(stat.value)&&stat.value>0);
}
