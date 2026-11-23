/** Compact geometry for graphical face-down cards in a presenter player seat. */
export function cardBackStackLayout(rawCount:number){
 const count=Number.isFinite(rawCount)?Math.max(0,Math.floor(rawCount)):0;
 const visible=Math.min(count,16);
 const step=visible<=1?12:Math.min(12,Math.floor(62/(visible-1)));
 return {count,visible,hidden:count-visible,step,width:visible?38+(visible-1)*step:0};
}
