import test from 'node:test';
import assert from 'node:assert/strict';
import {joystickVector} from '../web/joystick.js';
import {createViewSmoother} from '../web/visual-smoothing.js';

test('Joystick has a dead zone, proportional movement and caps speed',()=>{
 assert.deepEqual(joystickVector(0,0),{dx:0,dz:0});
 assert.deepEqual(joystickVector(1,1),{dx:0,dz:0});
 assert.ok(joystickVector(25,0).dx>0 && joystickVector(25,0).dx<1);
 assert.deepEqual(joystickVector(100,0),{dx:1,dz:0});
 assert.deepEqual(joystickVector(0,-100),{dx:0,dz:1});
 assert.deepEqual(joystickVector(0,100),{dx:0,dz:-1});
 const diag=joystickVector(70,-70);
 assert.ok(diag.dx>0 && diag.dz>0 && Math.hypot(diag.dx,diag.dz)<=1.0000001);
 assert.deepEqual(joystickVector(Infinity,1),{dx:0,dz:0});
});

test('Visual interpolation smooths the local and team view without changing game state',()=>{
 const smooth=createViewSmoother();
 const start={players:{me:{x:0,z:-5,team:0},friend:{x:1,z:-4,team:0}},
   teams:[{couch:{x:0,z:1},finished:false}],season:{round:1}};
 const first=smooth.smooth(start,'me',33);
 assert.equal(first.players.me.x,0);
 const moved={...start,players:{...start.players,me:{...start.players.me,x:1,z:-4}},
   teams:[{...start.teams[0],couch:{x:1,z:2}}]};
 const frame=smooth.smooth(moved,'me',33);
 assert.ok(frame.players.me.x>0&&frame.players.me.x<1);
 assert.ok(frame.teams[0].couch.z>1&&frame.teams[0].couch.z<2);
 assert.equal(moved.players.me.x,1);
 assert.equal(moved.teams[0].couch.z,2);
 assert.equal(frame.players.friend.x,1);
 smooth.reset();
 assert.equal(smooth.smooth(moved,'me',33).players.me.x,1);
});

test('Large teleports are not drawn as slow slides',()=>{
 const smooth=createViewSmoother();
 const initial={players:{me:{x:0,z:0,team:1}},teams:[{},{}]};
 smooth.smooth(initial,'me');
 const teleport={players:{me:{x:20,z:20,team:1}},teams:[{},{}]};
 assert.equal(smooth.smooth(teleport,'me').players.me.x,20);
});
