import type {PADecreeAction,PADecreeKey,PASettings} from '../../shared/president';

const descriptions:Record<PADecreeKey,string>={
 unequal_burden:'If a deal leaves extra cards, give them to lower-ranked players first, instead of distributing the leftovers normally.',
 rank_seating:'Arrange the seats by the previous hand’s finishing order before the next hand: President, Vice President, other players, Secretary, then Janitor/Asshole.',
 reverse_deal:'Deal cards in the opposite direction. This changes dealing only, not the direction of turns.',
 reverse_play:'Reverse the direction of turns around the table, without changing the direction of the deal.',
 double_trouble:'Playing exactly two 3s together automatically clears the pile, just like other special clears.',
 card_exchange:'Before the next hand, higher-ranked and lower-ranked players exchange cards. Level 1 exchanges one card per paired seat; Level 2 exchanges two. The President chooses their original cards to return.',
 democracy:'Instead of deciding alone, the President nominates two or three eligible decree changes and the table votes. Ties are resolved by the President.',
 term_limits:'Apply an expiration countdown to decrees, including decrees already active. Each expires after the host-set number of complete hands. Existing countdowns keep running even if Term Limits ends.',
 max_active:'Set the maximum number of active decrees (1–10). This decree counts toward the limit. Lowering the limit does not remove existing decrees.',
 drink_twos:'In Asshole mode, playing one or more 2s gives each other active player a drink notification. The person playing the 2 is exempt.',
 require_ack:'In Asshole mode, affected players briefly cannot take actions while their drink notification is displayed; controls unlock automatically when the cue ends.'
};
/** Text is descriptive only; the server always validates actual decree actions. */
export function decreeActionDescription(action:PADecreeAction,settings:PASettings,activeLevel?:number){
 const base=descriptions[action.key];
 if(action.kind==='repeal'){
  if(action.key==='card_exchange'&&activeLevel===2)return base+' Selecting this reduces Card Exchange from Level 2 to Level 1.';
  return base+' Selecting this removes the decree for subsequent hands.';
 }
 if(action.key==='card_exchange')return base+` Selecting this sets Level ${(activeLevel??0)+1}.`;
 if(action.key==='max_active')return base+` The selected limit will be ${action.value} active decree${action.value===1?'':'s'}.`;
 if(action.key==='term_limits')return base+` Duration: ${settings.termDuration} complete hands. Term Limits itself ${settings.termSelfExpires?'can expire':'does not expire'} under this rule.`;
 return base;
}
