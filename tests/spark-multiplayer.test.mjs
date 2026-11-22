import assert from 'node:assert/strict';
import test from 'node:test';
import {teamFromSeat,initialPlayer,initialTeam,initialSeason,nextSeason,validCode,
        walk,teamAction,teammateCount,canAdvance,viewFromRoom} from '../web/spark-logic.js';

test('Spark reserves 30 distinct positions across six teams of five',()=>{
  const seats=Object.fromEntries(Array.from({length:30},(_,i)=>[i,'child'+i]));
  const players=Object.fromEntries(Object.keys(seats).map(i=>[seats[i],initialPlayer(Number(i))]));
  assert.equal(Object.keys(players).length,30);
  for(let i=0;i<30;i++)assert.equal(players['child'+i].team,Math.floor(i/5));
  assert.equal(teamFromSeat(29),5);
  assert.equal(initialPlayer(2).z,-5);
  assert.deepEqual(Object.keys(seats).length,30);
});
test('Spark codes do not contain ambiguous letters and use 8 characters',()=>{
  assert.equal(validCode('ABCD2345'),true);
  assert.equal(validCode('ABCD1O05'),false);
  assert.equal(validCode('ABCD234'),false);
});
test('Only two present grabbing teammates can move the heavy cargo',()=>{
  const p1={...initialPlayer(0),x:0,z:1,grip:true,dir:[0,1]};
  const p2={...initialPlayer(1),x:1,z:1,grip:true,dir:[0,1]};
  const players={a:p1,b:p2},presence={a:true,b:true};
  const original=initialTeam(0);
  const single=teamAction(original,{type:'move',dx:0,dz:1},p1,players,{a:true,b:false},'a');
  assert.equal(single.couch.z,1);
  assert.equal(teammateCount(players,presence,0,original.couch,'a',p1),2);
  const together=teamAction(original,{type:'move',dx:0,dz:1},p1,players,presence,'a');
  assert.ok(together.couch.z>1);
  assert.equal(original.couch.z,1,'team reducer must not mutate database transaction input');
});
test('Switching fan and bridge requires being near the switch',()=>{
  const players={a:initialPlayer(0)},presence={a:true};
  const t=initialTeam(0);
  assert.equal(teamAction(t,{type:'switch'},players.a,players,presence,'a').gate,false);
  const nearFan={...players.a,x:-5.4,z:12};
  const off=teamAction(t,{type:'switch'},nearFan,players,presence,'a');
  assert.equal(off.fanOff,true);
  const bridge=teamAction(off,{type:'switch'},{...players.a,x:6,z:19},players,presence,'a');
  assert.equal(bridge.gate,true);
});
test('Players cannot jump outside the stage and cannot submit impossible input',()=>{
  const p={...initialPlayer(0),x:7.8,z:39.9};
  const moved=walk(p,1,1,initialTeam(0));
  assert.ok(moved.x<=8&&moved.z<=40);
  assert.throws(()=>walk(p,100,0,initialTeam(0)));
});
test('Rounds rotate cargo and accumulate progress through 40 weeks',()=>{
  const start=initialSeason();
  const next=nextSeason(start,1,3);
  assert.equal(next.round,2);
  assert.equal(next.deliveries,1);
  assert.equal(initialTeam(0,next.round).cargo,'pudding');
  let s=start;
  for(let i=0;i<199;i++)s=nextSeason(s,1,0);
  assert.equal(s.round,200);
  assert.equal(s.week,40);
});
test('Only teams with reserved seats are required to finish the mission',()=>{
  const seats={0:'a',1:'b',5:'c'};
  const teams={0:{...initialTeam(0),finished:true},1:initialTeam(1)};
  assert.equal(canAdvance(seats,teams),false);
  teams[1].finished=true;
  assert.equal(canAdvance(seats,teams),true);
  const view=viewFromRoom({seats,players:{a:initialPlayer(0)},teams,season:initialSeason()},'a');
  assert.equal(view.practice,false);
  assert.equal(view.canAdvance,true);
});
