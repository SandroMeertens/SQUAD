// SQUAD: lightweight native WebGL2 renderer, real 3D triangles.
import {missionFor} from './mission-director.js';
import {cartoonPose,cityProgress} from './cartoon-animation.js';
import {partyWorldTriangles} from './party-world.js';
// All geometry is real triangles viewed through a perspective camera.
const VS = `#version 300 es
precision highp float;
in vec3 aPosition; in vec3 aNormal; in vec3 aColor;
uniform mat4 uProjection; uniform mat4 uView;uniform vec3 uCameraWorld;
out vec3 vNormal; out vec3 vColor; out float vDepth;out vec3 vEye;out float vHeight;
void main(){
 vec4 camera=uView*vec4(aPosition,1.0);
 gl_Position=uProjection*camera;
 vDepth=-camera.z;vEye=uCameraWorld-aPosition;
 vColor=aColor;vNormal=aNormal;vHeight=aPosition.y;
}`;
const FS = `#version 300 es
precision mediump float;
in vec3 vNormal;in vec3 vColor;in float vDepth;in vec3 vEye;in float vHeight;
out vec4 outColor;
void main(){
 vec3 n=normalize(vNormal),sun=normalize(vec3(-0.54,0.88,-0.46));
 float top=clamp(n.y*.5+.5,0.0,1.0);
 float diffuse=max(0.0,dot(n,sun));
 // Warm sunset key light and cool sky fill, with a delicate cartoon edge glow.
 vec3 fill=mix(vec3(0.50,0.57,0.80),vec3(0.82,0.79,0.83),top);
 vec3 lit=fill*.83+vec3(1.0,0.76,0.60)*diffuse*.55;
 vec3 col=vColor*lit;
 float rim=pow(1.0-max(0.0,dot(n,normalize(vEye))),2.0);
 col+=vColor*vec3(0.30,0.20,0.27)*rim*.38;
 // Bright candy highlights, atmospheric perspective and depth in the sky.
 float glint=pow(diffuse,18.0)*.09;
 col+=vec3(1.0,.86,.70)*glint;
 float fog=smoothstep(40.0,172.0,vDepth);
 vec3 dusk=mix(vec3(.75,.55,.72),vec3(.86,.68,.70),clamp((vHeight+12.0)/85.0,0.0,1.0));
 col=mix(col,dusk,fog*.73);
 col=pow(clamp(col,0.0,1.0),vec3(.94));
 outColor=vec4(col,1.0);
}`;
const COLORS={road:'#8395a8',roadSide:'#344867',roadEdge:'#b7e8e4',gold:'#ffd28a',cyan:'#86f6f1',glass:'#b6e9ff',steel:'#476184',stone:'#48516f',grass:'#75b4a0',cloud:'#d1bad4',trunk:'#74586d',leaves:'#6daa91',skin:'#ebbd9f',black:'#233551',white:'#fff5ee',pink:'#ed9bac',jelly:'#ff95d7',jellyLight:'#ffd6ec',washer:'#c9eff1',dark:'#253556'};
const rgb=(s)=>{let h=s.replace('#','');return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];};
function mesh(){const values=[];
 function vertex(p,n,c){values.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2]);}
 function tri(a,b,c,color,normal=null){const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];const n=normal||[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const d=Math.hypot(...n)||1,norm=n.map(v=>v/d),col=rgb(color);vertex(a,norm,col);vertex(b,norm,col);vertex(c,norm,col);}
 function box(x,y,z,dx,dy,dz,color){let x0=x-dx/2,x1=x+dx/2,y0=y-dy/2,y1=y+dy/2,z0=z-dz/2,z1=z+dz/2;
 const faces=[[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]],[[x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1]],[[x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1]],[[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]],[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],[[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]]];for(const [a,b,c,d] of faces){tri(a,b,c,color);tri(a,c,d,color)}}
 function sphere(x,y,z,rx,ry,rz,color,segments=9,rings=7){for(let i=0;i<rings;i++){const a=-Math.PI/2+i*Math.PI/rings,b=-Math.PI/2+(i+1)*Math.PI/rings;for(let j=0;j<segments;j++){const aa=j*2*Math.PI/segments,bb=(j+1)*2*Math.PI/segments;const p=(phi,theta)=>[x+rx*Math.cos(phi)*Math.cos(theta),y+ry*Math.sin(phi),z+rz*Math.cos(phi)*Math.sin(theta)];let p1=p(a,aa),p2=p(a,bb),p3=p(b,bb),p4=p(b,aa);tri(p1,p2,p3,color);tri(p1,p3,p4,color)}}}
 function cone(x,y,z,baseR,height,color,segments=9){for(let i=0;i<segments;i++){const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;tri([x+baseR*Math.cos(a),y,z+baseR*Math.sin(a)],[x+baseR*Math.cos(b),y,z+baseR*Math.sin(b)],[x,y+height,z],color)}}
 function cylinder(x,y,z,rx,height,color,segments=10){for(let i=0;i<segments;i++){let a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;let x1=x+rx*Math.cos(a),z1=z+rx*Math.sin(a),x2=x+rx*Math.cos(b),z2=z+rx*Math.sin(b);tri([x1,y,z1],[x2,y,z2],[x2,y+height,z2],color);tri([x1,y,z1],[x2,y+height,z2],[x1,y+height,z1],color);tri([x,y+height,z],[x1,y+height,z1],[x2,y+height,z2],color)}}
 function segment(a,b,r,color,sides=7){
  // A real oriented 3D limb, not a flat rectangle or CSS imitation.
  const v=b.map((n,i)=>n-a[i]),len=Math.hypot(...v);
  if(len<.0001)return;
  const dir=v.map(n=>n/len),axis=Math.abs(dir[1])>.86?[1,0,0]:[0,1,0];
  const cross=(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]];
  const u=cross(dir,axis),ul=Math.hypot(...u)||1,unit=u.map(n=>n/ul);
  const w=cross(dir,unit);
  const circle=(point,theta)=>point.map((v,i)=>v+r*(unit[i]*Math.cos(theta)+w[i]*Math.sin(theta)));
  for(let i=0;i<sides;i++){
   const theta=i*Math.PI*2/sides,next=(i+1)*Math.PI*2/sides;
   const a0=circle(a,theta),a1=circle(a,next),b0=circle(b,theta),b1=circle(b,next);
   tri(a0,a1,b1,color);tri(a0,b1,b0,color);
  }
 }
 return {box,sphere,cone,cylinder,segment,data:()=>new Float32Array(values),size:()=>values.length/9};}
function staticWorld(partyBackdrop=false){const m=mesh();
 if(!partyBackdrop){
 // Bridge, suspended in the sky, with depth and solid structural rails.
 m.box(0,-.72,12,22,1.4,110,COLORS.roadSide);m.box(0,.08,12,21.7,.19,110,COLORS.road);
 // Wide friendly stepping stones and glowing trim guide little players forward.
 for(let z=-38;z<=60;z+=4){
   m.box(0,.19,z,20,.025,.08,'#c7c2d0');
   m.box(-9.9,.22,z,.13,.05,1.7,COLORS.cyan);
   m.box(9.9,.22,z,.13,.05,1.7,COLORS.cyan);
 }
 for(let z=-34;z<=38;z+=7.5){
   for(const side of [-1,1]){
     m.box(side*9.05,.25,z,1.15,.07,.55,'#ffcc99');
     m.box(side*8.2,.23,z,1.4,.045,.1,'#d8eff3');
   }
 }
 // Gold capped rail posts, each with a glowing frosted glass lantern.
 for(let z=-38;z<=60;z+=7){
   for(const x of [-10.7,10.7]){
     m.box(x,1.2,z,.5,2.5,.55,COLORS.steel);
     m.box(x,2.52,z,.82,.24,.82,COLORS.gold);
     m.sphere(x,2.87,z,.35,.39,.35,'#fff4be',8,5);
   }
 }
 for(const x of [-10.7,10.7]){m.box(x,2.05,12,.20,.27,110,COLORS.glass);m.box(x,-.48,12,.32,.3,110,COLORS.dark)}
 for(let z=-28;z<=60;z+=14){
   m.cone(-3.7,-9,z,5.9,-10,COLORS.stone);
   m.cone(5,-9,z,4.4,-8,'#38415f');
   m.sphere(-3.7,-10,z,2.3,1.5,2.2,'#766e91',8,5);
 }
 }
 // Floating architectural islands, waterfalls, towers, gardens.
 for(let i=0;i<20;i++){const side=i%2?1:-1,x=side*(22+(i%4)*9),z=11+i*9+(i%3)*8,y=-1+(i%4)*3;
 m.sphere(x,y-3,z,11+(i%4)*2,6,10,COLORS.stone,9,6);m.box(x,y+.3,z,22+(i%4)*3,.7,20,COLORS.grass);
 for(let j=0;j<2;j++){
   const bx=x+(j?5:-4),bz=z+(j?3:-5),height=7+(i+j*7)%19;
   const facade=['#5b7797','#8b6f9c','#688f9b','#937ca8'][i%4];
   m.box(bx,y+height/2+.7,bz,4.5,height,5.2,facade);
   m.box(bx,y+height+.95,bz,6,.85,6,i%3?'#f3b48c':'#9edbd4');
   m.sphere(bx,y+height+1.67,bz,1.6,.82,1.65,i%3?'#ffca91':'#a8e6de',10,6);
   for(let k=3;k<height;k+=3.6){
     for(const offset of [-1.05,1.05]){
       m.box(bx+offset,y+k,bz-2.64,.86,1.25,.15,k%2?'#ffe5ae':'#b1f3fa');
       m.box(bx+offset,y+k,bz+2.64,.86,1.25,.15,'#c9d4ee');
     }
   }
   m.box(bx,y+.8,bz-2.69,2.1,1.5,.16,'#ffc8b4');
 }
 if(i%2===0){m.box(x+side*10,y-6,z+5,1.5,11,2,'#74cde9');m.box(x+side*11,y-8,z+5,1,6,2,'#83dcfa')}
 for(let j=0;j<3;j++){
   const tx=x-8+j*8,tz=z+((j*7+i)%11)-5;
   m.cylinder(tx,y+.4,tz,.42,3.8,COLORS.trunk,7);
   m.sphere(tx,y+5,tz,2.8,3.2,2.7,j===1?'#8ccf9a':COLORS.leaves,8,5);
   m.sphere(tx-1.1,y+6,tz-.6,1.45,1.1,1.55,'#add6a6',8,5);
 }
 // Candy coloured market stalls and little flower bushes on the green islands.
 for(let j=0;j<3;j++){
    const ax=x-6+j*6,az=z+7-j*5;
    m.sphere(ax,y+.9,az,.95,.84,.93,j===1?'#ef9abc':'#b7e59b',8,5);
    m.sphere(ax+.55,y+1.48,az-.3,.32,.32,.32,'#ffe3a6',7,4);
 }
 }
 // Distant reactor at the end of the bridge, giant frame and cyan core.
 m.cylinder(0,.1,87,11,4,'#35516b',14);m.cylinder(0,4,87,5,47,'#263b63',14);
 m.cylinder(0,7,87,3.5,42,'#63d8f4',12);m.cylinder(0,50,87,8,1.2,COLORS.gold,14);
 for(let k=0;k<5;k++){const z=87,x=Math.cos(k*Math.PI*2/5)*9,y=8;m.box(x,y+19,z+Math.sin(k*Math.PI*2/5)*9,1.8,38,1.8,COLORS.steel)}
 if(!partyBackdrop){
 // Trees and lanterns near the route.
 for(let z=-32;z<65;z+=8){for(const side of [-1,1]){const x=side*(13.5+(Math.floor(z)%3)*2);m.cylinder(x,0,z,.48,4.8,COLORS.trunk,8);m.sphere(x,6,z,3.7,3.6,3.2,z%2?'#438271':'#6da98c',9,6);m.sphere(x-1.1,7.8,z,2.4,2.3,2.2,'#76aa84',9,6);}}
 // Massive arched finish-line and background scenery.
 for(let x of [-8.5,8.5]){
   m.box(x,6,36,1.3,12,1.3,COLORS.gold);
   m.sphere(x,12.3,36,1.25,1.26,1.25,'#fff1bc',11,7);
 }
 m.box(0,12,36,18.3,1.1,1.4,COLORS.gold);
 m.box(0,13,36,12,.65,1.4,COLORS.cyan);
 m.sphere(0,13.6,36,3.5,1.15,1.1,'#e8a9d6',12,7);
 for(let i=0;i<9;i++){
   const a=i*2*Math.PI/9;
   m.sphere(Math.sin(a)*7.2,12.95+Math.cos(a)*.7,35.25,.32,.32,.33,'#fff3c2',8,5);
 }
 }
 // Soft layered 3D candy clouds, framed in the distant sunset sky.
 const clouds=[
   [-39,40,85],[-23,51,120],[34,47,101],[49,35,137],[-54,46,155]
 ];
 for(const [x,y,z] of clouds){
   m.sphere(x,y,z,9,2.8,5.4,'#f3c8d8',10,6);
   m.sphere(x+5,y+1,z-.5,7,3.8,5.5,'#f9d6d0',10,6);
   m.sphere(x-5,y+.5,z+1,6,2.5,5.2,'#cab9d9',9,5);
 }
 // Scenic sun, rendered in-world against the CSS gradient.
 m.sphere(-45,70,165,16,16,4,'#ffe2b5',18,12);
 return m.data();}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function look(eye,target){const normal=v=>{const len=Math.hypot(...v)||1;return v.map(a=>a/len)};const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);const back=normal(eye.map((v,i)=>v-target[i])),right=normal(cross(back,[0,1,0])),up=normal(cross(right,back));return new Float32Array([right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,-dot(right,eye),-dot(up,eye),-dot(back,eye),1]);}
function drawRebuiltCity(m,season,time){
 const city=cityProgress(season);
 const palette=['#66d9d4','#f9c686','#a8afff','#fa9fc5','#adf1be'];
 // A scaffold is present from week one; every 3 completed rounds adds a tower.
 for(let i=0;i<9;i++){
  const side=i%2?1:-1,depth=1+Math.floor(i/2);
  const x=side*(19.5+(depth%3)*2.4),z=8+depth*8;
  const unlocked=i<city.completedLandmarks,foundationY=-1.1;
  m.sphere(x,foundationY-3,z,5.2,3.1,5.3,'#3f5471',9,5);
  m.cylinder(x,foundationY+.12,z,4.6,.5,unlocked?'#5d9b86':'#587580',9);
  const height=unlocked?8+(i%3)*3:2.5;
  const tint=unlocked?palette[i%palette.length]:'#627188';
  if(unlocked){
    m.box(x,foundationY+height/2+.4,z,3.6,height,3.9,'#354967');
    for(let floor=2;floor<height;floor+=2.6){
      m.box(x,foundationY+floor,z-2.02,2.65,.21,.18,tint);
    }
    m.sphere(x,foundationY+height+1.65,z,2.8,1.3,2.8,tint,10,6);
    m.sphere(x,foundationY+height+3.0+Math.sin(time*.001+i)*.2,z,.63,.64,.63,'#fff2b1',9,6);
    m.segment([x,foundationY+height+1.9,z],[x,foundationY+height+4.2,z],.12,'#e2eef3',6);
  } else {
    // Construction site with cranes waiting for the next successful delivery.
    for(let sidepost of [-1,1])m.box(x+sidepost*1.6,foundationY+height/2+.4,z,.24,height,.24,'#d8b783');
    m.box(x,foundationY+height+.4,z,3.6,.19,.32,'#d8b783');
  }
 }
 for(let i=0;i<city.activeBalloons;i++){
   const side=i%2?1:-1,x=side*(15+i%3*2.1),z=9+i*5;
   const y=8+Math.sin(time*.001+i*1.6)*.45+(i%3)*2;
   m.segment([x,y-4,z],[x,y-1,z],.075,'#ccd9e5',5);
   m.sphere(x,y,z,1.25,1.67,1.1,palette[i%palette.length],10,6);
   m.box(x,y-1.95,z,1,.59,.76,'#81647c');
 }
 // Every fifth mission celebrates the city's new chapter.
 if(city.celebration){
   for(let i=0;i<14;i++){
    const x=(i%2?1:-1)*(5.5+(i%3)*.8),z=25+i%5*2;
    const y=7+((time*.0013+i*.49)%6);
    m.box(x,y,z,.24,.28,.13,palette[i%palette.length]);
   }
 }
}
function generateDynamic(state,id,t,crashElapsedMs=Infinity){const m=mesh(),me=state?.players?.[id]||{x:0,z:-5,team:0};const teams=state?.teams||[];const team=teams[me.team]||{couch:{x:0,z:1,wobble:0},cargo:'bank',fanOff:false,gate:false};
 // Visual signature for the current mission twist, using no extra database fields.
 const twist=missionFor(team.round||state?.season?.round||1,me.team,team.cargo).twist;
 for(let i=0;i<4;i++){
  const z=7+i*4.5;
  if(twist==='wind'){
   const sway=Math.sin(t*.003+i)*.35;
   m.box(-7.5+sway,1.1,z,.22,1.8,.22,'#7bedf3');
   m.cone(-7.5+sway,2.03,z,.85,1.1,'#a1f7fd',6);
   m.box(7.5-sway,1.1,z,.22,1.8,.22,'#7bedf3');
  } else if(twist==='sticky'){
   m.sphere((i%2?2.2:-2.2),.29,z,2.8,.14,1.7,'#eb8ed7',11,5);
   m.sphere((i%2?1.2:-1.2),.39,z+.7,1.3,.12,.85,'#ffd0ed',9,4);
  } else if(twist==='bouncy'){
   m.sphere(-6,.39,z,1.4,.27,1.5,'#e8c477',10,5);
   m.sphere(6,.39,z,1.4,.27,1.5,'#e8c477',10,5);
   m.box(0,.32,z,9,.05,.38,'#8efae8');
  }
 }
 // Floating motes, like a playful animated fairy-tale village.
 for(let i=0;i<13;i++){
   const phase=t*.0007+i*1.78;
   const x=me.x+Math.sin(i*11.37+phase)*(3.5+i%4*1.4);
   const z=me.z+7+Math.cos(i*4.11+phase)*8;
   const y=3.7+(i%5)*.86+Math.sin(phase*2.3)*.36;
   const tint=i%3===0?'#ffdfaa':i%3===1?'#a8f0f5':'#f3b9db';
   m.sphere(x,y,z,.09,.11,.09,tint,6,4);
 }
 // Giant props that wobble and bounce depending on real shared state.
 const c=team.couch,px=c.x,pz=c.z,tilt=c.wobble||0,bounce=Math.sin(t*.003)*.07;
 m.sphere(px,.216,pz,3.9,.035,2.6,'#4a5b76',11,5);
 if(team.cargo==='pudding'){
  const wob=Math.sin(t*.008)*Math.min(.45,.14+tilt*.15);
  m.sphere(px+wob,2.05+bounce,pz,3.5+wob,2.25-wob*.4,2.3,COLORS.jelly,14,9);
  m.sphere(px-wob*.6,2.7+bounce,pz,2.8,1.5+wob*.45,2.1,COLORS.jellyLight,13,8);
  for(const x of [-.95,.95]){
   m.sphere(px+x+wob,2.77+bounce,pz-2.03,.46,.51,.19,COLORS.white,9,6);
   m.sphere(px+x+wob+.1,2.77+bounce,pz-2.23,.2,.28,.11,COLORS.black,8,5);
  }
  m.sphere(px+wob,1.69+bounce,pz-2.25,.42,.25,.11,COLORS.black,10,6);
 }
 else if(team.cargo==='wasmachine'){
  const spin=Math.sin(t*.007)*.25;
  m.box(px,2.25+bounce,pz,4.5,4.5,3.3,COLORS.washer);
  m.box(px,4.1+bounce,pz-1.7,3.8,.6,.1,COLORS.glass);
  m.cylinder(px,2.2+bounce,pz-1.75,1.25,.22,COLORS.dark,12);
  m.sphere(px,2.2+bounce,pz-1.88,.97,.97,.15,'#70b0d0',14,9);
  for(let i=0;i<3;i++){
    const a=t*.005+i*2*Math.PI/3;
    m.sphere(px+Math.cos(a)*.57,2.2+bounce+Math.sin(a)*.57,pz-2.01,.31,.31,.08,i===1?'#fbb7c7':'#d8ffff',8,5);
  }
  m.sphere(px-1.54,4.1+bounce,pz-1.77,.16,.16,.12,spin>0?'#72ffd0':'#ffb76a',8,4);
 }
 else {
  m.box(px,1.1+bounce,pz,5.8,1.4,2.7,COLORS.pink);
  m.box(px,2.05+bounce+tilt*.2,pz+.75,5.6,1.7,1.1,'#e1a2a0');
  m.box(px-2.8,1.9+bounce-tilt*.4,pz,1.2,2,3,COLORS.pink);
  m.box(px+2.8,1.9+bounce+tilt*.4,pz,1.2,2,3,COLORS.pink);
  for(let x of [-1.5,0,1.5])m.box(px+x,1.68+bounce,pz-.4,1.45,.42,1.7,'#efb09d');
  for(const x of [-2.15,2.15])m.box(px+x,.4,pz+.6,.42,.7,.52,'#5d4763');
 }
 drawRebuiltCity(m,state?.season||{},t);
 // Giant noisy fan, amber switch and the bridge gate.
 m.box(-5.4,1.25,12,1.2,2.5,1.2,COLORS.steel);m.cylinder(-5.4,3.05,12,.78,.6,team.fanOff?'#78cbb1':COLORS.gold,9);
 if(!team.fanOff){for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.009,x=-5.4+Math.cos(a)*1.3,z=12+Math.sin(a)*1.3;m.box(x,3.2,z,1.1,.14,.9,COLORS.glass)}}
 if(!team.gate)m.box(0,3,22,19,1,1.3,'#eb987f');
 m.box(6,1,19,.95,2,.9,team.gate?'#6af9d8':COLORS.gold);
 // Render teammates only, so the six teams are together in one class world without visual overload.
 // Stable player order is essential: clothes and faces must not swap when players pass.
 const roster=state?.roster||[];
 const rank=uid=>{const i=roster.indexOf(uid);return i<0?999:i;};
 let players=Object.entries(state?.players||{}).filter(([otherId,p])=>p.team===me.team)
   .sort((a,b)=>rank(a[0])-rank(b[0]));
 if(!players.length)players=[[id,me]];
 const palette=['#f9ca66','#7fd1eb','#e09ada','#94d8a0','#fa95a6'];
 function avatar(p,index,isMe){
  const x=p.x,z=p.z,pose=cartoonPose(p,t,index,crashElapsedMs);
  const color=palette[index%5],lean=pose.lean,co=Math.cos(lean),si=Math.sin(lean);
  // Pivot at the pelvis. Head and shoulders can flop sideways when cargo crashes.
  const bone=(lx,ly,lz=0)=>{
    const dy=ly-1.14;
    return [x+co*lx+si*dy,Math.max(.13,1.14+co*dy-si*lx-pose.squash*.11+pose.bounce),z+lz];
  };
  const ball=(point,rx,ry,rz,tint,detail=8)=>m.sphere(...point,rx,ry,rz,tint,detail,6);
  const skin=index%5===2?'#d6a088':index%5===4?'#a9795e':COLORS.skin;
  // Ground shadow and two independent chunky shoes.
  ball([x,.13,z],1.28,.10,.75,'#263348',8);
  for(const side of [-1,1]){
    const swing=pose.feetSwing*side;
    const hip=bone(side*.51,1.55,.05);
    const knee=[x+side*.58,.77,z+swing*.37];
    const ankle=[x+side*.64,.35,z-.06+swing];
    m.segment(hip,knee,.29,color,7);m.segment(knee,ankle,.29,'#273657',7);
    ball(knee,.29,.27,.3,color);
    ball([ankle[0],.31,ankle[2]-.44],.59,.36,.68,COLORS.black,10);
    ball([ankle[0],.2,ankle[2]-.85],.35,.1,.16,'#4a5b72',8);
  }
  // Squash-and-stretch torso plus 3D hoodie and satchel.
  const belly=bone(0,2.25,0),head=bone(0,4.12,-.06);
  ball(belly,1.1,1.14-pose.squash*.12,.88,color,11);
  ball(bone(0,2.35,-.86),.55,.38,.18,isMe?'#b3ffee':'#f2d69a',8);
  ball(bone(0,2.25,.83),.78,.8,.35,'#344562',8);
  for(const side of [-1,1]){
    const shoulder=bone(side*.92,2.96,-.03);
    const elbow=bone(side*(1.49+pose.squash*.22),2.25+pose.armSwing*side,-.07);
    const hand=pose.handsUp
      ?bone(side*1.68,3.32+Math.abs(pose.armSwing)*.2,-.28)
      :bone(side*1.78,1.67+pose.armSwing*side,-.3);
    m.segment(shoulder,elbow,.32,color,7);
    m.segment(elbow,hand,.29,color,7);
    ball(elbow,.31,.31,.31,color);
    ball(hand,.39,.38,.37,skin,8);
  }
  ball(bone(0,3.4,0),.43,.53,.46,skin);
  ball(head,1.22,1.10,1.1,skin,13);
  // Big eyes and blinking pupils, with a mouth that opens during a fall.
  for(const side of [-1,1]){
    const eye=bone(side*.44,4.27,-.99);
    ball(eye,.27,pose.blink?.07:.27,.19,COLORS.white,9);
    ball(bone(side*.44+side*.04,4.26,-1.17),.115,pose.blink?.045:.16,.085,COLORS.black,8);
    ball(bone(side*.88,3.93,-.79),.27,.20,.15,'#edb7a6',8);
  }
  ball(bone(0,4.02,-1.11),.21,.17,.18,'#c28d76',9);
  ball(bone(0,3.70,-1.14),pose.mouthOpen?.36:.34,pose.mouthOpen?.38:.12,.11,'#653b4a',10);
  if(!pose.mouthOpen && !pose.handsUp)ball(bone(.03,3.67,-1.25),.13,.06,.08,'#fff0c5',8);
  // Five different outrageous headpieces, assigned by team seat.
  const top=bone(0,5.05,0);
  switch(index%5){
    case 0:
      ball(top,1.23,.33,1.09,'#233453',11);
      m.cone(top[0]-.46,top[1]+.08,top[2],.43,.72,'#354e79',9);
      break;
    case 1:
      ball(top,1.22,.25,1.15,'#ffba74',12);
      m.box(top[0],top[1]-.12,top[2]-.91,1.28,.16,.7,'#ffd48b');
      break;
    case 2:
      m.segment([top[0],top[1]-.1,top[2]],[top[0],top[1]+.78,top[2]],.09,'#9eecec',6);
      ball([top[0],top[1]+.81,top[2]],.36,.37,.36,'#d9b0f4',9);
      break;
    case 3:
      for(const side of [-1,1])ball(bone(side*.58,4.3,-1.12),.5,.39,.25,'#345c79',9);
      m.box(...bone(0,4.30,-1.2),.37,.13,.2,'#fff2bf');
      break;
    default:
      ball(top,1.2,.34,1.06,'#ee9fc0',11);
      for(const side of [-1,1])ball(bone(side*.8,5.15,-.3),.52,.58,.55,'#f4bed6',8);
  }
  if(isMe){
    const glow=bone(0,5.9,0);
    ball(glow,.24,.3,.24,'#a1fff1',8);
  }
  if(p.grip){
    const shine=bone(0,5.68,0);
    ball(shine,.29,.26,.29,COLORS.gold,9);
  }
  if(pose.impact>.15){
    for(let k=0;k<3;k++){
      const a=t*.009+k*2.09;
      const center=bone(Math.cos(a)*1.18,5.82+Math.sin(a*2)*.13,Math.sin(a)*.55);
      ball(center,.17,.17,.17,k===1?'#fff8c8':'#f7d477',7);
    }
  }
 }
 players.forEach(([pId,p],i)=>avatar(p,i,pId===id));
 if(state?.practice){avatar({x:me.x+2.1,z:me.z-.3,grip:me.grip,stumble:0},3,false)}
 if(team.finished){
  const confetti=['#ffdc89','#96f9e1','#f3a5cf','#b5baff','#fff5ca'];
  for(let i=0;i<28;i++){
   const angle=i*2.399,dist=3+(i%5)*1.2;
   const y=2.0+((t*.0018+i*.33)%6.5);
   const x=c.x+Math.cos(angle+t*.0005)*dist,z=c.z+Math.sin(angle+t*.0005)*dist;
   m.box(x,y,z,.22,.3,.13,confetti[i%confetti.length]);
  }
 }
 return m.data();}
export function create3D(canvas){const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,depth:true,powerPreference:'high-performance'});if(!gl)return null;
 function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
 const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,VS));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));gl.useProgram(prog);
 const positions=[['aPosition',0],['aNormal',3],['aColor',6]];const attrib=positions.map(([name])=>gl.getAttribLocation(prog,name));const projection=gl.getUniformLocation(prog,'uProjection'),view=gl.getUniformLocation(prog,'uView'),cameraWorld=gl.getUniformLocation(prog,'uCameraWorld');
 function bind(buffer,data,usage){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,usage);positions.forEach(([,offset],i)=>{gl.enableVertexAttribArray(attrib[i]);gl.vertexAttribPointer(attrib[i],3,gl.FLOAT,false,36,offset*4)});}
 const staticBuffer=gl.createBuffer(),backdropBuffer=gl.createBuffer(),partyBuffer=gl.createBuffer(),dynamicBuffer=gl.createBuffer();
 const staticData=staticWorld(),backdropData=staticWorld(true);
 const flags={original:false,backdrop:false,party:false};
 let partyData=null,visualMode='laden',camX=0,camZ=-5,last=0,lastEventKey=null,impactAt=-1e8;
 function existing(buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);positions.forEach(([,offset],i)=>{gl.enableVertexAttribArray(attrib[i]);gl.vertexAttribPointer(attrib[i],3,gl.FLOAT,false,36,offset*4)});}
 function fixed(buffer,data,key){if(!flags[key]){bind(buffer,data,gl.STATIC_DRAW);flags[key]=true;}else existing(buffer);gl.drawArrays(gl.TRIANGLES,0,data.length/9);}
 // Fetch once per device; no Firebase reads or updates for the graphics.
 // A failed/old iPad keeps the already working classical world.
 fetch(import.meta.env.BASE_URL+'models/squad-party-world.glb')
  .then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.arrayBuffer();})
  .then(buffer=>{const converted=partyWorldTriangles(buffer);partyData=converted.data;visualMode='party';console.info('SQUAD Zweefstad geladen',converted.triangles,'driehoeken');})
  .catch(err=>{visualMode='classic';console.warn('SQUAD Zweefstad niet geladen; veilig terug naar klassiek',err.message);});
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
 return {mode(){return visualMode},draw(state,id,time){const dpr=Math.min(devicePixelRatio||1,1.5),w=canvas.clientWidth||400,h=canvas.clientHeight||800;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  let own=state?.players?.[id]||{x:0,z:-5};const dt=Math.min(.075,(time-last)/1000||.016);last=time;let follow=1-Math.exp(-dt*3.6);camX+=((own.x||0)-camX)*follow;camZ+=((own.z||-5)-camZ)*follow;
  const current=state?.teams?.[own.team]||{};
  const eventKey=`${state?.season?.round||1}:${own.team||0}:${current.eventSeq||0}`;
  if(eventKey!==lastEventKey){
    if(lastEventKey!==null&&/KLABAM|O NEE|BOEM/.test(current.event||''))impactAt=time;
    lastEventKey=eventKey;
  }
  const sinceImpact=time-impactAt,shake=sinceImpact<550?(1-sinceImpact/550):0;
  const aspect=w/h;gl.uniformMatrix4fv(projection,false,perspective((aspect<.7?66:54)*Math.PI/180,aspect,.1,420));
  const eye=[camX+shake*Math.sin(time*.09)*.32,9.4+shake*Math.cos(time*.076)*.13,camZ-17];
  gl.uniform3f(cameraWorld,...eye);
  gl.uniformMatrix4fv(view,false,look(eye,[camX,1.8,camZ+19]));
  if(partyData){
   fixed(backdropBuffer,backdropData,'backdrop');
   fixed(partyBuffer,partyData,'party');
  }else fixed(staticBuffer,staticData,'original');
  const dynamic=generateDynamic(state,id,time,sinceImpact);bind(dynamicBuffer,dynamic,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,dynamic.length/9);
 }};
}
