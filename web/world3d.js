// SQUAD: lightweight native WebGL2 renderer; no external scripts or dependencies.
// All geometry is real triangles viewed through a perspective camera.
const VS = `#version 300 es
precision highp float;
in vec3 aPosition; in vec3 aNormal; in vec3 aColor;
uniform mat4 uProjection; uniform mat4 uView;
out vec3 vNormal; out vec3 vColor; out float vDepth;
void main(){vec4 camera=uView*vec4(aPosition,1.0);gl_Position=uProjection*camera;vDepth=-camera.z;vColor=aColor;vNormal=aNormal;}`;
const FS = `#version 300 es
precision mediump float;
in vec3 vNormal;in vec3 vColor;in float vDepth;
out vec4 outColor;
void main(){vec3 sun=normalize(vec3(-0.55,0.9,-0.5));float diffuse=max(0.0,dot(normalize(vNormal),sun));float shade=0.55+diffuse*0.5;vec3 col=vColor*shade;float fog=smoothstep(38.0,175.0,vDepth);col=mix(col,vec3(0.76,0.55,0.67),fog*.72);outColor=vec4(col,1.0);}`;
const COLORS={road:'#6e8191',roadSide:'#314861',roadEdge:'#97bec5',gold:'#efbd6d',cyan:'#59dce9',glass:'#85dcf3',steel:'#355b74',stone:'#45506b',grass:'#4c8a76',cloud:'#8f9eb7',trunk:'#574946',leaves:'#468879',skin:'#e0ae8f',black:'#21324b',white:'#e9e9de',pink:'#d98599',jelly:'#e17bc6',jellyLight:'#ffb8dc',washer:'#b5d8e2',dark:'#15283d'};
const rgb=(s)=>{let h=s.replace('#','');return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];};
function mesh(){const values=[];
 function vertex(p,n,c){values.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2]);}
 function tri(a,b,c,color,normal=null){const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];const n=normal||[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];const d=Math.hypot(...n)||1,norm=n.map(v=>v/d),col=rgb(color);vertex(a,norm,col);vertex(b,norm,col);vertex(c,norm,col);}
 function box(x,y,z,dx,dy,dz,color){let x0=x-dx/2,x1=x+dx/2,y0=y-dy/2,y1=y+dy/2,z0=z-dz/2,z1=z+dz/2;
 const faces=[[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]],[[x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1]],[[x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1]],[[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]],[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],[[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]]];for(const [a,b,c,d] of faces){tri(a,b,c,color);tri(a,c,d,color)}}
 function sphere(x,y,z,rx,ry,rz,color,segments=9,rings=7){for(let i=0;i<rings;i++){const a=-Math.PI/2+i*Math.PI/rings,b=-Math.PI/2+(i+1)*Math.PI/rings;for(let j=0;j<segments;j++){const aa=j*2*Math.PI/segments,bb=(j+1)*2*Math.PI/segments;const p=(phi,theta)=>[x+rx*Math.cos(phi)*Math.cos(theta),y+ry*Math.sin(phi),z+rz*Math.cos(phi)*Math.sin(theta)];let p1=p(a,aa),p2=p(a,bb),p3=p(b,bb),p4=p(b,aa);tri(p1,p2,p3,color);tri(p1,p3,p4,color)}}}
 function cone(x,y,z,baseR,height,color,segments=9){for(let i=0;i<segments;i++){const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;tri([x+baseR*Math.cos(a),y,z+baseR*Math.sin(a)],[x+baseR*Math.cos(b),y,z+baseR*Math.sin(b)],[x,y+height,z],color)}}
 function cylinder(x,y,z,rx,height,color,segments=10){for(let i=0;i<segments;i++){let a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;let x1=x+rx*Math.cos(a),z1=z+rx*Math.sin(a),x2=x+rx*Math.cos(b),z2=z+rx*Math.sin(b);tri([x1,y,z1],[x2,y,z2],[x2,y+height,z2],color);tri([x1,y,z1],[x2,y+height,z2],[x1,y+height,z1],color);tri([x,y+height,z],[x1,y+height,z1],[x2,y+height,z2],color)}}
 return {box,sphere,cone,cylinder,data:()=>new Float32Array(values),size:()=>values.length/9};}
function staticWorld(){const m=mesh();
 // Bridge, suspended in the sky, with depth and solid structural rails.
 m.box(0,-.72,12,22,1.4,110,COLORS.roadSide);m.box(0,.08,12,21.7,.19,110,COLORS.road);
 for(let z=-38;z<=60;z+=4){m.box(0,.19,z,20,.025,.08,'#8ca3af');m.box(-9.9,.22,z,.13,.05,1.7,COLORS.cyan);m.box(9.9,.22,z,.13,.05,1.7,COLORS.cyan)}
 for(let z=-38;z<=60;z+=7){for(const x of [-10.7,10.7]){m.box(x,1.2,z,.5,2.5,.55,COLORS.steel);m.box(x,2.5,z,.32,.32,.55,COLORS.gold);}}
 for(const x of [-10.7,10.7]){m.box(x,2.05,12,.20,.27,110,COLORS.glass);m.box(x,-.48,12,.32,.3,110,COLORS.dark)}
 for(let z=-28;z<=60;z+=14){m.cone(-3.7,-9,z,5.9,-10,COLORS.stone);m.cone(5,-9,z,4.4,-8,'#38415f')}
 // Floating architectural islands, waterfalls, towers, gardens.
 for(let i=0;i<20;i++){const side=i%2?1:-1,x=side*(22+(i%4)*9),z=11+i*9+(i%3)*8,y=-1+(i%4)*3;
 m.sphere(x,y-3,z,11+(i%4)*2,6,10,COLORS.stone,9,6);m.box(x,y+.3,z,22+(i%4)*3,.7,20,COLORS.grass);
 for(let j=0;j<2;j++){const bx=x+(j?5:-4),bz=z+(j?3:-5),height=7+(i+j*7)%19;m.box(bx,y+height/2+.7,bz,4.5,height,5.2,i%3?'#34536d':'#4c5978');m.box(bx,y+height+1,bz,6,.8,6,COLORS.gold);for(let k=3;k<height;k+=4)m.box(bx,y+k,bz+2.65,3,.27,.12,COLORS.glass)}
 if(i%2===0){m.box(x+side*10,y-6,z+5,1.5,11,2,'#74cde9');m.box(x+side*11,y-8,z+5,1,6,2,'#83dcfa')}
 for(let j=0;j<3;j++){const tx=x-8+j*8,tz=z+((j*7+i)%11)-5;m.cylinder(tx,y+.4,tz,.42,3.8,COLORS.trunk,7);m.sphere(tx,y+5,tz,2.8,3.2,2.7,j===1?'#65a58a':COLORS.leaves,8,5)}}
 // Distant reactor at the end of the bridge, giant frame and cyan core.
 m.cylinder(0,.1,87,11,4,'#35516b',14);m.cylinder(0,4,87,5,47,'#263b63',14);
 m.cylinder(0,7,87,3.5,42,'#63d8f4',12);m.cylinder(0,50,87,8,1.2,COLORS.gold,14);
 for(let k=0;k<5;k++){const z=87,x=Math.cos(k*Math.PI*2/5)*9,y=8;m.box(x,y+19,z+Math.sin(k*Math.PI*2/5)*9,1.8,38,1.8,COLORS.steel)}
 // Trees and lanterns near the route.
 for(let z=-32;z<65;z+=8){for(const side of [-1,1]){const x=side*(13.5+(Math.floor(z)%3)*2);m.cylinder(x,0,z,.48,4.8,COLORS.trunk,8);m.sphere(x,6,z,3.7,3.6,3.2,z%2?'#438271':'#6da98c',9,6);m.sphere(x-1.1,7.8,z,2.4,2.3,2.2,'#76aa84',9,6);}}
 // Massive arched finish-line and background scenery.
 for(let x of [-8.5,8.5])m.box(x,6,36,1.3,12,1.3,COLORS.gold);
 m.box(0,12,36,18.3,1.1,1.4,COLORS.gold);m.box(0,13,36,12,.65,1.4,COLORS.cyan);
 // Scenic sun, rendered in-world against the CSS gradient.
 m.sphere(-45,70,165,16,16,4,'#ffdbad',18,12);
 return m.data();}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function look(eye,target){const normal=v=>{const len=Math.hypot(...v)||1;return v.map(a=>a/len)};const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);const back=normal(eye.map((v,i)=>v-target[i])),right=normal(cross(back,[0,1,0])),up=normal(cross(right,back));return new Float32Array([right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,-dot(right,eye),-dot(up,eye),-dot(back,eye),1]);}
function generateDynamic(state,id,t){const m=mesh(),me=state?.players?.[id]||{x:0,z:-5,team:0};const teams=state?.teams||[];const team=teams[me.team]||{couch:{x:0,z:1,wobble:0},cargo:'bank',fanOff:false,gate:false};
 // Giant props that wobble and bounce depending on real shared server state.
 const c=team.couch,px=c.x,pz=c.z,tilt=c.wobble||0,bounce=Math.sin(t*.003)*.07;
 if(team.cargo==='pudding'){m.sphere(px,2.05+bounce,pz,3.5,2.3,2.3,COLORS.jelly,11,8);m.sphere(px,2.6+bounce,pz,2.7,1.5,2.1,COLORS.jellyLight,10,7);for(const x of [-.95,.95])m.sphere(px+x,2.6,pz-2,0.42,.42,.19,COLORS.black,7,5);}
 else if(team.cargo==='wasmachine'){m.box(px,2.25+bounce,pz,4.5,4.5,3.3,COLORS.washer);m.box(px,4.1+bounce,pz-1.7,3.8,.6,.1,COLORS.glass);m.cylinder(px,2.2+bounce,pz-1.75,1.25,.22,COLORS.dark,12);m.sphere(px,2.2+bounce,pz-1.88,.96,.96,.15,COLORS.glass,12,9);}
 else {m.box(px,1.1+bounce,pz,5.8,1.4,2.7,COLORS.pink);m.box(px,2.05+bounce+tilt*.2,pz+.75,5.6,1.7,1.1,'#e1a2a0');m.box(px-2.8,1.9+bounce-tilt*.4,pz,1.2,2,3,COLORS.pink);m.box(px+2.8,1.9+bounce+tilt*.4,pz,1.2,2,3,COLORS.pink);for(let x of [-1.5,0,1.5])m.box(px+x,1.68+bounce,pz-.4,1.45,.42,1.7,'#efb09d');}
 // Giant noisy fan, amber switch and the bridge gate.
 m.box(-5.4,1.25,12,1.2,2.5,1.2,COLORS.steel);m.cylinder(-5.4,3.05,12,.78,.6,team.fanOff?'#78cbb1':COLORS.gold,9);
 if(!team.fanOff){for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.009,x=-5.4+Math.cos(a)*1.3,z=12+Math.sin(a)*1.3;m.box(x,3.2,z,1.1,.14,.9,COLORS.glass)}}
 if(!team.gate)m.box(0,3,22,19,1,1.3,'#eb987f');
 m.box(6,1,19,.95,2,.9,team.gate?'#6af9d8':COLORS.gold);
 // Render teammates only, so the six teams are together in one class world without visual overload.
 let players=Object.entries(state?.players||{}).filter(([otherId,p])=>p.team===me.team).sort((a,b)=>b[1].z-a[1].z);
 if(!players.length)players=[[id,me]];
 const palette=['#f9ca66','#7fd1eb','#e09ada','#94d8a0','#fa95a6'];
 function avatar(p,index,isMe){const x=p.x,z=p.z,phase=t*.006+index,walk=p.stumble?0.6:0.18,shift=Math.sin(phase)*walk;const color=palette[index%5];
  // Clumsy big feet, tiny torso, cartoon overlarge head, moving arms, backpack.
  m.box(x-.58, .32+Math.max(0,shift), z-.15, .88,.62,1.05,COLORS.black);m.box(x+.58,.32+Math.max(0,-shift),z-.15,.88,.62,1.05,COLORS.black);
  m.box(x-.48,1.12,z,.48,1.3,.58,color);m.box(x+.48,1.12,z,.48,1.3,.58,color);
  m.sphere(x,2.5,z,1.17,1.27,.88,color,9,7);m.sphere(x,4.15,z-.05,1.18,1.1,1.1,COLORS.skin,11,8);
  m.sphere(x,4.71,z-.14,1.2,.57,1.1,COLORS.black,10,6);
  for(const side of [-1,1]){m.box(x+side*1.42,2.23+shift*side,z,.5,1.35,.55,color);m.sphere(x+side*1.42,1.45+shift*side,z,.33,.32,.33,COLORS.skin,8,5)}
  m.box(x,2.55,z-1,1.2,1.5,.57,COLORS.black);m.box(x,2.6,z-1.31,.72,.65,.15,isMe?'#85fff0':'#87c7e9');
  if(p.grip)m.box(x,5.4,z,.7,.3,.7,COLORS.gold);
  if(p.stumble)m.sphere(x,5.65,z,.18,.18,.18,'#fff6c0',7,4);
 }
 players.forEach(([pId,p],i)=>avatar(p,i,pId===id));
 if(state?.roster?.length===1){avatar({x:me.x+2.1,z:me.z-.3,grip:me.grip,stumble:0},3,false)}
 return m.data();}
export function create3D(canvas){const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,depth:true,powerPreference:'high-performance'});if(!gl)return null;
 function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
 const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,VS));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));gl.useProgram(prog);
 const positions=[['aPosition',0],['aNormal',3],['aColor',6]];const attrib=positions.map(([name])=>gl.getAttribLocation(prog,name));const projection=gl.getUniformLocation(prog,'uProjection'),view=gl.getUniformLocation(prog,'uView');
 function bind(buffer,data,usage){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,usage);positions.forEach(([,offset],i)=>{gl.enableVertexAttribArray(attrib[i]);gl.vertexAttribPointer(attrib[i],3,gl.FLOAT,false,36,offset*4)});}
 const staticBuffer=gl.createBuffer(),dynamicBuffer=gl.createBuffer(),staticData=staticWorld();let camX=0,camZ=-5,last=0;
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
 return {draw(state,id,time){const dpr=Math.min(devicePixelRatio||1,1.5),w=canvas.clientWidth||400,h=canvas.clientHeight||800;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  let own=state?.players?.[id]||{x:0,z:-5};const dt=Math.min(.075,(time-last)/1000||.016);last=time;let follow=1-Math.exp(-dt*3.6);camX+=((own.x||0)-camX)*follow;camZ+=((own.z||-5)-camZ)*follow;
  const aspect=w/h;gl.uniformMatrix4fv(projection,false,perspective((aspect<.7?66:54)*Math.PI/180,aspect,.1,420));gl.uniformMatrix4fv(view,false,look([camX,9.4,camZ-17],[camX,1.8,camZ+19]));
  bind(staticBuffer,staticData,gl.STATIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,staticData.length/9);
  const dynamic=generateDynamic(state,id,time);bind(dynamicBuffer,dynamic,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,dynamic.length/9);
 }};
}
