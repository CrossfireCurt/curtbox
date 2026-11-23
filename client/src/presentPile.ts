import type {PACard,PAPilePlay} from '../../shared/president';

export interface VisiblePileCard {card:PACard;latest:boolean}
export interface PilePresentation {heading:string;cards:VisiblePileCard[];hiddenCount:number;latestCount:number}
const TYPES:Record<number,string>={
 1:'SINGLE (1)',
 2:'PAIRS (2)',
 3:'TRIPLES (3)',
 4:'FOUR OF A KIND (4)',
};
/**
 * A real table-like pile, not separated play-group cards or a scrolling rail.
 * Show at most six cards in the fan so its size stays inside the circular table.
 * The newest accepted combination is guaranteed to remain in the visible fan.
 * Earlier buried cards are counted rather than silently omitted.
 */
export function presentPile(pile:readonly PACard[],plays:readonly PAPilePlay[],maxVisible=6):PilePresentation{
 if(!pile.length)return {heading:'CURRENT PILE – EMPTY',cards:[],hiddenCount:0,latestCount:0};
 const lastCount=plays.length?plays[plays.length-1].cards.length:1;
 const latestCount=Math.min(4,Math.max(1,Math.min(lastCount,pile.length)));
 const visibleCount=Math.min(pile.length,Math.max(latestCount,Math.floor(maxVisible)));
 const hiddenCount=pile.length-visibleCount;
 const cards=pile.slice(-visibleCount).map((card,i)=>({
  card,latest:hiddenCount+i>=pile.length-latestCount,
 }));
 return {heading:`CURRENT PILE – ${TYPES[latestCount]??'SINGLE (1)'}`,cards,hiddenCount,latestCount};
}
