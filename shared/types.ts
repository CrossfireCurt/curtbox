export type Role = 'host' | 'player';
import type {PASettings, PAState, PAPublic} from './president.js';
export type GameId = 'survey-show' | 'president-asshole';
export type Rating = 'family' | 'standard' | 'adults';
export type Pace = 'fast' | 'normal' | 'relaxed';
export type FinaleMode = 'top3' | 'rank' | 'showdown';
export type QuestionType = 'percentage' | 'top3' | 'rank';
export type Status = 'setup' | 'lobby' | 'countdown' | 'playing' | 'resultsReveal' | 'results';
export type Phase = 'guess' | 'predict' | 'predictReveal' | 'answerReveal' | 'scoreReveal' | 'finaleInput' | 'finaleReveal' | 'finaleScore';
export type Choice = 'higher' | 'lower' | 'muchHigher' | 'muchLower';
export interface SourceInfo { publisher: string; year: number; url?: string; originalWording: string; population?: string; geography?: string; fieldDates?: string; methodology?: string; sampleSize?: number; missingDetails?: string[]; }
export interface SurveyOption { id: string; label: string; percent: number }
export interface SurveyQuestion { id: string; version: number; type: QuestionType; rating: Rating; text: string; topic: string; source: SourceInfo; answer?: number; options?: SurveyOption[]; demo?: boolean; }
export interface Settings { rating: Rating; pace: Pace; finale: FinaleMode }
export interface Participant { id: string; token: string; name: string; role: Role; avatar?: string; joinedAt: number; online: boolean; disconnectedAt?: number; requestedAt?: number; granted: boolean; joinedMatch?: boolean; }
export interface PlayerPrediction { playerId: string; choice: Choice }
export interface ScoreExplanation { verdict: string; calculation: string; parts: {label:string;value:string}[]; comparison?:{guess:number;actual:number}; }
export interface TurnRevealEntry { playerId:string; name:string; avatar?:string; isGuesser:boolean; guess?:number; choice?:Choice; answerLabel?:string; points:number; explanation?:ScoreExplanation; }
export interface TurnOutcome { playerId: string; questionId: string; questionText: string; guessed?: number; actual: number; error?: number; guessPoints: number; predictionPoints: Record<string, number>; }
export interface MatchRecord { id: string; finishedAt: number; rankings: {id: string; name: string; score: number; rank: number; avatar?: string}[]; highlights: Highlight[]; }
export interface Highlight { label: string; playerName: string; detail: string }
export interface GameState {
  id: string; playerIds: string[]; pool: SurveyQuestion[]; usedIds: string[];
  status: 'regular' | 'finale' | 'finished'; round: number; turnOrder: string[]; turnIndex: number;
  phase: Phase; phaseStartedAt: number; phaseEndsAt: number;
  question?: SurveyQuestion; guessDraft?: number; guessSubmitted?: number; guess?: number;
  predictions: Record<string, Choice>; lockedPredictions: Record<string, Choice>;
  finaleDrafts: Record<string, number | string[]>; finaleSubmitted?: Record<string, number>;
  scores: Record<string, number>; lastPoints: Record<string, number>;
  turnRevealOrder?: string[]; turnRevealStep?: number; pendingTurnPoints?: Record<string,number>; pendingTurnOutcome?: TurnOutcome;
  turns: TurnOutcome[]; standingsHistory: Record<string, number>[]; departedPlayerIds:string[]; playerNames:Record<string,string>; playerAvatars:Record<string,string>;
  finalRanks?: {id:string; name:string; score:number; rank:number; avatar?:string}[];
  highlights?: Highlight[]; revealStep?: number; finalePoints?: Record<string, number>;
}
export interface RoomState {
  code: string; gameId: GameId; creatorId: string; primaryId?: string; authorityId?: string;
  status: Status; settings: Settings; participants: Participant[];
  countdownEndsAt?: number; game?: GameState; matchHistory: MatchRecord[];
  allOfflineSince?: number; createdAt: number; updatedAt: number;
  reactionLastAt: Record<string, number>; questionHistory: string[]; paSettings?:PASettings; pa?:PAState;
}
export interface PublicPlayer { id:string; name:string; role:Role; avatar?:string; online:boolean; score:number; presentation:boolean; }
export interface QuestionPublic {id:string; type:QuestionType; text:string; options?:{id:string;label:string}[]; demo?:boolean; }
export interface PublicGame {
  id:string; round:number; totalTurns:number; turnIndex:number; phase:Phase; phaseStartedAt:number; phaseEndsAt:number;
  question?: QuestionPublic; currentPlayerId?:string; publicGuess?:number; finalMode: FinaleMode;
  predictionCounts?:Partial<Record<Choice,number>>; predictionsRevealed?:PlayerPrediction[];
  actual?:number; source?:SourceInfo; correctOptions?:SurveyOption[];
  scores:Record<string,number>; lastPoints:Record<string,number>;
  revealEntries?: TurnRevealEntry[]; revealRoster?: {playerId:string;name:string;avatar?:string;isGuesser:boolean}[]; revealStepInTurn?: number; revealTotalInTurn?: number;
  myDraft?:number|string[]; myPrediction?:Choice; mySubmitted:boolean; mySubmittedValue?:number;
  rankResults?:{playerId:string; points:number}[]; finaleResults?:Record<string,number>;
  finalRanks?:{id:string;name:string;score:number;rank:number;avatar?:string}[];
  highlights?:Highlight[]; revealStep?:number;
}
export interface RoomView {
  code:string; gameId:GameId; status:Status; settings:Settings; participants:PublicPlayer[]; primaryId?:string;
  me: {id:string;name:string;role:Role;avatar?:string;creator:boolean;primary:boolean;authority:boolean;hostWaiting:boolean;queuePosition?:number};
  countdownEndsAt?:number; game?:PublicGame; lastMatch?:MatchRecord;
  serverNow:number; presentationLimit:number; paSettings?:PASettings; pa?:PAPublic;
}
export interface Ack {ok:boolean;error?:string;code?:string;id?:string;token?:string}
export interface Reaction {id:string;label:string;emoji:string;rating:Rating;sound:string}
export const AVATARS = ['🦊','🐸','🐙','🦖','🦄','🐼','🐯','🐻','🐲','🦀','🐧','🦉','👾','🤖','👻','🍕','🌵','🍄','🥑','🛸'];
export const REACTIONS:Reaction[] = [
  {id:'crickets',label:'Crickets',emoji:'🦗',rating:'family',sound:'crickets'},
  {id:'highfive',label:'High Five',emoji:'🙌',rating:'family',sound:'highfive'},
  {id:'aww',label:'Aww',emoji:'🥹',rating:'family',sound:'aww'},
  {id:'mindblown',label:'Mind Blown',emoji:'🤯',rating:'family',sound:'mindblown'},
  {id:'thinking',label:'Hmm',emoji:'🤔',rating:'family',sound:'thinking'},
  {id:'womp',label:'Womp Womp',emoji:'🎺',rating:'family',sound:'womp'},
  {id:'wrong',label:'Wrong!',emoji:'🚨',rating:'family',sound:'wrong'},
  {id:'nailed',label:'Nailed It',emoji:'🎯',rating:'family',sound:'nailed'},
  {id:'applause',label:'Applause',emoji:'👏',rating:'family',sound:'applause'},
  {id:'awkward',label:'Awkward',emoji:'😬',rating:'family',sound:'awkward'},
  {id:'oooh',label:'Ooooh',emoji:'👀',rating:'family',sound:'oooh'},
  {id:'celebrate',label:'Celebrate',emoji:'🎉',rating:'family',sound:'celebrate'},
  {id:'drumroll',label:'Drumroll',emoji:'🥁',rating:'family',sound:'drumroll'},
  {id:'goat',label:'GOAT',emoji:'🐐',rating:'family',sound:'goat'},
  {id:'facepalm',label:'Facepalm',emoji:'🤦',rating:'family',sound:'facepalm'},
  {id:'poop',label:'Poop',emoji:'💩',rating:'standard',sound:'poop'},
  {id:'barf',label:'Barf',emoji:'🤮',rating:'standard',sound:'barf'},
  {id:'burp',label:'Burp',emoji:'🤢',rating:'standard',sound:'burp'},
  {id:'woozy',label:'Woozy',emoji:'🥴',rating:'standard',sound:'woozy'},
  {id:'finger',label:'Middle Finger',emoji:'🖕',rating:'adults',sound:'finger'},
  {id:'wtf',label:'WTF',emoji:'🤬',rating:'adults',sound:'wtf'},
  {id:'bullshit',label:'Bullshit',emoji:'💀',rating:'adults',sound:'bullshit'}
];
export const RATINGS:Rating[]=['family','standard','adults'];
export const allowedRating=(room:Rating, item:Rating)=> RATINGS.indexOf(item)<=RATINGS.indexOf(room);
