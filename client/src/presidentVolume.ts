/** Persistent President audio category volume (0–1), not shared with other games. */
export function clampPresidentVolume(n:number):number{
 return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
}
export function readPresidentVolume(raw:string|null,fallback:number):number{
 if(raw===null||!raw.trim())return fallback;
 const parsed=Number(raw);
 return Number.isFinite(parsed)&&parsed>=0&&parsed<=1?parsed:fallback;
}
