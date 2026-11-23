import {useEffect,useState} from 'react';
import {ConnectionName} from './ConnectionName';
import type {RoomView} from '../../shared/types';
import type {PACard,PADecreeAction,PADecreeKey,PASettings} from '../../shared/president';
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
 const vote=game?.vote;
 const [selected,setSelected]=useState<PACard[]>([]);
 const [nominees,setNominees]=useState<string[]>([]);
 const [lastSerial,setLastSerial]=useState<number|undefined>();
 useEffect(()=>{setSelected([]);},[game?.currentPlayerId,game?.handNumber,game?.stage]);
 useEffect(()=>{setNominees([]);},[game?.handNumber,game?.stage]);
 useEffect(()=>{if(game?.lastClear?.serial!==lastSerial)setLastSerial(game?.lastClear?.serial);},[game?.lastClear?.serial]);
 if(!game||!s)return <div className="panel">Loading President / Asshole…</div>;
 const host=view.me.role==='host';const pending=game.myPendingDrinks??[];
 const blocked=pending.length>0&&game.activeDecrees.some(d=>d.key==='require_ack');
 const selections=selected.filter(c=>game.myHand?.includes(c));
 const socialEligible=!!game.canSocial&&!!game.socialRequirement&&selections.length===game.socialRequirement.count&&selections.every(c=>c.slice(0,-1)===game.socialRequirement?.rank);
 const toggle=(c:PACard)=>setSelected(a=>a.includes(c)?a.filter(v=>v!==c):[...a,c]);
 const choose=async(social=false)=>{const action=game.stage==='exchange'?'president:exchange':'president:play';const result=await onAction(action,{cards:selections,social});if(result)setSelected([]);};
 const options=availableChanges(view).filter(a=>s.mode==='asshole'||a.kind==='repeal'||!['drink_twos','require_ack'].includes(a.key));const optionKey=(a:PADecreeAction)=>JSON.stringify(a);
 const activeCount=game.seats.filter(x=>x.online).length;
 const rankCount=game.previousRanks.length;
 const roomCode=view.code;
 // The server owns skipped-player identity and timestamp; repeated room:view
 // snapshots do not restart the short animation.
 const activeSkip=game.stage==='play'&&game.lastSkip
  &&now-offset>=game.lastSkip.at-500&&now-offset<game.lastSkip.at+2200
  ?game.lastSkip:undefined;
 const scoreboard=[...Object.entries(game.presidencies)].sort((a,b)=>b[1]-a[1]||(game.longestStreak[b[0]]??0)-(game.longestStreak[a[0]]??0));
 return host?<section className="pa-stage" aria-label="President / Asshole public presentation">
  <div className="pa-stage-head"><div><div className="section-kicker">{s.mode==='asshole'?'ASSHOLE':'PRESIDENT'} · HAND {game.handNumber||'—'}</div><h1>{game.stage==='ready'?'Ready for the next hand':game.stage==='exchange'?'Card exchange':game.stage==='decree'?'Presidential decrees':game.stage==='vote'?'Democracy in session':game.stage==='ended'?'Game ended':'Cards on the table'}</h1></div><div className="pa-clock">{formatLeft(game.stage==='play'?game.turnEndsAt:game.stageEndsAt,now,offset)}</div></div>
  <div className="pa-stage-columns"><div className="pa-table">
   <div className="pa-people">{game.seats.map(p=><div className={'pa-seat'+(game.currentPlayerId===p.id?' active':'')} key={p.id}><div><strong><ConnectionName name={p.name} offline={!p.online} bot={p.bot}/>{p.bot?' · BOT':''}</strong>{p.position&&<small>{rankTitle(p.position,rankCount,s.mode==='asshole')}</small>}</div><span>{game.stage==='ready'?(p.ready?'✓ Ready':'Waiting'):p.nextHand?'Next hand':`${p.cards} cards`}</span>{activeSkip?.skipped===p.id&&<span key={activeSkip.serial} className="pa-skipped-seat" role="status">SKIPPED</span>}</div>)}</div>
   <div className="pa-table-center"><div className="section-kicker">{game.stage==='play'?'CURRENT PILE':game.stage==='exchange'?'WAITING ON EXCHANGES':game.stage==='ready'?`${activeCount} / 8 PLAYERS`:'PRESIDENTIAL SESSION'}</div>
    {game.stage==='play'?<><div className="pa-pile">{(game.pile??[]).map((c,i)=><span className={`pa-face ${isRed(c)?'pa-red':''}`} style={{transform:`translate(${i*21}px,${i%3*4}px) rotate(${(i%5-2)*3}deg)`}} key={`${i}-${c}`}>{label(c)}</span>)}</div><div className="pa-caption">{game.currentPlayerId?`${game.seats.find(p=>p.id===game.currentPlayerId)?.name??'Player'}'s turn`:''}</div>{game.lastClear&&<div key={game.lastClear.serial} className="pa-clear-notice">{game.lastClear.reason} — pile cleared</div>}</>:<p className="pa-wait-message">{game.event??'Waiting for players'}</p>}
   </div>
   {game.handRanks.length>0&&<div className="pa-ranking"><h2>Last hand</h2>{game.handRanks.map(p=><div key={p.id}><strong>{p.position}. <ConnectionName name={p.name} offline={game.seats.some(s=>s.id===p.id&&!s.online)} bot={game.seats.some(s=>s.id===p.id&&s.bot)}/></strong><span>{rankTitle(p.position,game.handRanks.length,s.mode==='asshole')}</span></div>)}</div>}
  </div><aside className="pa-aside"><div className="panel"><div className="section-kicker">ROOM CODE</div><h2>{roomCode}</h2><p>Join on your phone to play. {s.botCount>0?`${s.botCount} bot${s.botCount===1?'':'s'} at this table.`:''}</p></div><div className="panel"><h3>Presidencies</h3>{scoreboard.length?scoreboard.map(([id,n])=><div className="pa-score" key={id}><span><ConnectionName name={game.names[id]??id.slice(0,6)} offline={game.seats.some(s=>s.id===id&&!s.online)} bot={game.seats.some(s=>s.id===id&&s.bot)}/></span><strong>{n}</strong></div>):<p>Scores appear after the first hand.</p>}</div><div className="panel"><h3>Active decrees</h3>{game.activeDecrees.length?game.activeDecrees.map(d=><div className="pa-decree" key={d.key}>{PA_DECREE_NAMES[d.key]} {d.value??''}{d.expiresBefore!==undefined?<small>expires before hand {d.expiresBefore}</small>:null}</div>):<p>No decrees in effect.</p>}</div></aside></div>
 </section>:<section className="pa-phone">
  {activeSkip?.skipped===view.me.id&&<div key={activeSkip.serial} className="pa-skipped-phone" role="status">⏭ SKIPPED — your turn was bypassed</div>}
  {game.stage==='ended'&&<div className="panel pa-message"><h2>Game ended</h2><p>Final leaderboard is on the host presentation.</p></div>}
  {view.status==='setup'&&<div className="panel pa-message"><h2>Host is setting up the room</h2><p>You can ready up once the lobby is open.</p></div>}
  {view.status!=='setup'&&game.stage==='ready'&&<div className="panel pa-message"><div className="section-kicker">{game.handNumber?`HAND ${game.handNumber} COMPLETE`:'WELCOME TO THE TABLE'}</div><h2>{game.handNumber?'Ready for another hand?':'Ready to play?'}</h2>{game.handRanks.length>0&&<p>{game.handRanks.map(p=>`${p.position}. ${p.name}`).join(' · ')}</p>}<button className={'btn btn-full '+(game.myReady?'':'btn-primary')} onClick={()=>void onAction('president:ready',{ready:!game.myReady})}>{game.myReady?'✓ Ready (tap to cancel)':'Ready up'}</button><p className="helper">All human players must be ready. Bots ready up automatically. At least four combined seats (including one human) are needed.</p>{view.me.primary&&game.seats.filter(p=>p.online).length<4&&game.handNumber>0&&<button className="btn btn-full" onClick={()=>void onAction('president:end')}>End game</button>}</div>}
  {game.stage==='exchange'&&<div className="panel pa-message"><div className="section-kicker">HAND {game.handNumber} · CARD EXCHANGE</div><h2>{game.myExchange?'Choose cards to return':'Card exchange in progress'}</h2>{game.myExchange?<><p>Choose {game.myExchange.count} from your original dealt cards. You cannot return newly received cards.</p>{game.myExchange.selected?<p className="success-line">Exchange confirmed</p>:<><div className="pa-hand">{game.myExchange.original.sort(byRank).map(c=><Card key={c} card={c} selected={selections.includes(c)} onClick={()=>toggle(c)}/>)}</div><button className="btn btn-primary btn-full" disabled={selections.length!==game.myExchange.count} onClick={()=>void choose()}>Confirm exchange</button></>}</>:<p>Waiting for the higher-ranked players to select their returns.</p>}<p className="helper">{formatLeft(game.stageEndsAt,now,offset)} remaining. Unsubmitted returns default to lowest original cards.</p></div>}
  {game.stage==='play'&&!game.inHand&&<div className="panel pa-message"><h2>Waiting for next hand</h2><p>You joined after this hand began. You'll be dealt in after everyone readies for the next hand.</p></div>}
  {game.stage==='play'&&game.inHand&&<div className="panel pa-message"><div className="pa-player-head"><div><div className="section-kicker">HAND {game.handNumber}</div><h2>{game.myFinished?'You finished!':game.canPlay?'Your turn':`Waiting for ${game.seats.find(p=>p.id===game.currentPlayerId)?.name??'player'}`}</h2></div><strong className="countdown-badge">{formatLeft(game.turnEndsAt,now,offset)}</strong></div><p className="helper">Select matching cards from your hand. Current pile is visible on the host screen.</p><div className="pa-hand">{game.myHand?.map(c=><Card key={c} card={c} disabled={blocked} selected={selections.includes(c)} onClick={()=>toggle(c)}/>)}</div><div className="pa-actions"><button className="btn btn-primary" disabled={!game.canPlay||blocked||!selections.length} onClick={()=>void choose(false)}>Play {selections.length?`(${selections.length})`:''}</button><button className="btn" disabled={!game.canPlay||blocked} onClick={()=>void onAction('president:pass')}>Pass</button>{s.social&&socialEligible&&<button className="btn" disabled={blocked} onClick={()=>void choose(true)}>Social!</button>}</div></div>}
  {game.stage==='decree'&&<div className="panel pa-message"><div className="section-kicker">PRESIDENTIAL DECREE</div><h2>{game.isPresident?'Your Presidential decision':'The President is deciding'}</h2>{game.isPresident?<><p>Choose a decree to enact or repeal, or skip the opportunity.</p>{game.activeDecrees.some(d=>d.key==='democracy')?<><p className="helper">Democracy: nominate two or three eligible changes for a vote. A sole eligible proposal is enacted directly.</p><div className="pa-decree-list">{options.map(a=><label className="pa-option" key={optionKey(a)}><input type="checkbox" disabled={!nominees.includes(optionKey(a))&&nominees.length>=3} checked={nominees.includes(optionKey(a))} onChange={e=>setNominees(old=>e.target.checked?[...old,optionKey(a)]:old.filter(x=>x!==optionKey(a)))}/>{actionLabel(a)}</label>)}</div><button className="btn btn-primary btn-full" disabled={nominees.length<(options.length===1?1:2)} onClick={()=>void onAction('president:decree',{nominees:nominees.map(x=>JSON.parse(x) as PADecreeAction)})}>Propose {nominees.length} change{nominees.length===1?'':'s'}</button></>:<div className="pa-decree-list">{options.map(a=><button className="choice-card" key={optionKey(a)} onClick={()=>void onAction('president:decree',{action:a})}>{actionLabel(a)}</button>)}</div>}<button className="btn btn-full" onClick={()=>void onAction('president:decree',{})}>Skip decree</button></>:<p>Waiting for the President.</p>}<p className="helper">{formatLeft(game.stageEndsAt,now,offset)} remaining</p></div>}
  {game.stage==='vote'&&vote&&<div className="panel pa-message"><div className="section-kicker">DEMOCRACY</div><h2>{vote.tieIndices?.length?'President breaks the tie':'Vote on a decree'}</h2><p className="helper">{vote.votesCast} votes submitted · {formatLeft(game.stageEndsAt,now,offset)} remaining</p>{vote.proposals.map((a,i)=><button className="choice-card" key={i} disabled={vote.tieIndices?(!game.isPresident||!vote.tieIndices.includes(i)):vote.myVote!==undefined} onClick={()=>void onAction('president:vote',{index:i})}>{actionLabel(a)}{vote.myVote===i?' ✓':''}</button>)}</div>}
  {pending.length>0&&<div className="panel pa-drink"><h3>Notification</h3>{pending.map((p,i)=><p key={i}>{p}</p>)}<button className="btn btn-primary btn-full" onClick={()=>void onAction('president:ack')}>Acknowledge</button></div>}
 </section>;
}
