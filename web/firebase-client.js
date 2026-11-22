/** Firebase Spark adapter — direct authenticated Realtime Database, no Functions.
 * Anonymous classroom prototype. Players can write only their own avatar;
 * each of the six teams shares a small transactional mission state.
 */
import {initializeApp} from 'firebase/app';
import {getAuth,signInAnonymously} from 'firebase/auth';
import {getDatabase,ref,get,set,onValue,onChildAdded,onChildChanged,
        onChildRemoved,onDisconnect,runTransaction} from 'firebase/database';
import {MAX_SEATS,validCode,teamFromSeat,initialPlayer,initialTeam,initialSeason,
        nextSeason,walk,teamAction,canAdvance,viewFromRoom} from './spark-logic.js';

const config={
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:import.meta.env.VITE_FIREBASE_APP_ID
};
let services,session=null,unsubs=[],sequence=Promise.resolve(),busyMove=false;
function getServices(){
  if(services)return services;
  if(!config.apiKey||!config.projectId||!config.databaseURL||!config.appId)
    throw new Error('Firebase-webconfiguratie ontbreekt.');
  const app=initializeApp(config);
  services={auth:getAuth(app),database:getDatabase(app)};
  return services;
}
async function currentUser(){
  const {auth}=getServices();
  await auth.authStateReady();
  if(auth.currentUser)return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}
const roomPath=code=>`rooms/${code}`;
const roomRef=(code,part)=>ref(getServices().database,`${roomPath(code)}/${part}`);
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(){
  const a=new Uint32Array(8);crypto.getRandomValues(a);
  return Array.from(a,n=>alphabet[n%alphabet.length]).join('');
}
export async function createRoom(){
  const user=await currentUser();
  for(let attempt=0;attempt<5;attempt++){
    const code=makeCode();
    try{
      const result=await runTransaction(roomRef(code,'info'),old=>
        old===null?{ownerUid:user.uid,createdAt:Date.now()}:undefined,
        {applyLocally:false});
      if(result.committed)return code;
    }catch(error){
      if(error.code!=='PERMISSION_DENIED'&&error.code!=='permission-denied')throw error;
    }
  }
  throw new Error('Kon geen klascode maken. Controleer of de nieuwe databaseregels zijn gepubliceerd.');
}
function emit(){
  const s=session;
  if(!s||!s.data.players[s.uid]||!s.data.season)return;
  const view=viewFromRoom(s.data,s.uid);
  s.onState({type:'state',status:'playing',view,
    connected:Object.keys(s.data.presence||{}).filter(uid=>s.data.presence[uid]===true).length,
    seats:view.roster,meta:{game:'SQUAD Spark',maxPlayers:30}});
}
function listen(off){unsubs.push(off);}
async function ensureRound(round){
  const s=session;
  if(!s)return;
  await runTransaction(roomRef(s.code,`teams/${s.team}`),old=>
    !old||old.round<round?initialTeam(s.team,round):undefined,{applyLocally:false});
  await runTransaction(roomRef(s.code,`players/${s.uid}`),old=>
    !old||old.round<round?initialPlayer(s.seat,round):undefined,{applyLocally:false});
}
async function takeSeat(code,uid){
  const memberRef=roomRef(code,`members/${uid}`);
  const existing=(await get(memberRef)).val();
  if(existing&&Number.isInteger(existing.seat)&&existing.seat>=0&&existing.seat<MAX_SEATS)
    return existing.seat;
  const seats=(await get(roomRef(code,'seats'))).val()||{};
  const owned=Object.entries(seats).find(([,id])=>id===uid);
  const candidates=owned?[Number(owned[0])]:
    Array.from({length:MAX_SEATS},(_,i)=>i).filter(i=>!seats[i]);
  for(const seat of candidates){
    if(!Number.isInteger(seat)||seat<0||seat>=MAX_SEATS)continue;
    try{
      if(!owned){
        const result=await runTransaction(roomRef(code,`seats/${seat}`),value=>
          value===null?uid:undefined,{applyLocally:false});
        if(!result.committed)continue;
      }
      await set(memberRef,{seat,team:teamFromSeat(seat)});
      return seat;
    }catch(error){
      // A claimed slot remains reserved for this anonymous UID on an interrupted join.
      if(error.code==='PERMISSION_DENIED'||error.code==='permission-denied')throw error;
      throw error;
    }
  }
  throw new Error('Deze klas zit vol (maximaal 30 spelers).');
}
export async function joinRoom(code,onState,onError){
  if(!validCode(code))throw new Error('Klascode moet 8 letters of cijfers bevatten.');
  disconnect();
  const user=await currentUser(),uid=user.uid;
  const info=(await get(roomRef(code,'info'))).val();
  if(!info)throw new Error('Klascode bestaat niet. Laat je leerkracht een nieuwe code maken.');
  const seat=await takeSeat(code,uid),team=teamFromSeat(seat);
  session={code,uid,seat,team,onState,onError,data:{
    seats:{},players:{},teams:{},presence:{},season:null}};
  const s=session;
  try{
    await runTransaction(roomRef(code,'season'),old=>old===null?initialSeason():undefined,
      {applyLocally:false});
    const season=(await get(roomRef(code,'season'))).val()||initialSeason();
    await ensureRound(season.round);
    const presenceRef=roomRef(code,`presence/${uid}`);
    await onDisconnect(presenceRef).remove();
    await set(presenceRef,true);
    const safeError=err=>{if(session===s)onError(err)};
    listen(onValue(roomRef(code,'seats'),snap=>{
      if(session!==s)return;s.data.seats=snap.val()||{};emit();
    },safeError));
    listen(onValue(roomRef(code,'presence'),snap=>{
      if(session!==s)return;s.data.presence=snap.val()||{};emit();
    },safeError));
    listen(onValue(roomRef(code,'season'),snap=>{
      if(session!==s)return;
      const next=snap.val();if(!next)return;
      s.data.season=next;emit();
      // This is idempotent and allows a new round without Cloud Functions.
      if(s.data.players[uid]?.round!==next.round)
        ensureRound(next.round).catch(safeError);
    },safeError));
    for(const kind of ['players','teams']){
      const base=roomRef(code,kind);
      const update=snap=>{
        if(session!==s)return;
        s.data[kind][snap.key]=snap.val();
        emit();
      };
      listen(onChildAdded(base,update,safeError));
      listen(onChildChanged(base,update,safeError));
      listen(onChildRemoved(base,snap=>{
        if(session!==s)return;
        delete s.data[kind][snap.key];emit();
      },safeError));
    }
    return uid;
  }catch(error){
    disconnect();throw error;
  }
}
async function dispatch(userAction){
  const s=session;
  if(!s)throw new Error('Je bent nog niet met een klas verbonden.');
  const {code,uid,team,seat}=s,{data}=s;
  const player=data.players[uid];
  const t=data.teams[team]||initialTeam(team,data.season?.round||1);
  if(!player)throw new Error('Speler wordt nog geladen. Probeer zo opnieuw.');
  if(!data.season||player.round!==data.season.round)
    throw new Error('De volgende missie wordt klaargezet.');
  const playerRef=roomRef(code,`players/${uid}`);
  const teamRef=roomRef(code,`teams/${team}`);
  const kind=userAction?.type;
  if(kind==='advance'){
    if(!canAdvance(data.seats,data.teams))
      throw new Error('Eerst moeten alle actieve teams klaar zijn.');
    const done=new Set(Object.keys(data.seats).map(x=>teamFromSeat(Number(x)))).size;
    const crashes=Object.values(data.teams).reduce((n,t)=>n+(t.crashes||0),0);
    const currentRound=data.season.round;
    const result=await runTransaction(roomRef(code,'season'),old=>
      old?.round===currentRound&&old.round<200
        ?nextSeason(old,done,crashes):undefined,{applyLocally:false});
    if(!result.committed)throw new Error('De volgende ronde is al begonnen.');
    return;
  }
  if(!['move','grab','help','switch'].includes(kind))return;
  let next={...player};
  if(kind==='move')next=walk(player,userAction.dx,userAction.dz,t);
  if(kind==='grab'&&!t.finished){
    next.grip=player.grip?false:Math.hypot(player.x-t.couch.x,player.z-t.couch.z)<5.1;
  }
  if(kind==='help'&&Math.hypot(player.x-t.couch.x,player.z-t.couch.z)<7)
    next.rescues=Math.min(9999,(next.rescues||0)+1);
  // Each player writes only their own tightly validated avatar.
  if(kind==='move'||kind==='grab'||kind==='help'){
    data.players[uid]=next;emit();
    await set(playerRef,next);
  }
  if(kind==='move'&&!next.grip)return;
  // Only the active team partition is transacted; other teams never contend.
  const result=await runTransaction(teamRef,current=>{
    if(!current||current.round!==data.season.round)return;
    return teamAction(current,userAction,next,data.players,data.presence,uid);
  },{applyLocally:false});
  if(result.committed){data.teams[team]=result.snapshot.val();emit();}
}
export function action(code,userAction){
  if(!session||session.code!==code)return Promise.reject(new Error('Klascode is niet verbonden.'));
  if(userAction?.type==='move'){
    if(busyMove)return Promise.resolve();
    busyMove=true;
  }
  const job=sequence.then(()=>dispatch(userAction));
  sequence=job.catch(()=>{});
  return job.finally(()=>{if(userAction?.type==='move')busyMove=false});
}
export function disconnect(){
  for(const off of unsubs.splice(0))off();
  if(session){
    const {code,uid}=session;
    set(roomRef(code,`presence/${uid}`),null).catch(()=>{});
    session=null;
  }
}
