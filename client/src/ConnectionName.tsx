import {WifiOff} from 'lucide-react';

/**
 * Public presentation only: show server-authoritative connection state beside
 * human player names. Render no warning for connected people or virtual bots.
 */
export function ConnectionName({name,offline=false,bot=false}:{name:string;offline?:boolean;bot?:boolean}){
 return <span className="connection-name">
  <span className="connection-name-text">{name}</span>
  {offline&&!bot&&<span className="connection-warning" role="img" aria-label="Disconnected" title="Player disconnected — trying to reconnect"><WifiOff size={17} strokeWidth={2.6} aria-hidden="true"/></span>}
 </span>;
}
