/**
 * Lightweight, deterministic cartoon pose model.
 * Renders ragdoll-LIKE stumbles with articulated limbs; no physics engine.
 * Derived from shared events, so no Firebase schema change is needed.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function stumblePulse(elapsedMs){
  if(!Number.isFinite(elapsedMs)||elapsedMs<0||elapsedMs>1900)return 0;
  const x=elapsedMs/1900;
  // Quick slapstick fall, with a slower springy recovery.
  const attack=clamp(x/.2,0,1);
  const recovery=1-clamp((x-.34)/.66,0,1);
  return Math.sin(attack*Math.PI/2)*recovery;
}
export function cartoonPose(player={},timeMs=0,variant=0,crashElapsedMs=Infinity){
  const safeTime=Number.isFinite(timeMs)?timeMs:0;
  const pace=safeTime*.007+variant*2.17;
  const direction=variant%2===0?1:-1;
  const stumble=clamp((Number(player.stumble)||0)/5,0,1);
  const impact=Math.max(stumble,stumblePulse(crashElapsedMs));
  const feetSwing=Math.sin(pace)*(.11+impact*.36);
  const lean=clamp(direction*impact*1.22+Math.sin(pace*.34)*(.055+impact*.08),-1.42,1.42);
  return {
    lean,
    squash:impact,
    bounce:Math.abs(Math.sin(pace))*(impact?.065:.03),
    armSwing:Math.sin(pace+1.3)*(.31+impact*.28),
    feetSwing,
    handsUp:!!player.grip,
    blink:Math.sin(safeTime*.0015+variant*3.1)>.987,
    mouthOpen:impact>.2,
    impact
  };
}
export function cityProgress(season={}){
  const level=clamp(Math.floor(Number(season.cityLevel)||1),1,10);
  const deliveries=clamp(Math.floor(Number(season.deliveries)||0),0,10000);
  const round=clamp(Math.floor(Number(season.round)||1),1,200);
  const unlocked=Math.max(0,level-1);
  return {
    level,deliveries,round,
    completedLandmarks:unlocked,
    activeBalloons:Math.min(7,Math.floor(deliveries/2)),
    celebration:round>1&&((round-1)%5===0),
    label:`STADNIVEAU ${level}/10 · ${deliveries} VRACHTEN`
  };
}
