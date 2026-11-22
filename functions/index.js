/** SQUAD Firebase authoritative multiplayer backend.
 * Children play with anonymous Firebase accounts (no email, names, or passwords).
 * Room state can only be changed through authenticated callable functions.
 * Each callable action is serialized using a Realtime Database transaction.
 * This is a migration prototype. Benchmark 30 concurrent devices before classroom use.
 */
import { randomInt } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as game from './logic.js';

// Explicit target: the classroom Realtime Database is in europe-west1.
initializeApp({databaseURL:'https://squad-a63fa-default-rtdb.europe-west1.firebasedatabase.app'});
const database = getDatabase();
const region = 'europe-west1';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codePattern = /^[A-HJ-NP-Z2-9]{6,10}$/;
const code = () => Array.from({length:8},()=>alphabet[randomInt(alphabet.length)]).join('');
function requireUser(req){
  const uid = req.auth?.uid;
  if (!uid || typeof uid !== 'string' || uid.length > 128) {
    throw new HttpsError('unauthenticated','Start met anonieme Firebase-aanmelding.');
  }
  return uid;
}
function readCode(value){
  if(typeof value!=='string') throw new HttpsError('invalid-argument','Klascode ontbreekt.');
  const id = value.trim().toUpperCase();
  if(!codePattern.test(id)) throw new HttpsError('invalid-argument','Klascode moet 6 tot 10 tekens hebben.');
  return id;
}
const dbRoom = id=>database.ref(`classrooms/${id}`);

export const createClassroom=onCall({region,maxInstances:20},async req=>{
  const uid=requireUser(req);
  for(let trial=0;trial<6;trial++){
    const id=code(),now=Date.now();
    const room={ownerUid:uid,createdAt:now,updatedAt:now,members:{[uid]:true},
      gameState:null,lastActionAt:{}};
    const res=await dbRoom(id).transaction(old=>old===null?room:undefined,{applyLocally:false});
    if(res.committed)return {code:id};
  }
  throw new HttpsError('resource-exhausted','Kon geen klascode maken. Probeer opnieuw.');
});

export const joinClassroom=onCall({region,maxInstances:60},async req=>{
  const uid=requireUser(req),id=readCode(req.data?.code);
  let problem='';
  const res=await dbRoom(id).transaction(room=>{
    if(!room){problem='Klascode bestaat niet.';return;}
    const state=room.gameState;
    if(state && !state.roster.includes(uid) && state.roster.length>=30){problem='Deze klas zit vol (30 spelers).';return;}
    const members={...(room.members||{}),[uid]:true};
    let next=state;
    if(!next)next=game.setup([uid]);
    else if(!next.players?.[uid])next=game.applyAction(next,uid,{type:'join'});
    return {...room,members,gameState:next,updatedAt:Date.now()};
  },{applyLocally:false});
  if(!res.committed)throw new HttpsError(problem==='Deze klas zit vol (30 spelers).'?'resource-exhausted':'not-found',problem||'Kon niet deelnemen.');
  return {code:id,uid};
});

export const submitAction=onCall({region,maxInstances:120},async req=>{
  const uid=requireUser(req),id=readCode(req.data?.code),action=req.data?.action;
  if(!action || typeof action!=='object'||Array.isArray(action)||JSON.stringify(action).length>512){
    throw new HttpsError('invalid-argument','Ongeldige spelactie.');
  }
  if(action.type==='join')throw new HttpsError('permission-denied','Deelnemen gaat via joinClassroom.');
  let problem='';
  const now=Date.now();
  const res=await dbRoom(id).transaction(room=>{
    if(!room){problem='Klascode bestaat niet.';return;}
    if(!room.members?.[uid]||!room.gameState?.players?.[uid]){problem='Je hoort niet bij deze klas.';return;}
    const previous=room.lastActionAt?.[uid]||0;
    if(now-previous<140){problem='Te snel. Wacht heel even.';return;}
    const verdict=game.validateAction(room.gameState,uid,action);
    if(!verdict.ok){problem=verdict.error||'Ongeldige actie.';return;}
    const next=game.applyAction(room.gameState,uid,action);
    return {...room,gameState:next,updatedAt:now,lastActionAt:{...(room.lastActionAt||{}),[uid]:now}};
  },{applyLocally:false});
  if(!res.committed){
    throw new HttpsError(problem==='Te snel. Wacht heel even.'?'resource-exhausted':'failed-precondition',problem||'Actie geweigerd.');
  }
  return {ok:true};
});
