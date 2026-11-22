/** SQUAD Spark multiplayer: small, independently written player records + team missions.
 * Pure game rules, shared by the browser and automated tests. No Cloud Functions.
 * This is a classroom prototype: client-authoritative teamwork, not anti-cheat.
 */
export const MAX_SEATS = 30;
export const TEAM_COUNT = 6;
export const TEAM_SIZE = 5;
const CARGO = ['bank', 'pudding', 'wasmachine'];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const teamFromSeat = seat => Math.floor(seat / TEAM_SIZE);
export const validCode = code => /^[A-HJ-NP-Z2-9]{8}$/.test(code);
export function initialPlayer(seat, round = 1) {
  return {team:teamFromSeat(seat), round,
    x:(seat%TEAM_SIZE-2)*1.65, z:-5-(seat%2),
    grip:false, rescues:0, stumble:0, dir:[0,0], lastMove:0};
}
export function initialTeam(id, round = 1) {
  return {id,round,cargo:CARGO[(id+round-1)%CARGO.length],
    couch:{x:0,z:1,wobble:0},gate:false,fanOff:false,crashes:0,
    finished:false,stabilization:0,event:'',eventSeq:0};
}
export function initialSeason() {
  return {round:1,week:1,cityLevel:1,deliveries:0,crashes:0};
}
export function nextSeason(season, finishedTeams, crashes) {
  const round=Math.min(200,season.round+1);
  return {round,week:Math.min(40,Math.ceil(round/5)),cityLevel:Math.min(10,1+Math.floor((round-1)/3)),
    deliveries:Math.min(10000,season.deliveries+finishedTeams),
    crashes:Math.min(100000,season.crashes+crashes)};
}
export function walk(player, dx, dz, team) {
  if (!Number.isFinite(dx)||!Number.isFinite(dz)||Math.abs(dx)>1||Math.abs(dz)>1)
    throw new Error('Ongeldige beweging.');
  if (team.finished) return {...player};
  const m=Math.max(1,Math.hypot(dx,dz)), x=dx/m, z=dz/m;
  const factor=player.stumble>0?.52:1;
  const next={...player, x:clamp(player.x+x*.65*factor,-8,8),
    z:clamp(player.z+z*.75*factor,-10,40),
    dir:[x,z], stumble:Math.max(0,(player.stumble||0)-1),
    lastMove:(player.lastMove||0)+1};
  if (distance(next,team.couch)>=5.1) next.grip=false;
  return next;
}
function announce(team,message) {team.event=message;team.eventSeq=(team.eventSeq||0)+1;}
export function teammateCount(players,presence,teamId,couch,actingUid,actor) {
  return Object.entries(players).filter(([uid,p])=>{
    const current=uid===actingUid?actor:p;
    return presence[uid]===true&&current?.team===teamId&&current.grip&&distance(current,couch)<5.3;
  }).length;
}
export function teamAction(current, action, player, players, presence, uid) {
  if(!current) return current;
  const team={...current,couch:{...current.couch}};
  if(team.finished)return team;
  const couch=team.couch;
  const kind=action.type;
  if(kind==='grab'){
    announce(team,player.grip?'VAST! Samen tillen!':'PLOF! Je hebt losgelaten.');
  } else if(kind==='help'){
    if(distance(player,couch)<7){
      team.stabilization=clamp(team.stabilization+3,0,12);
      couch.wobble=clamp(couch.wobble-.65,0,6);
      announce(team,'BOING! De bank is weer in balans.');
    }
  } else if(kind==='switch'){
    if(!team.fanOff && Math.hypot(player.x+5.4,player.z-12)<4.3){
      team.fanOff=true;announce(team,'WHOESJ! De ventilator is gestopt.');
    } else if(!team.gate && Math.hypot(player.x-6,player.z-19)<4.5){
      team.gate=true;announce(team,'KLANG! De brug staat open.');
    }
  } else if(kind==='move' && player.grip){
    const carriers=teammateCount(players,presence,team.id,couch,uid,player);
    if(carriers>=2){
      const m=Math.max(1,Math.hypot(action.dx,action.dz));
      const dx=action.dx/m, dz=action.dz/m;
      const disagreement=Object.entries(players).some(([peerUid,p])=>
        peerUid!==uid&&presence[peerUid]===true&&p.team===team.id&&p.grip&&
        distance(p,couch)<5.3&&Array.isArray(p.dir)&&dx*p.dir[0]+dz*p.dir[1]<-.5);
      if(disagreement)couch.wobble+=team.cargo==='pudding'?.48:.3;
      else{
        const speed=team.cargo==='pudding'?.62:team.cargo==='wasmachine'?.43:.5;
        couch.z=clamp(couch.z+dz*speed,1,team.gate?35:17.7);
        couch.x=clamp(couch.x+dx*.24,-5,5);
        couch.wobble=Math.max(0,couch.wobble+Math.abs(dx)*.07*(team.stabilization>0?.55:1)-.018*carriers);
        team.stabilization=Math.max(0,team.stabilization-.06);
      }
      if(!team.fanOff&&couch.z>=10&&couch.z<17.5)couch.wobble+=.21;
      if(couch.wobble>=1.65){
        couch.z=Math.max(1,couch.z-2.3);couch.wobble=.25;team.crashes++;
        announce(team,['KLABAM! De bank maakt een salto!','O NEE! Alles schuift!','BOEM! De boel valt om!'][team.crashes%3]);
      }
      if(couch.z>=34&&team.gate){
        team.finished=true;couch.wobble=0;
        announce(team,'GEWONNEN! Samen is de vracht aangekomen!');
      }
    }
  }
  return team;
}
export function canAdvance(seats,teams) {
  const active=new Set();
  for(const [slot,uid] of Object.entries(seats||{}))
    if(typeof uid==='string'&&/^(?:[0-9]|1[0-9]|2[0-9])$/.test(slot))
      active.add(teamFromSeat(Number(slot)));
  return active.size>0&&[...active].every(id=>teams[id]?.finished===true);
}
export function viewFromRoom(data,uid) {
  const seats=data.seats||{},players=data.players||{},teams=data.teams||{};
  const roster=Object.keys(seats).sort((a,b)=>Number(a)-Number(b))
    .map(slot=>seats[slot]).filter(id=>typeof id==='string');
  const own=players[uid];
  return {you:uid,player:own||null,players,
    teams:Array.from({length:TEAM_COUNT},(_,i)=>teams[i]||initialTeam(i,data.season?.round||1)),
    team:own?.team||0,roster,festival:Object.values(teams).filter(t=>t?.finished).length,
    moves:0,practice:false,season:data.season||initialSeason(),
    canAdvance:canAdvance(seats,teams)};
}
