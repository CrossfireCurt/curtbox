import {useEffect,useState} from 'react';
import {ConnectionName} from './ConnectionName';
import {usePresidentSounds} from './presidentAudio';
import {toggleCardSelection,availableCardSelection,presidentPlayButtonMode} from './presidentSelection';
import {playableCardRanks,validPresidentSelection} from './presidentCardLegality';
import type {RoomView} from '../../shared/types';
import type {PACard,PADecreeAction,PADecreeKey,PASettings,PAPublic,PAPlayerStats} from '../../shared/president';
import {PA_DECREE_NAMES} from '../../shared/president';

type Props={view:RoomView;now:number;offset:number;onAction:(action:string,data?:unknown)=>Promise<unknown>};
const RANK=['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const suit=(card:PACard)=>({S:'♠',H:'♥',D:'♦',C:'♣'}[card.slice(-1)]??'?');
const isRed=(c:PACard)=>['H','D'].includes(c.slice(-1));
const label=(c:PACard)=>`${c.slice(0,-1)}${suit(c)}`;
const byRank=(a:PACard,b:PACard)=>RANK.indexOf(a.slice(0,-1))-RANK.indexOf(b.slice(0,-1));
function Card({card,selected=false,disabled=false,onClick}:{card:PACard;selected?:boolean;disabled?:boolean;onClick?:()=>void}){
 return <button type="button" className={`pa-card ${isRed(card)?'pa-red':''} ${selected?'pa-selected':''}`} disabled={disabled} onClick={onClick} aria-pressed={selected} aria-label={`${card.slice(0,-1)} of ${card.endsWith('C')?'clubs':card.endsWith('S')?'spades':card.endsWith('H')?'hearts':'diamonds'}`}><span>{label(card)}</span><b>{suit(card)}</b></button>;
}
function formatLeft(ends:number|undefined,now:number,offset:number){return ends===undefined?'':`${Math.max(0,Math.ceil((ends-now+offset)/1000))}s`;}
function rankTitle(pos:number,n:number,asshole:boolean){if(pos===1)return 'President';if(pos===2)return 'Vice President';if(pos===n-1)return 'Secretary';if(pos===n)return asshole?'Asshole':'Janitor';return 'Citizen';}
export function rankIcon(pos:number,n:number,asshole:boolean){if(pos===1)return '🇺🇸';if(pos===2)return '👨‍💼';if(pos===n-1)return '🖥️';if(pos===n)return asshole?'💩':'🧹';return '🧑';}
const statLabels:{key:keyof PAPlayerStats;label:string}[]=[
 {key:'cardsPlayed',label:'Cards played'},
 {key:'pilesCleared',label:'Piles cleared'},
 {key:'socials',label:'Socials'},
 {key:'twosPlayed',label:'2s played'},
 {key:'passes',label:'Passes'}
];
/** One shared results component for the public board and all player phones. */
function HandResults({game,asshole}:{game:PAPublic;asshole:boolean}){
 if(!game.handRanks.length)return null;
 const n=game.handRanks.length;
 const ranked=new Set(game.handRanks.map(p=>p.id));
 const newcomers=game.seats.filter(p=>!ranked.has(p.id));
 return <div className="pa-hand-results" aria-label="Last hand results">
  {game.handRanks.map(p=>{
   const seat=game.seats.find(s=>s.id===p.id);
   const stats=game.handStats[p.id];
   return <div className={'pa-result-row'+(p.position===1?' is-president':'')} key={p.id}>
    <div className="pa-result-heading">
     <strong className="pa-result-title">{rankTitle(p.position,n,asshole)}</strong>
     <span className="pa-result-name"><ConnectionName name={p.name} offline={!!seat&&!seat.online} bot={!!seat?.bot}/>{seat?.bot?' 🤖':''}{!seat?' · Left table':''}</span>
    </div>
    <div className="pa-result-stats">
     {statLabels.map(({key,label})=><span className="pa-result-stat" key={key}>{label}: <b>{stats?.[key]??0}</b></span>)}
     <span className="pa-result-stat">Presidencies: <b>{game.presidencies[p.id]??0}</b></span>
     <span className="pa-result-stat">Best streak: <b>{game.longestStreak[p.id]??0}</b></span>
    </div>
   </div>;
  })}
  {newcomers.map(p=><div className="pa-result-row pa-result-newcomer" key={p.id}><div className="pa-result-heading"><strong className="pa-result-title">Unranked</strong><span className="pa-result-name"><ConnectionName name={p.name} offline={!p.online} bot={p.bot}/> · Joining next hand</span></div></div>)}
 </div>;
}
const allKeys=Object.keys(PA_DECREE_NAMES) as PADecreeKey[];
function availableChanges(view:RoomView):PADecreeAction[]{
 const active=view.pa?.activeDecrees??[];const found=(k:PADecreeKey)=>active.find(d=>d.key===k);
 const cap=found('max_active')?.value??Infinity;
 const options:PADecreeAction[]=[];
 for(const key of allKeys){const existing=found(key);
  if(existing){options.push({kind:'repeal',key});if(key==='card_exchange'&&existing.value===1)options.push({kind:'enact',key});if(key==='max_active')for(const value of [1,2,3,4,5,6,7,8,9,10])if(value!==existing.value)options.push({kind:'enact',key,value});}
  else if(active.length<cap){if(key==='max_active')for(const value of [1,2,3,4,5,6,7,8,9,10])options.push({kind:'enact',key,value});else options.push({kind:'enact',key});}
 }
 return options;
}
function actionLabel(a:PADecreeAction){const prefix=a.kind==='repeal'?'Repeal / reduce':'Enact / increase';return `${prefix} ${PA_DECREE_NAMES[a.key]}${a.value!==undefined?` (${a.value})`:''}`;}

export function PASettingsEditor({settings,onChange}:{settings:PASettings;onChange:(v:Partial<PASettings>)=>void}){
 const numberField=(key:keyof PASettings,title:string,min:number,max:number)=><label className="field-label" key={key}>{title}<input type="number" min={min} max={max} value={(settings[key] as number)??0} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=min&&n<=max)onChange({[key]:n});}}/></label>;
 return <div className="settings-fields pa-settings">
  <label className="field-label">Game mode<select value={settings.mode} onChange={e=>onChange({mode:e.target.value as PASettings['mode']})}><option value="president">President — family-friendly</option><option value="asshole">Asshole — drinking enabled</option></select></label>
  {numberField('botCount','Computer opponents (bots, 0–7)',0,7)}
  <p className="helper">Bots count toward the 4–8 seats. At least one human player must join. Bots ready up automatically and play without a phone.</p>
  <label className="checkbox-row"><input type="checkbox" checked={settings.social} onChange={e=>onChange({social:e.target.checked})}/> Enable Social interruptions</label>
  <label className="checkbox-row"><input type="checkbox" checked={settings.termSelfExpires} onChange={e=>onChange({termSelfExpires:e.target.checked})}/> Term Limits may expire itself</label>
  {numberField('turnSeconds','Turn timer (seconds)',1,300)}
  {numberField('exchangeSeconds','Exchange timer (seconds)',1,300)}
  {numberField('decreeSeconds','Presidential decision timer (seconds)',1,300)}
  {numberField('voteSeconds','Democracy vote timer (seconds)',1,300)}
  {numberField('graceSeconds','Reconnection grace (seconds)',1,300)}
  {numberField('consecutiveForDecree','Consecutive presidencies to unlock decrees',1,20)}
  {numberField('termDuration','Term Limits duration (complete hands)',1,100)}
  <label className="field-label">First-hand opening card<select value={settings.openingCard} onChange={e=>onChange({openingCard:e.target.value})}>{RANK.flatMap(r=>['C','D','H','S'].map(s=><option key={`${r}${s}`} value={`${r}${s}`}>{label(`${r}${s}`)}</option>))}</select></label>
 </div>;
}

export function PresidentAsshole({view,now,offset,onAction}:Props){
 const game=view.pa,s=view.paSettings;
 const sounds=usePresidentSounds(view,now,offset);
 const vote=game?.vote;
 const [selected,setSelected]=useState<PACard[]>([]);
 const [nominees,setNominees]=useState<string[]>([]);
 const [lastSerial,setLastSerial]=useState<number|undefined>();
 useEffect(()=>{setSelected([]);},[view.me.id,game?.handNumber,game?.stage]);
 useEffect(()=>{setNominees([]);},[game?.handNumber,game?.stage]);
 useEffect(()=>{if(game?.lastClear?.serial!==lastSerial)setLastSerial(game?.lastClear?.serial);},[game?.lastClear?.serial]);
 if(!game||!s)return <div className="panel">Loading President / Asshole…</div>;
 const host=view.me.role==='host';const pending=game.myPendingDrinks??[];
 const blocked=pending.length>0&&game.activeDecrees.some(d=>d.key==='require_ack');
 const availableCards=game.stage==='exchange'?(game.myExchange?.original??[]):(game.myHand??[]);
 const selections=availableCardSelection(selected,availableCards);
 const playButton=presidentPlayButtonMode(selections,game.socialRequirement,!!game.canPlay,!!game.canSocial);
 const selectableRanks=playableCardRanks(game.myHand??[],game.playRule,game.socialRequirement);
 const canSubmit=validPresidentSelection(selections,game.myHand??[],game.playRule,game.socialRequirement,!!game.canPlay,!!game.canSocial);
 const passOnly=!!game.canPlay&&!game.myFinished&&selectableRanks.size===0&&!!game.playRule&&!game.playRule.empty;
 const toggle=(c:PACard)=>setSelected(a=>toggleCardSelection(availableCardSelection(a,availableCards),c,game.stage==='exchange'?'exchange':'play'));
 // Waiting players may preselect while another seat is taking its turn.
 const choose=async(social=false)=>{const action=game.stage==='exchange'?'president:exchange':'president:play';const result=await onAction(action,{cards:selections,social});if(result)setSelected([]);};
 const options=availableChanges(view).filter(a=>s.mode==='asshole'||a.kind==='repeal'||!['drink_twos','require_ack'].includes(a.key));const optionKey=(a:PADecreeAction)=>JSON.stringify(a);
 const activeCount=game.seats.filter(x=>x.online).length;
 const rankCount=game.previousRanks.length;
 const roomCode=view.code;
 const pileGroups=[...(game.pilePlays??[])].reverse(); // newest play first
 const pileType=({1:'Single',2:'Pair',3:'Triple',4:'Four-of-a-kind'} as Record<number,string>)[pileGroups[0]?.cards.length??0]??'New lead';
 const clearedHistory=[...(game.pileHistory??[])].reverse();
 const recentClear=game.lastClear&&now-offset>=game.lastClear.at-500&&now-offset<game.lastClear.at+2400?game.lastClear:undefined;
 // The server owns skipped-player identity and timestamp; repeated room:view
 // snapshots do not restart the short animation.
 const activeSkip=game.stage==='play'&&game.lastSkip
  &&now-offset>=game.lastSkip.at-500&&now-offset<game.lastSkip.at+2200
  ?game.lastSkip:undefined;
 const scoreboard=[...Object.entries(game.presidencies)].sort((a,b)=>b[1]-a[1]||(game.longestStreak[b[0]]??0)-(game.longestStreak[a[0]]??0));
 return host?<section className="pa-stage" aria-label="President / Asshole public presentation">
  <div className="pa-stage-head"><div><div className="section-kicker">{s.mode==='asshole'?'ASSHOLE':'PRESIDENT'} · HAND {game.handNumber||'—'}</div><h1>{game.stage==='ready'?'Ready for the next hand':game.stage==='exchange'?'Card exchange':game.stage==='decree'?'Presidential decrees':game.stage==='vote'?'Democracy in session':game.stage==='ended'?'Game ended':'Cards on the table'}</h1></div><div className="pa-clock">{formatLeft(game.stage==='play'?game.turnEndsAt:game.stageEndsAt,now,offset)}</div><button type="button" className="btn btn-small pa-sound-toggle" onClick={sounds.toggle} aria-pressed={sounds.enabled}>{sounds.enabled?'🔊 Sounds on':'🔇 Sounds off'}</button></div>
  <div className="pa-stage-columns"><div className="pa-table"><div className="pa-table-ring">
   <div className="pa-people" aria-label="Players arranged around the pile">
    {game.seats.map((p,i)=>{
     const angle=2*Math.PI*i/Math.max(1,game.seats.length)-Math.PI/2;
     const seatStyle={left:`${50+40*Math.cos(angle)}%`,top:`${50+39*Math.sin(angle)}%`};
     const finish=p.finishedPosition;
     const finishedRank=finish?rankTitle(finish,game.handPlayerCount,s.mode==='asshole'):undefined;
     return <div className={'pa-seat'+(game.currentPlayerId===p.id?' active':'')+(finish?' finished':'')} key={p.id} style={seatStyle}>
      <div className="pa-seat-identity">
       <strong><ConnectionName name={p.name} offline={!p.online} bot={p.bot}/>{p.bot&&<span className="pa-bot-icon" role="img" aria-label="Bot" title="Bot">🤖</span>}</strong>
       {p.position&&!finish&&<small>{rankTitle(p.position,rankCount,s.mode==='asshole')}</small>}
      </div>
      {finish?<div className="pa-seat-finished" aria-label={`Finished: ${finishedRank}`}>
       <span className="pa-seat-rank-icon" role="img" aria-label={finishedRank}>{rankIcon(finish,game.handPlayerCount,s.mode==='asshole')}</span>
       <small>{finishedRank}</small>
      </div>:<span className="pa-seat-count">{game.stage==='ready'?(p.ready?'✓ Ready':'Waiting'):p.nextHand?'Next hand':`${p.cards} cards`}</span>}
      {game.stage==='play'&&game.currentPlayerId===p.id&&game.turnEndsAt!==undefined&&<span className={'pa-seat-timer'+(game.turnEndsAt-now+offset<=5000?' is-low':'')} role="timer" aria-label="Time left on current player's turn">⏱ {formatLeft(game.turnEndsAt,now,offset)}</span>}
      {activeSkip?.skipped===p.id&&<span key={activeSkip.serial} className="pa-skipped-seat" role="status">SKIPPED</span>}
     </div>;
    })}
   </div>
   <div className="pa-table-center"><div className="section-kicker">{game.stage==='play'?'CURRENT PILE':game.stage==='exchange'?'WAITING ON EXCHANGES':game.stage==='ready'?`${activeCount} / 8 PLAYERS`:'PRESIDENTIAL SESSION'}</div>
    {game.stage==='play'?<><div className="pa-pile-type" role="status" aria-live="polite"><span>CURRENT COMBINATION</span><strong>{pileType.toUpperCase()}</strong><small>{pileGroups.length?`${pileGroups[0].cards.length} CARD${pileGroups[0].cards.length===1?'':'S'} PER PLAY`:'NEW LEAD — ANY COMBINATION'}</small></div><div className="pa-pile" role="group" aria-label="Current pile, latest play first">
      {pileGroups.length?pileGroups.map((play,i)=><div className={'pa-play-group'+(i===0?' latest':'')} key={play.serial+'-'+i}><small>{i===0?'LATEST PLAY':'EARLIER PLAY'}{play.by?' · '+(game.names[play.by]??'Player'):''}</small><div className="pa-pile-cards">{play.cards.map(c=><span className={`pa-face ${isRed(c)?'pa-red':''}`} key={c}>{label(c)}</span>)}</div></div>):<div className="pa-pile-empty">Empty pile · new lead</div>}
    </div><div className="pa-caption">{game.currentPlayerId?`${game.seats.find(p=>p.id===game.currentPlayerId)?.name??'Player'}'s turn`:''}</div>{recentClear&&<div key={recentClear.serial} className="pa-clear-notice">{recentClear.reason} — pile cleared</div>}</>:<p className="pa-wait-message">{game.event??'Waiting for players'}</p>}
   </div></div>
   {game.handRanks.length>0&&<div className="pa-ranking"><h2>Last hand</h2><HandResults game={game} asshole={s.mode==='asshole'}/></div>}
  </div><aside className="pa-aside"><div className="panel"><div className="section-kicker">ROOM CODE</div><h2>{roomCode}</h2><p>Join on your phone to play. {s.botCount>0?`${s.botCount} bot${s.botCount===1?'':'s'} at this table.`:''}</p></div><div className="panel pa-pile-history"><div className="section-kicker">PILE HISTORY</div><h3>Cleared this hand</h3>{clearedHistory.length?<ol className="pa-history-list">{clearedHistory.map(entry=><li key={entry.serial}><strong>{game.names[entry.by]??'Player'} cleared</strong><small>{entry.reason} · {entry.cards.length} cards</small><div className="pa-history-cards">{entry.cards.map((c,i)=><span className={`pa-history-card ${isRed(c)?'pa-red':''}`} key={c+'-'+i}>{label(c)}</span>)}</div></li>)}</ol>:<p className="helper">No piles cleared yet.</p>}</div><div className="panel"><h3>Presidencies</h3>{scoreboard.length?scoreboard.map(([id,n])=><div className="pa-score" key={id}><span><ConnectionName name={game.names[id]??id.slice(0,6)} offline={game.seats.some(s=>s.id===id&&!s.online)} bot={game.seats.some(s=>s.id===id&&s.bot)}/></span><strong>{n}</strong></div>):<p>Scores appear after the first hand.</p>}</div><div className="panel"><h3>Active decrees</h3>{game.activeDecrees.length?game.activeDecrees.map(d=><div className="pa-decree" key={d.key}>{PA_DECREE_NAMES[d.key]} {d.value??''}{d.expiresBefore!==undefined?<small>expires before hand {d.expiresBefore}</small>:null}</div>):<p>No decrees in effect.</p>}</div></aside></div>
 </section>:<section className="pa-phone">
  <button type="button" className="btn btn-small pa-sound-toggle" onClick={sounds.toggle} aria-pressed={sounds.enabled}>{sounds.enabled?'🔊 Sounds on':'🔇 Sounds off'}</button>
  {activeSkip?.skipped===view.me.id&&<div key={activeSkip.serial} className="pa-skipped-phone" role="status">⏭ SKIPPED — your turn was bypassed</div>}
  {game.stage==='ended'&&<div className="panel pa-message"><h2>Game ended</h2><p>Final leaderboard is on the host presentation.</p></div>}
  {view.status==='setup'&&<div className="panel pa-message"><h2>Host is setting up the room</h2><p>You can ready up once the lobby is open.</p></div>}
  {view.status!=='setup'&&game.stage==='ready'&&<div className="panel pa-message"><div className="section-kicker">{game.handNumber?`HAND ${game.handNumber} COMPLETE`:'WELCOME TO THE TABLE'}</div><h2>{game.handNumber?'Ready for another hand?':'Ready to play?'}</h2>{game.handRanks.length>0&&<HandResults game={game} asshole={s.mode==='asshole'}/>}<button className={'btn btn-full '+(game.myReady?'':'btn-primary')} onClick={()=>void onAction('president:ready',{ready:!game.myReady})}>{game.myReady?'✓ Ready (tap to cancel)':'Ready up'}</button><p className="helper">All human players must be ready. Bots ready up automatically. At least four combined seats (including one human) are needed.</p>{view.me.primary&&game.seats.filter(p=>p.online).length<4&&game.handNumber>0&&<button className="btn btn-full" onClick={()=>void onAction('president:end')}>End game</button>}</div>}
  {game.stage==='exchange'&&<div className="panel pa-message"><div className="section-kicker">HAND {game.handNumber} · CARD EXCHANGE</div><h2>{game.myExchange?'Choose cards to return':'Card exchange in progress'}</h2>{game.myExchange?<><p>Choose {game.myExchange.count} from your original dealt cards. You cannot return newly received cards.</p>{game.myExchange.selected?<p className="success-line">Exchange confirmed</p>:<><div className="pa-hand">{game.myExchange.original.sort(byRank).map(c=><Card key={c} card={c} selected={selections.includes(c)} onClick={()=>toggle(c)}/>)}</div><button className="btn btn-primary btn-full" disabled={selections.length!==game.myExchange.count} onClick={()=>void choose()}>Confirm exchange</button></>}</>:<p>Waiting for the higher-ranked players to select their returns.</p>}<p className="helper">{formatLeft(game.stageEndsAt,now,offset)} remaining. Unsubmitted returns default to lowest original cards.</p></div>}
  {game.stage==='play'&&!game.inHand&&<div className="panel pa-message"><h2>Waiting for next hand</h2><p>You joined after this hand began. You'll be dealt in after everyone readies for the next hand.</p></div>}
  {game.stage==='play'&&game.inHand&&<div className="panel pa-message"><div className="pa-player-head"><div><div className="section-kicker">HAND {game.handNumber}</div><h2>{game.myFinished?'You finished!':game.canPlay?'Your turn':`Waiting for ${game.seats.find(p=>p.id===game.currentPlayerId)?.name??'player'}`}</h2></div><strong className="countdown-badge">{formatLeft(game.turnEndsAt,now,offset)}</strong></div><p className="helper">Select matching cards from your hand. Current pile is visible on the host screen.</p><div className="pa-hand">{game.myHand?.map(c=><Card key={c} card={c} disabled={blocked||!!game.myFinished||!selectableRanks.has(c.slice(0,-1))} selected={selections.includes(c)} onClick={()=>toggle(c)}/>)}</div>{game.myFinished&&game.myFinishPosition&&<div className="pa-finished-phone" role="status"><span role="img" aria-label="Your finishing rank">{rankIcon(game.myFinishPosition,game.handPlayerCount,s.mode==='asshole')}</span><strong>Finished as {rankTitle(game.myFinishPosition,game.handPlayerCount,s.mode==='asshole')}</strong><small>Rank for this hand</small></div>}
   <div className="pa-actions">
    {!game.myFinished&&(!passOnly||!game.canPlay)&&<button className="btn btn-primary" disabled={blocked||!playButton.enabled||!canSubmit} onClick={()=>void choose(playButton.social)}>{playButton.label} {selections.length?`(${selections.length})`:''}</button>}
    {game.canPlay&&!game.myFinished&&<button className="btn" disabled={blocked} onClick={()=>void onAction('president:pass')}>Pass</button>}
   </div></div>}
  {game.stage==='decree'&&<div className="panel pa-message"><div className="section-kicker">PRESIDENTIAL DECREE</div><h2>{game.isPresident?'Your Presidential decision':'The President is deciding'}</h2>{game.isPresident?<><p>Choose a decree to enact or repeal, or skip the opportunity.</p>{game.activeDecrees.some(d=>d.key==='democracy')?<><p className="helper">Democracy: nominate two or three eligible changes for a vote. A sole eligible proposal is enacted directly.</p><div className="pa-decree-list">{options.map(a=><label className="pa-option" key={optionKey(a)}><input type="checkbox" disabled={!nominees.includes(optionKey(a))&&nominees.length>=3} checked={nominees.includes(optionKey(a))} onChange={e=>setNominees(old=>e.target.checked?[...old,optionKey(a)]:old.filter(x=>x!==optionKey(a)))}/>{actionLabel(a)}</label>)}</div><button className="btn btn-primary btn-full" disabled={nominees.length<(options.length===1?1:2)} onClick={()=>void onAction('president:decree',{nominees:nominees.map(x=>JSON.parse(x) as PADecreeAction)})}>Propose {nominees.length} change{nominees.length===1?'':'s'}</button></>:<div className="pa-decree-list">{options.map(a=><button className="choice-card" key={optionKey(a)} onClick={()=>void onAction('president:decree',{action:a})}>{actionLabel(a)}</button>)}</div>}<button className="btn btn-full" onClick={()=>void onAction('president:decree',{})}>Skip decree</button></>:<p>Waiting for the President.</p>}<p className="helper">{formatLeft(game.stageEndsAt,now,offset)} remaining</p></div>}
  {game.stage==='vote'&&vote&&<div className="panel pa-message"><div className="section-kicker">DEMOCRACY</div><h2>{vote.tieIndices?.length?'President breaks the tie':'Vote on a decree'}</h2><p className="helper">{vote.votesCast} votes submitted · {formatLeft(game.stageEndsAt,now,offset)} remaining</p>{vote.proposals.map((a,i)=><button className="choice-card" key={i} disabled={vote.tieIndices?(!game.isPresident||!vote.tieIndices.includes(i)):vote.myVote!==undefined} onClick={()=>void onAction('president:vote',{index:i})}>{actionLabel(a)}{vote.myVote===i?' ✓':''}</button>)}</div>}
  {pending.length>0&&<div className="panel pa-drink"><h3>Notification</h3>{pending.map((p,i)=><p key={i}>{p}</p>)}<button className="btn btn-primary btn-full" onClick={()=>void onAction('president:ack')}>Acknowledge</button></div>}
 </section>;
}
