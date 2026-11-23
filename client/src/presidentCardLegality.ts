import type {PACard,PAPublic} from '../../shared/president';
export type PAPlayRule=NonNullable<PAPublic['playRule']>;
const RANKS=['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const rank=(card:PACard)=>card.slice(0,-1);

/**
 * Candidate cards are evaluated by whether they can belong to at least one
 * *entire* legal combination. A lone card in an incomplete pair isn't useful.
 */
export function playableCardRanks(hand:readonly PACard[],rule:PAPlayRule|undefined,socialRequirement:{rank:string;count:number}|undefined):Set<string>{
 const allowed=new Set<string>();
 if(!rule)return allowed;
 for(const value of RANKS){
  const matching=hand.filter(c=>rank(c)===value);
  if(!matching.length)continue;
  if(rule.openingCard){
   if(value===rank(rule.openingCard)&&hand.includes(rule.openingCard))allowed.add(value);
   continue;
  }
  if(rule.empty){allowed.add(value);continue;}
  const four=matching.length===4;
  const two=value==='2';
  const doubleTrouble=rule.doubleTrouble&&value==='3'&&matching.length>=2;
  const enough=matching.length>=rule.count&&RANKS.indexOf(value)>=RANKS.indexOf(rule.rank??'3');
  const social=!!socialRequirement&&socialRequirement.rank===value&&matching.length>=socialRequirement.count;
  if(four||two||doubleTrouble||enough||social)allowed.add(value);
 }
 return allowed;
}

/** Server-like validation for an entire selection. Buttons remain disabled
 * until the selected combination can actually be submitted.
 */
export function validPresidentSelection(
 selected:readonly PACard[],hand:readonly PACard[],
 rule:PAPlayRule|undefined,socialRequirement:{rank:string;count:number}|undefined,
 canPlay:boolean,canSocial:boolean
):boolean{
 if(!selected.length||selected.length>4||!rule)return false;
 if(new Set(selected).size!==selected.length||selected.some(c=>!hand.includes(c)))return false;
 const value=rank(selected[0]);
 if(!selected.every(c=>rank(c)===value))return false;
 const isRunCompletion=!!socialRequirement&&socialRequirement.rank===value&&selected.length===socialRequirement.count;
 if(!canPlay)return Boolean(canSocial&&isRunCompletion);
 if(rule.openingCard)return selected.includes(rule.openingCard);
 if(rule.empty)return true;
 if(selected.length===4||value==='2')return true;
 if(rule.doubleTrouble&&value==='3'&&selected.length===2)return true;
 if(isRunCompletion)return true;
 return selected.length===rule.count&&RANKS.indexOf(value)>=RANKS.indexOf(rule.rank??'3');
}
