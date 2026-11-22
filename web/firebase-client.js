/** Firebase multiplayer adapter: anonymous accounts, server-owned actions. */
import {initializeApp} from 'firebase/app';
import {getAuth,signInAnonymously,onAuthStateChanged} from 'firebase/auth';
import {getDatabase,ref,onValue} from 'firebase/database';
import {getFunctions,httpsCallable} from 'firebase/functions';
import {viewFor} from './game-logic.js';

const config={
 apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
 authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
 databaseURL:import.meta.env.VITE_FIREBASE_DATABASE_URL,
 projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,
 appId:import.meta.env.VITE_FIREBASE_APP_ID
};
let initialized=null,unsub=null;
function getServices(){
 if(initialized)return initialized;
 if(Object.values(config).some(v=>!v))throw new Error('Firebase-configuratie ontbreekt. Laat de beheerder het Firebase-project instellen.');
 const app=initializeApp(config);
 initialized={auth:getAuth(app),database:getDatabase(app),functions:getFunctions(app,'europe-west1')};
 return initialized;
}
async function currentUser(){
 const {auth}=getServices();
 if(auth.currentUser)return auth.currentUser;
 return new Promise((resolve,reject)=>{
   let off=()=>{};
   off=onAuthStateChanged(auth,user=>{if(user){off();resolve(user)}},err=>{off();reject(err)});
   signInAnonymously(auth).then(c=>{off();resolve(c.user)}).catch(e=>{off();reject(e)});
 });
}
export async function createRoom(){
 await currentUser();
 const {functions}=getServices();
 const response=await httpsCallable(functions,'createClassroom')({});
 return response.data.code;
}
export async function joinRoom(code,onState,onError){
 if(unsub){unsub();unsub=null;}
 const user=await currentUser(),{functions,database}=getServices();
 await httpsCallable(functions,'joinClassroom')({code});
 unsub=onValue(ref(database,`classrooms/${code}/gameState`),snapshot=>{
  const state=snapshot.val();
  if(!state)return;
  onState({type:'state',status:'playing',view:viewFor(state,user.uid),
   connected:Object.keys(state.players||{}).length,seats:state.roster||[],meta:{game:'SQUAD',maxPlayers:30}});
 },error=>onError(error));
 return user.uid;
}
export async function action(code,action){
 const user=await currentUser();
 if(!user)return;
 const {functions}=getServices();
 await httpsCallable(functions,'submitAction')({code,action});
}
export function disconnect(){if(unsub){unsub();unsub=null}}
