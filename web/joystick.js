// SQUAD thumbstick: Brawl Stars-achtige bediening, zonder extra libraries.
export function joystickVector(x,y,radius=48,deadZone=.12){
  if(![x,y,radius].every(Number.isFinite)||radius<=0)return {dx:0,dz:0};
  const distance=Math.hypot(x,y),amount=Math.min(1,distance/radius);
  if(amount<=deadZone)return {dx:0,dz:0};
  const strength=(amount-deadZone)/(1-deadZone);
  return {dx:x/distance*strength,dz:-y/distance*strength};
}
export function createJoystick(track){
  if(!track)return {read:()=>({dx:0,dz:0}),reset:()=>{}};
  const thumb=track.querySelector('.stick-thumb');
  let pointer=null,motion={dx:0,dz:0};
  const reset=()=>{
    pointer=null;motion={dx:0,dz:0};track.classList.remove('moving');
    if(thumb)thumb.style.transform='translate(-50%,-50%)';
  };
  const radius=()=>Math.max(24,Math.min(track.clientWidth,track.clientHeight)*.36);
  const update=e=>{
    const rect=track.getBoundingClientRect(),limit=radius();
    const x=e.clientX-rect.left-rect.width/2,y=e.clientY-rect.top-rect.height/2;
    const ratio=Math.min(1,limit/(Math.hypot(x,y)||1)),px=x*ratio,py=y*ratio;
    motion=joystickVector(x,y,limit);
    if(thumb)thumb.style.transform=`translate(-50%,-50%) translate(${px}px,${py}px)`;
  };
  track.addEventListener('pointerdown',e=>{
    if(pointer!==null)return;
    e.preventDefault();pointer=e.pointerId;track.classList.add('moving');
    try{track.setPointerCapture(e.pointerId)}catch{}
    update(e);
  });
  track.addEventListener('pointermove',e=>{if(pointer===e.pointerId){e.preventDefault();update(e)}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])
    track.addEventListener(type,e=>{if(pointer===e.pointerId)reset()});
  window.addEventListener('blur',reset);
  return {read:()=>motion,reset};
}
