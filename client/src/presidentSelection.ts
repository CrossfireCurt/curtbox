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
