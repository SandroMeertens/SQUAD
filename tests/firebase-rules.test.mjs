import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {initialPlayer,initialTeam,initialSeason} from '../web/spark-logic.js';

const projectId='demo-squad-spark-rules';
const code='ABCD2345';
const base=`rooms/${code}`;

test('Firebase Spark database rules permit own room/team, block outsiders and other avatars',async()=>{
  const env=await initializeTestEnvironment({
    projectId,database:{host:'127.0.0.1',port:9000,rules:readFileSync('database.rules.json','utf8')}
  });
  try {
    await env.clearDatabase();
    const alice=env.authenticatedContext('alice').database();
    const bob=env.authenticatedContext('bob').database();
    const unauth=env.unauthenticatedContext().database();
    await assertFails(unauth.ref(`${base}/info`).get());
    await assertFails(unauth.ref(`${base}/info`).set({ownerUid:'anonymous',createdAt:Date.now()}));
    await assertSucceeds(alice.ref(`${base}/info`).set({ownerUid:'alice',createdAt:Date.now()}));
    await assertSucceeds(bob.ref(`${base}/info`).get());
    await assertFails(bob.ref(`${base}/players`).get());
    await assertFails(bob.ref(`${base}/seats/0`).set('alice'));
    await assertFails(alice.ref(`${base}/seats/30`).set('alice'));
    await assertSucceeds(alice.ref(`${base}/seats/0`).set('alice'));
    await assertSucceeds(alice.ref(`${base}/members/alice`).set({seat:0,team:0}));
    await assertFails(alice.ref(`${base}/members/alice`).set({seat:0,team:4}));
    await assertSucceeds(alice.ref(`${base}/season`).set(initialSeason()));
    await assertSucceeds(alice.ref(`${base}/players/alice`).set(initialPlayer(0)));
    await assertFails(alice.ref(`${base}/players/bob`).set(initialPlayer(1)));
    await assertFails(alice.ref(`${base}/players/alice/x`).set(100));
    await assertFails(bob.ref(`${base}/players`).get());
    await assertSucceeds(alice.ref(`${base}/presence/alice`).set(true));
    await assertFails(alice.ref(`${base}/presence/alice`).set(false));
    await assertSucceeds(alice.ref(`${base}/teams/0`).set(initialTeam(0)));
    await assertFails(alice.ref(`${base}/teams/1`).set(initialTeam(1)));
    await assertSucceeds(bob.ref(`${base}/seats/1`).set('bob'));
    await assertSucceeds(bob.ref(`${base}/members/bob`).set({seat:1,team:0}));
    await assertSucceeds(bob.ref(`${base}/players/bob`).set(initialPlayer(1)));
    await assertSucceeds(bob.ref(`${base}/players`).get());
    await assertSucceeds(bob.ref(`${base}/teams/0`).set(initialTeam(0)));
    await assertFails(bob.ref(`${base}/players/alice`).set(initialPlayer(0)));
    await assertSucceeds(alice.ref(`${base}/presence/alice`).remove());
    await assertFails(unauth.ref(`${base}/players`).get());
    await assertSucceeds(alice.ref(`${base}/season`).set({round:2,week:1,cityLevel:1,deliveries:1,crashes:0}));
    await assertFails(alice.ref(`${base}/season`).set({round:4,week:1,cityLevel:1,deliveries:1,crashes:0}));
    assert.equal((await bob.ref(`${base}/season/round`).get()).val(),2);
  } finally {
    await env.cleanup();
  }
});
