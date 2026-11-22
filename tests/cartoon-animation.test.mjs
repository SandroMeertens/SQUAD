import test from 'node:test';
import assert from 'node:assert/strict';
import {stumblePulse,cartoonPose,cityProgress} from '../web/cartoon-animation.js';

test('Stumble has a fall, a recovery and an exact resting pose',()=>{
  assert.equal(stumblePulse(-100),0);
  assert.equal(stumblePulse(2000),0);
  assert.equal(stumblePulse(Infinity),0);
  assert.ok(stumblePulse(330)>.1);
  assert.ok(stumblePulse(800)>.1);
  assert.ok(stumblePulse(1600)<stumblePulse(800));
});
test('Articulated animation stays bounded for ordinary and unusual inputs',()=>{
  for(const i of [0,1,2,3,4,5,20]){
    for(const t of [0,250,650,1300,3000,1e6]){
      const p=cartoonPose({grip:i%2===0,stumble:i},t,i,500);
      assert.ok(Number.isFinite(p.lean)&&Math.abs(p.lean)<=1.42);
      assert.ok(p.squash>=0&&p.squash<=1);
      assert.ok(Number.isFinite(p.feetSwing)&&Math.abs(p.feetSwing)<=.47);
      assert.ok(Number.isFinite(p.armSwing));
    }
  }
  const calm=cartoonPose({},500,0,Infinity);
  const fallen=cartoonPose({},500,0,450);
  assert.ok(fallen.squash>calm.squash);
  assert.ok(Math.abs(fallen.lean)>Math.abs(calm.lean));
  assert.equal(cartoonPose({grip:true},300).handsUp,true);
});
test('The city visibly gains nine landmarks over ten classroom levels',()=>{
  let previous=0;
  for(let level=1;level<=10;level++){
    const city=cityProgress({cityLevel:level,deliveries:level*2,round:level*3});
    assert.equal(city.level,level);
    assert.equal(city.completedLandmarks,level-1);
    assert.ok(city.completedLandmarks>=previous);previous=city.completedLandmarks;
    assert.equal(city.activeBalloons,Math.min(7,level));
    assert.ok(city.label.includes('VRACHTEN'));
  }
  assert.equal(cityProgress().level,1);
  assert.equal(cityProgress({cityLevel:99}).level,10);
  assert.equal(cityProgress({round:6}).celebration,true);
  assert.equal(cityProgress({round:7}).celebration,false);
});
