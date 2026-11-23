import type {PACard} from '../../shared/president';

/**
 * Keep play / Social selections single-rank, while exchange returns may mix ranks.
 * Selecting a different rank swaps the play selection to that card.
 */
export function toggleCardSelection(current:readonly PACard[],card:PACard,mode:'play'|'exchange'):PACard[]{
 if(current.includes(card))return current.filter(c=>c!==card);
 if(mode==='exchange')return [...current,card];
 const rank=card.slice(0,-1);
 return [...current.filter(c=>c.slice(0,-1)===rank),card];
}

/** Stale cards never appear selected or get sent after another game action. */
export function availableCardSelection(current:readonly PACard[],available:readonly PACard[]):PACard[]{
 const present=new Set(available);
 return current.filter(card=>present.has(card));
}

/** The one action button represents Play or a four-of-kind-completing Social. */
export function presidentPlayButtonMode(
 selected:readonly PACard[],requirement:{rank:string;count:number}|undefined,
 canPlay:boolean,canSocial:boolean
):{label:'Play'|'Social!';enabled:boolean;social:boolean}{
 const rank=selected[0]?.slice(0,-1);
 const uniform=selected.length>0&&selected.every(c=>c.slice(0,-1)===rank);
 const completesRun=uniform&&!!requirement&&requirement.rank===rank&&selected.length===requirement.count;
 const four=uniform&&selected.length===4;
 const social=Boolean((canPlay&&(completesRun||four))||(canSocial&&completesRun));
 return {label:social?'Social!':'Play',enabled:uniform&&(canPlay||social),social};
}
