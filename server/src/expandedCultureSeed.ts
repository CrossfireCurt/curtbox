import type {Rating, SourceInfo, SurveyQuestion} from '../../shared/types.js';

/**
 * Additional directly reported, primary-publisher culture and behavior findings.
 * The paraphrased questions are original Curtbox prompts, not original questionnaire transcripts.
 * All answers are whole percentages explicitly reported by the linked sources.
 * Do not change IDs or meanings after deployment; publish a new version if editing.
 */
interface SourceArticle {
  year:number; url:string; fieldDates:string; sampleSize?:number; method:string;
}
const sources:Record<string,SourceArticle> = {
  toilet: {year:2022,url:'https://yougov.com/en-us/articles/45245-toilet-talk-polling-americans-potty-preferences',fieldDates:'Aug 4–7 and Sep 14–19, 2022 (two separate surveys)',sampleSize:2000,method:'Two YouGov opt-in-panel surveys of 1,000 U.S. adult citizens each; sample matching and demographic weighting.'},
  dream: {year:2022,url:'https://yougov.com/en-us/articles/44813-what-do-americans-dream-about-yougov-poll',fieldDates:'Oct 13–16, 2022',sampleSize:1000,method:'YouGov opt-in panel of U.S. adult citizens; sample matching and demographic weighting; dream-type questions presented in random subsets.'},
  awkward: {year:2022,url:'https://yougov.com/en-us/articles/44123-how-tolerant-are-americans-awkward-situations',fieldDates:'Sep 15–19, 2022',sampleSize:1000,method:'YouGov online survey of U.S. adult citizens; weighted panel.'},
  wedding: {year:2023,url:'https://yougov.com/en-us/articles/47928-surveying-americans-on-wedding-etiquette',fieldDates:'Nov 6–8, 2023',sampleSize:1000,method:'YouGov opt-in sample-matched U.S. adult citizens; demographic weighting.'},
  prank: {year:2021,url:'https://yougov.com/en-us/articles/34949-are-april-fools-day-pranks-annoying-or-amusing',fieldDates:'Mar 20–21, 2021',sampleSize:3695,method:'Weighted YouGov online poll of U.S. adults.'},
  gossip: {year:2024,url:'https://yougov.com/en-us/articles/50564-majorities-americans-think-gossiping-bad-for-society-harmful-mean-spirited-poll',fieldDates:'Aug 26–30, 2024',sampleSize:1122,method:'YouGov opt-in U.S. adult citizens, weighted to U.S. citizen population.'},
  petlife: {year:2025,url:'https://yougov.com/en-us/articles/51499-most-dog-and-cat-owners-say-their-pets-know-them-well',fieldDates:'Jan 6–10 and Jan 7–10, 2025 (two surveys)',sampleSize:2223,method:'Two weighted YouGov opt-in-panel surveys of U.S. adult citizens; pet questions limited to current dog/cat owners as indicated.'},
  romance: {year:2025,url:'https://yougov.com/en-us/articles/52212-half-americans-say-been-cheated-on-one-third-say-been-the-cheater-relationships-poll',fieldDates:'Apr 18–21, 2025',sampleSize:1125,method:'Weighted YouGov online survey of U.S. adult citizens; some questions restricted to current couples or other specified subgroups.'},
  nude: {year:2025,url:'https://yougov.com/en-us/articles/52876-what-do-americans-think-of-public-nudity',fieldDates:'Aug 19–22, 2025',sampleSize:1083,method:'Weighted YouGov opt-in-panel survey of U.S. adult citizens.'},
  birthday: {year:2022,url:'https://yougov.com/en-us/articles/44982-how-americans-celebrate-their-birthdays',fieldDates:'Nov 23–28, 2022',sampleSize:1000,method:'Weighted YouGov opt-in-panel survey of U.S. adult citizens.'},
  gifting: {year:2017,url:'https://yougov.com/en-us/articles/17378-unwanted-holiday-gifts',fieldDates:'2016–2017 holiday season; precise survey field dates not reported in linked article',method:'YouGov poll of U.S. adults, including a subset who received unwanted holiday gifts.'},
  lying: {year:2017,url:'https://yougov.com/en-us/articles/19438-49-americans-have-lied-their-significant-others-mo',fieldDates:'2017; exact field dates not reported in linked article',method:'YouGov Omnibus survey of U.S. adult respondents; sample details not included in article.'},
  roadtrip: {year:2023,url:'https://yougov.com/en-us/daily-results/20230510-2487c-3',fieldDates:'May 10, 2023',sampleSize:9289,method:'YouGov Daily Question, U.S. adults; published total-results table.'},
  roadsound: {year:2019,url:'https://yougov.com/en-us/articles/23333-summer-road-trip-auto-features-safety',fieldDates:'Apr 29–30, 2019',sampleSize:1216,method:'Nationally representative online YouGov sample of U.S. adults; self-reported road-trip listening habits.'},
  diningout: {year:2024,url:'https://yougov.com/en-us/articles/49191-what-americans-think-about-restaurant-etiquette',fieldDates:'Apr 1–8, 2024',sampleSize:1042,method:'Weighted YouGov opt-in-panel survey of U.S. adult citizens on restaurant etiquette.'},
  airplane: {year:2024,url:'https://yougov.com/en-us/articles/49673-in-flight-drama-where-americans-sit-on-airline-etiquette',fieldDates:'May 23–26, 2024',sampleSize:1152,method:'Weighted YouGov opt-in-panel survey of U.S. adult citizens on airline etiquette.'},
  sleep: {year:2019,url:'https://yougov.com/en-us/articles/22649-sleep-habits-americans-survey-poll',fieldDates:'Mar 1–4, 2019',sampleSize:1288,method:'Online YouGov Omnibus of U.S. adults age 18+.'},
};

// Tuple format: source key, source-reported integer percentage, room content rating, original gameplay prompt.
// The source article supplies the response category and subgroup; prompts preserve those definitions.
type Finding = [string,number,Rating,string];
const findings:Finding[] = [
  // Uncomfortable bathroom behavior. Most are Standard rather than Family.
  ['toilet',57,'standard','What percentage of Americans tell their group they are going to the bathroom instead of sneaking away?'],
  ['toilet',32,'standard','What percentage of Americans feel very uncomfortable pooping in a public restroom when other people are there?'],
  ['toilet',21,'standard','What percentage of Americans usually squat over public toilet seats rather than sitting on them?'],
  ['toilet',9,'standard','What percentage of Americans say they never use public toilets at all?'],
  ['toilet',44,'family','What percentage of Americans have bought something just so a store or restaurant would let them use its bathroom?'],
  ['toilet',32,'family','What percentage of Americans have paid to enter a public bathroom?'],
  ['toilet',45,'standard','What percentage of Americans never chat with strangers while using a public bathroom?'],
  ['toilet',38,'standard','What percentage of Americans say they poop exactly once per day?'],
  ['toilet',44,'standard','What percentage of Americans fold their toilet paper into squares instead of wadding it up?'],
  ['toilet',22,'standard','What percentage of Americans prefer wadding up toilet paper rather than neatly folding it?'],
  ['toilet',70,'family','What percentage of Americans always replace an empty toilet-paper roll immediately when they finish it at home?'],
  ['toilet',57,'family','What percentage of Americans prefer the toilet-paper roll with the loose end hanging over the top?'],
  ['toilet',44,'standard','What percentage of Americans usually flush with the toilet lid up?'],
  ['toilet',27,'standard','What percentage of Americans usually flush with the toilet lid down?'],
  ['toilet',70,'standard','What percentage of Americans say they always wash their hands after peeing?'],
  ['toilet',6,'family','What percentage of Americans have a bidet in their home?'],
  ['toilet',29,'standard','What percentage of Americans often or always look at their phones while sitting on the toilet?'],
  ['toilet',25,'standard','What percentage of Americans say they never use their phone on the toilet?'],
  ['toilet',56,'standard','What percentage of Americans have talked on the phone while using the toilet?'],
  ['toilet',18,'standard','What percentage of Americans have accidentally dropped their phone into the toilet?'],
  ['toilet',65,'standard','What percentage of Americans in serious relationships have peed in front of their partner?'],
  ['toilet',34,'standard','What percentage of Americans in serious relationships have pooped in front of their partner?'],
  ['toilet',70,'standard','What percentage of Americans admit they have peed in the shower?'],
  ['toilet',73,'standard','What percentage of Americans have peed outdoors?'],
  ['toilet',41,'standard','What percentage of Americans say they have pooped outdoors?'],
  ['toilet',63,'standard','What percentage of Americans have clogged their own toilet?'],
  ['toilet',29,'standard','What percentage of Americans have clogged somebody else’s toilet?'],
  ['toilet',27,'standard','What percentage of Americans have clogged a public toilet?'],

  // Bizarre dreams, grounded in the question's ever-experienced denominator.
  ['dream',25,'family','What percentage of Americans usually or always remember their dreams?'],
  ['dream',67,'family','What percentage of Americans have dreamed about being chased by someone or something?'],
  ['dream',62,'standard','What percentage of Americans have dreamed about a former romantic relationship?'],
  ['dream',23,'standard','What percentage of Americans have dreamed they were naked in public?'],
  ['dream',27,'family','What percentage of Americans have had a dream where all their teeth fall out?'],
  ['dream',38,'family','What percentage of Americans believe a dream they had accurately predicted a real future event?'],
  ['dream',33,'family','What percentage of Americans have experienced déjà vu that they thought came from a dream?'],
  ['dream',30,'family','What percentage of Americans have dreamed they suddenly knew all about an unfamiliar subject?'],
  ['dream',26,'family','What percentage of Americans have written down or otherwise recorded their dreams?'],
  ['dream',23,'family','What percentage of Americans have made a real-life decision because of something in a dream?'],
  ['dream',22,'standard','What percentage of Americans say they have died in one of their dreams?'],
  ['dream',33,'standard','What percentage of Americans have experienced sleep paralysis, waking up unable to move or speak?'],

  // Cringe, small talk and awkward social moments.
  ['awkward',26,'family','What percentage of Americans consider themselves more awkward than other people?'],
  ['awkward',15,'family','What percentage of Americans actually like being in socially awkward situations?'],
  ['awkward',29,'family','What percentage of Americans say they like making small talk with people they barely know?'],
  ['awkward',33,'family','What percentage of Americans dislike small talk with people they barely know?'],
  ['awkward',50,'family','What percentage of Americans sometimes cringe remembering embarrassing things they once said or did?'],
  ['awkward',10,'family','What percentage of Americans often feel secondhand embarrassment watching somebody else be awkward?'],
  ['awkward',22,'family','What percentage of Americans typically try to escape when a situation becomes awkward?'],
  ['awkward',19,'family','What percentage of Americans usually crack a joke to cope with an awkward situation?'],
  ['awkward',3,'family','What percentage of Americans say they lean into awkward situations instead of trying to escape them?'],
  ['awkward',37,'family','What percentage of Americans tend to avoid eye contact in an awkward situation?'],
  ['awkward',35,'family','What percentage of Americans rate accidentally texting gossip to its subject as extremely awkward?'],
  ['awkward',32,'family','What percentage of Americans say they enjoy cringe comedy?'],

  // Weddings create excellent lively disagreements.
  ['wedding',80,'family','What percentage of Americans think ignoring a wedding RSVP is usually or always inappropriate?'],
  ['wedding',59,'family','What percentage of Americans think it is inappropriate for a guest to wear white to a wedding?'],
  ['wedding',77,'family','What percentage of Americans disapprove of wedding guests dressing more extravagantly than the couple getting married?'],
  ['wedding',74,'standard','What percentage of Americans think getting drunk as a wedding guest is inappropriate?'],
  ['wedding',74,'family','What percentage of Americans disapprove of a wedding guest giving a speech without the couple’s permission?'],
  ['wedding',72,'family','What percentage of Americans think proposing to your own partner at somebody else’s wedding is inappropriate?'],
  ['wedding',17,'family','What percentage of Americans think it is inappropriate for a wedding couple to request no gifts?'],
  ['wedding',39,'family','What percentage of Americans think it is inappropriate for wedding couples to ask for cash instead of gifts?'],
  ['wedding',78,'family','What percentage of Americans think it is unacceptable for a wedding couple to make guests pay for their meal?'],
  ['wedding',48,'family','What percentage of Americans object to wedding couples making their guests pay for alcohol?'],
  ['wedding',60,'family','What percentage of Americans think wedding vendors charge more than they do for similar non-wedding events?'],
  ['wedding',66,'family','What percentage of Americans believe couples nowadays spend too much money on wedding planning?'],

  // Prank warfare.
  ['prank',45,'family','What percentage of Americans think April Fools’ Day pranks are amusing rather than annoying?'],
  ['prank',47,'family','What percentage of Americans find April Fools’ Day pranks more annoying than funny?'],
  ['prank',46,'family','What percentage of Americans enjoy playing practical jokes on other people?'],
  ['prank',36,'family','What percentage of Americans enjoy being on the receiving end of a practical joke?'],
  ['prank',59,'family','What percentage of Americans dislike having practical jokes played on them?'],

  // People love gossip more than they admit.
  ['gossip',33,'standard','What percentage of Americans think gossip is addictive?'],
  ['gossip',29,'standard','What percentage of Americans consider gossip entertaining?'],
  ['gossip',15,'standard','What percentage of Americans would describe gossiping as fun?'],
  ['gossip',10,'standard','What percentage of Americans consider gossiping harmless?'],
  ['gossip',45,'standard','What percentage of Americans admit to having spread gossip about somebody?'],
  ['gossip',20,'standard','What percentage of Americans who have spread gossip admit they knowingly spread something false?'],
  ['gossip',21,'standard','What percentage of Americans say they enjoy gossiping?'],
  ['gossip',64,'standard','What percentage of Americans have heard a false rumor about themselves?'],
  ['gossip',35,'standard','What percentage of Americans have heard a true rumor about themselves?'],

  // Pet-owner delusions and indulgences, distinct from existing parent/servant questions.
  ['petlife',22,'family','What percentage of dog owners think their dog knows them better than their friends and family do?'],
  ['petlife',17,'family','What percentage of cat owners think their cat knows them better than their friends and family do?'],
  ['petlife',10,'family','What percentage of American dog owners have actually thrown their dog a party?'],
  ['petlife',8,'family','What percentage of American cat owners have thrown their cat a party?'],
  ['petlife',23,'family','What percentage of dog owners would want to use AI to translate what their dog is saying?'],
  ['petlife',21,'family','What percentage of cat owners would want to use AI to translate what their cat is saying?'],
  ['petlife',24,'family','What percentage of dog owners would be interested in getting their dog’s DNA tested?'],
  ['petlife',19,'family','What percentage of cat owners would be interested in getting their cat’s DNA tested?'],

  // Relationships, broken hearts and the occasional admission.
  ['romance',19,'standard','What percentage of American adults have ever been caught up in a love triangle?'],
  ['romance',42,'standard','What percentage of Americans have had an on-again, off-again romantic relationship?'],
  ['romance',38,'standard','What percentage of Americans have gotten back together with an ex-partner?'],
  ['romance',18,'standard','What percentage of Americans have attended couples counseling?'],
  ['romance',69,'family','What percentage of Americans describe themselves as romantic?'],
  ['romance',23,'family','What percentage of Americans say they are very romantic?'],
  ['romance',28,'family','What percentage of Americans who are in relationships say their partner is very romantic?'],
  ['romance',14,'adults','What percentage of Americans say they would definitely or probably consider having an open or polyamorous relationship?'],
  ['romance',9,'adults','What percentage of Americans say they have ever been in an open or polyamorous relationship?'],
  ['romance',25,'adults','What percentage of Americans admit having sexual contact with someone else without their romantic partner’s consent?'],

  // Nudity is an Adults Only category, not a surprise in a family room.
  ['nude',10,'adults','What percentage of Americans say they love being naked?'],
  ['nude',46,'adults','What percentage of Americans think being completely naked in a sauna is acceptable?'],
  ['nude',34,'adults','What percentage of Americans think swimming naked in a natural lake or river is acceptable?'],
  ['nude',8,'adults','What percentage of Americans think getting completely naked at a regular public beach is acceptable?'],
  ['nude',5,'adults','What percentage of Americans think being completely naked in a public park is acceptable?'],
  ['nude',27,'adults','What percentage of Americans think women being topless at a public beach is acceptable?'],
  ['nude',55,'adults','What percentage of Americans say they have been naked or topless in public at least once?'],
  ['nude',26,'adults','What percentage of Americans have ever gone swimming completely naked in a natural body of water?'],
  ['nude',17,'adults','What percentage of Americans have ever been completely naked in their own backyard or garden?'],

  // How people celebrate their special day.
  ['birthday',19,'family','What percentage of Americans say they love their own birthday?'],
  ['birthday',47,'family','What percentage of Americans feel neutral about their birthday rather than excited or unhappy?'],
  ['birthday',11,'family','What percentage of Americans usually feel anxious on their birthday?'],
  ['birthday',63,'family','What percentage of Americans would love or like having somebody throw them a surprise birthday party?'],
  ['birthday',21,'family','What percentage of Americans dislike or hate having Happy Birthday sung to them?'],
  ['birthday',33,'family','What percentage of Americans think parents today put too much effort into their children’s birthdays?'],
  ['birthday',73,'family','What percentage of Americans who share a birthday with a loved one enjoy having that birthday in common?'],

  // Specific post-gift behavior; not duplicates of prior opinions on re-gifting.
  ['gifting',42,'family','What percentage of Americans who received an unwanted holiday gift actually gave that present to someone else?'],
  ['gifting',40,'family','What percentage of Americans who received an unwanted holiday gift returned it for store credit?'],
  ['gifting',30,'family','What percentage of Americans who got an unwanted holiday gift actually threw it in the trash?'],
  ['gifting',19,'family','What percentage of Americans who received an ill-fitting holiday gift threw that item in the garbage?'],

  // Tiny, directly reported admissions.
  ['lying',49,'standard','What percentage of Americans admit they have lied to a significant other more than once?'],
  ['lying',6,'standard','What percentage of Americans admit to telling at least one lie every single day?'],
  ['lying',36,'standard','What percentage of Americans say they lie less often than once a month?'],

  // Travel habits that provoke an immediate preference argument.
  ['roadtrip',59,'family','What percentage of Americans would rather take the scenic route on a road trip than the fastest route?'],
  ['roadsound',82,'family','What percentage of Americans usually listen to music while taking a road trip?'],
  ['roadsound',16,'family','What percentage of Americans usually listen to podcasts while on a road trip?'],

  // More everyday etiquette debates.
  ['diningout',84,'family','What percentage of Americans think arguing with restaurant staff about menu prices is unacceptable?'],
  ['diningout',81,'family','What percentage of American women think taking pictures of your restaurant food is acceptable?'],
  ['diningout',68,'family','What percentage of American men think taking pictures of your restaurant food is acceptable?'],
  ['airplane',56,'family','What percentage of Americans who fly at least yearly think making a phone call during a flight is unacceptable?'],
  ['airplane',32,'family','What percentage of Americans who fly at least yearly think ignoring the airplane safety demonstration is acceptable?'],

  // Sleep: habits that people will debate on game night.
  ['sleep',25,'family','What percentage of Americans say they sleep better with a pet in the bed?'],
  ['sleep',59,'family','What percentage of Americans prefer sleeping on their side rather than their stomach or back?'],
  ['sleep',14,'family','What percentage of Americans prefer sleeping on their stomach?'],
];

export const expandedCultureSeedQuestions:SurveyQuestion[] = findings.map(([article,answer,rating,text],index)=>{
  const record=sources[article];
  if(!record)throw new Error(`Missing source registration: ${article}`);
  const source:SourceInfo={publisher:'YouGov',year:record.year,url:record.url,
    fieldDates:record.fieldDates,geography:'United States',
    population:'U.S. adults / U.S. adult citizens, or the narrower population specified in the question',
    methodology:record.method,
    originalWording:`Original question not transcribed. Publisher-reported measure, rewritten as an original game-show question: ${text}`,
    missingDetails:['Verbatim questionnaire wording was not transcribed; consult linked primary report or toplines.']};
  if(record.sampleSize!==undefined)source.sampleSize=record.sampleSize;
  else source.missingDetails?.push('Exact survey sample size not reported in linked article.');
  return {id:`curtbox-culture-expanded-${String(index+1).padStart(4,'0')}`,
    version:1,type:'percentage',rating,text,answer,topic:article,source};
});

export const EXPANDED_CULTURE_SEED_TOTAL=expandedCultureSeedQuestions.length;
