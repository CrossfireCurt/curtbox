/** President / Asshole wire contracts. Cards are rank+suit: 10H, 4C, AS. */
export type PACard = string;
/** Consecutive cards of the top rank, independent of which play contributed. */
export function topRankRun(pile:readonly PACard[]):{rank:string;count:number}|undefined{
 if(!pile.length)return;
 const rank=pile[pile.length-1].slice(0,-1);
 let count=0;
 for(let i=pile.length-1;i>=0&&pile[i].slice(0,-1)===rank;i--)count++;
 return {rank,count};
}
export function completesFourOfKind(pile:readonly PACard[],cards:readonly PACard[]):boolean{
 if(!cards.length||cards.length>4)return false;
 const rank=cards[0].slice(0,-1);
 if(cards.some(c=>c.slice(0,-1)!==rank))return false;
 if(cards.length===4)return true;
 const run=topRankRun(pile);
 return !!run&&run.rank===rank&&run.count>=1&&run.count<=3&&run.count+cards.length===4;
}
export type PAStage = 'ready'|'exchange'|'play'|'decree'|'vote'|'finale'|'ended';
/** All clients share one server-time finale: opening, ascending reveals, then 10s to results. */
export const PA_FINALE_INTRO_MS=1800;
export const PA_FINALE_RANK_MS=800;
export const PA_FINALE_HOLD_MS=10000;
export function paFinaleRevealEndsAt(startedAt:number,rankCount:number){
 return startedAt+PA_FINALE_INTRO_MS+Math.max(0,rankCount)*PA_FINALE_RANK_MS;
}
export function paFinaleVisibleRanks(startedAt:number,serverNow:number,rankCount:number){
 return Math.min(Math.max(0,rankCount),Math.max(0,
  Math.floor((serverNow-startedAt-PA_FINALE_INTRO_MS)/PA_FINALE_RANK_MS)+1));
}
export type PADecreeKey = 'unequal_burden'|'rank_seating'|'reverse_deal'|'reverse_play'|'double_trouble'|'card_exchange'|'democracy'|'term_limits'|'max_active'|'drink_twos'|'require_ack';
export type PADecreeAction = {kind:'enact'|'repeal';key:PADecreeKey;value?:number};
export interface PASettings {
  mode:'president'|'asshole'; turnSeconds:number; exchangeSeconds:number; decreeSeconds:number; voteSeconds:number;
  graceSeconds:number; consecutiveForDecree:number; openingCard:PACard; social:boolean;
  termDuration:number; termSelfExpires:boolean; botCount:number;
}
export interface PADecree {key:PADecreeKey;value?:number;expiresBefore?:number}
export interface PARank {id:string;name:string;position:number}
export interface PAVote {proposals:PADecreeAction[];votes:Record<string,number>;deadline:number;tieIndices?:number[]}
export interface PAExchange {upper:string;lower:string;count:number;original:PACard[];selected?:PACard[]}
export interface PABot {id:string;name:string;joinedAt:number}
export interface PAPilePlay {by:string;cards:PACard[];serial:number}
export interface PAClearedPile {by:string;reason:string;at:number;serial:number;cards:PACard[];plays:PAPilePlay[]}
/** Counters are server-owned, never computed from partial public snapshots. */
export interface PAPlayerStats {cardsPlayed:number;pilesCleared:number;socials:number;twosPlayed:number;passes:number;skips:number}
export interface PAState {
  stage:PAStage; handNumber:number; seats:string[]; hands:Record<string,PACard[]>; active:string[];
  bots:PABot[]; botActionKey?:string; botActionAt?:number;
  ready:string[]; previousRanks:PARank[]; finished:string[]; handRanks:PARank[];
  leadPlayer?:string; turn?:string; turnEndsAt?:number; pile:PACard[]; pileOwner?:string; pileRank?:number;
  passed:string[]; lastPlay?:{player:string;rank:number;count:number;cards:PACard[];serial:number};serial:number;
  pilePlays?:PAPilePlay[];pileHistory?:PAClearedPile[];
  lastClear?:{by:string;cards:PACard[];at:number;reason:string;serial:number};
  lastSkip?:{by:string;skipped:string;at:number;serial:number};
  lastPass?:{by:string;at:number;serial:number};
  lastPlayed?:{by:string;at:number;serial:number};
  drinkEvents?:Record<string,{serial:number;at:number}>;
  exchange:PAExchange[]; stageEndsAt?:number; finaleStartedAt?:number; finaleNextStage?:'ready'|'decree'|'ended'; decrees:PADecree[];
  pendingPresident?:string; decreeActionsRemaining:number; vote?:PAVote;
  presidencies:Record<string,number>; streaks:Record<string,number>; longestStreak:Record<string,number>;
  playerStats?:Record<string,PAPlayerStats>;handStats?:Record<string,PAPlayerStats>;
  names:Record<string,string>; departed:string[]; drinking:Record<string,string[]>;
  event?:string;
}
export interface PAPublic {
  stage:PAStage;handNumber:number;seats:{id:string;name:string;cards:number;position?:number;finishedPosition?:number;online:boolean;ready:boolean;bot:boolean;nextHand?:boolean}[];
  handPlayerCount:number;myFinishPosition?:number;
  /** Phone-only combination requirement; never exposes public pile cards or opponents' hands. */
  playRule?:{empty:boolean;rank?:string;count:number;openingCard?:PACard;doubleTrouble:boolean};
  currentPlayerId?:string;turnEndsAt?:number;stageEndsAt?:number;finaleStartedAt?:number;pile?:PACard[];pileOwner?:string;
  pilePlays?:PAPilePlay[];pileHistory?:PAClearedPile[];
  lastClear?:PAState['lastClear'];lastSkip?:PAState['lastSkip'];lastPass?:PAState['lastPass'];
  /** Presenter card sound event and private affected-player drink cue. */
  lastPlayed?:PAState['lastPlayed'];myDrinkEvent?:{serial:number;at:number};mySocialEvent?:{serial:number;at:number};
  event?:string;activeDecrees:PADecree[];
  handRanks:PARank[];previousRanks:PARank[];myHand?:PACard[];myReady?:boolean;inHand?:boolean;myFinished?:boolean;
  myExchange?:{count:number;original:PACard[];selected?:PACard[]};
  myPendingDrinks?:string[];canSocial?:boolean;socialRequirement?:{rank:string;count:number};canPlay?:boolean;isPresident?:boolean;
  vote?:{proposals:PADecreeAction[];votesCast:number;myVote?:number;deadline:number;tieIndices?:number[]};
  presidencies:Record<string,number>;longestStreak:Record<string,number>;names:Record<string,string>;decreeActionsRemaining:number;
  /** Current/last hand and all-time public gameplay counters, keyed by player ID. */
  handStats:Record<string,PAPlayerStats>;playerStats:Record<string,PAPlayerStats>;
}
export const PA_DEFAULT_SETTINGS:PASettings={mode:'president',turnSeconds:30,exchangeSeconds:30,decreeSeconds:30,voteSeconds:30,graceSeconds:30,consecutiveForDecree:2,openingCard:'4C',social:false,termDuration:3,termSelfExpires:false,botCount:0};
export const PA_DECREE_NAMES:Record<PADecreeKey,string>={unequal_burden:'Unequal Burden',rank_seating:'Royal Seating Arrangement',reverse_deal:'Reverse the Deal',reverse_play:'Reverse the Table',double_trouble:'Double Trouble',card_exchange:'Card Exchange',democracy:'Democracy',term_limits:'Term Limits',max_active:'Maximum Active Decrees',drink_twos:'2 = Drink',require_ack:'Require Acknowledgment'};
