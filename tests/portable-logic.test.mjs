import assert from 'node:assert/strict';
import test from 'node:test';
import * as rules from '../functions/logic.js';

test('30 players have distinct seats split across six teams',()=>{
 const roster=Array.from({length:30},(_,i)=>`test${i}`),s=rules.setup(roster);
 assert.equal(Object.keys(s.players).length,30);
 for(let i=0;i<30;i++)assert.equal(s.players[`test${i}`].team,Math.floor(i/5));
 assert.equal(s.teams.length,6);
});
test('server rules reject injected join and impossible movement',()=>{
 const s=rules.setup(['a']);
 assert.equal(rules.validateAction(s,'a',{type:'join'}).ok,false);
 assert.equal(rules.validateAction(s,'a',{type:'move',dx:150,dz:0}).ok,false);
 assert.equal(rules.validateAction(s,'intruder',{type:'grab'}).ok,false);
});
test('class progress persists and cargo rotates',()=>{
 let s=rules.setup(['a']);
 assert.equal(s.teams[0].cargo,'bank');
 assert.equal(rules.validateAction(s,'a',{type:'advance'}).ok,false);
 s.teams[0].finished=true;
 s=rules.applyAction(s,'a',{type:'advance'});
 assert.equal(s.season.round,2);
 assert.equal(s.season.deliveries,1);
 assert.equal(s.teams[0].cargo,'pudding');
});
