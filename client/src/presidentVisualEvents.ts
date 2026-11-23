/** Freshness check for timestamped server-owned visual events.
 * All clock comparisons are in the room/server time domain.
 */
export function isPresidentVisualEventActive(at:number|undefined,now:number,offset:number,duration:number){
 if(at===undefined||!Number.isFinite(at))return false;
 const age=now-offset-at;
 return age>=-500&&age<duration;
}
