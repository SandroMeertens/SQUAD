/**
 * SQUAD partywereld: kleine, onafhankelijke GLB-naar-WebGL2 converter.
 * Deze converter laadt uitsluitend driehoeken met eenvoudige glTF-kleuren:
 * geen externe 3D-engine, WebGL-extensies of extra Firebase-verkeer.
 * De getekende laag is decoratief; de bestaande multiplayer-botsingen blijven leidend.
 */
const MAX_BYTES=12*1024*1024;
const MAX_TRIANGLES=125000;
const UNIT_SCALE=3.5;
const OFFSET_Z=13;
const OFFSET_Y=-3.22;
const IDENTITY=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const COMPONENT_BYTES={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const COMPONENTS={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function multiplication(a,b){
 const c=new Array(16).fill(0);
 for(let col=0;col<4;col++)for(let row=0;row<4;row++)
  for(let k=0;k<4;k++)c[row+col*4]+=a[row+k*4]*b[k+col*4];
 return c;
}
function nodeMatrix(n){
 if(n.matrix)return n.matrix;
 const [x,y,z,w]=n.rotation||[0,0,0,1], [sx,sy,sz]=n.scale||[1,1,1], [tx,ty,tz]=n.translation||[0,0,0];
 const xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;
 return [
  (1-2*(yy+zz))*sx,(2*(xy+wz))*sx,(2*(xz-wy))*sx,0,
  (2*(xy-wz))*sy,(1-2*(xx+zz))*sy,(2*(yz+wx))*sy,0,
  (2*(xz+wy))*sz,(2*(yz-wx))*sz,(1-2*(xx+yy))*sz,0,
  tx,ty,tz,1
 ];
}
function at(m,p,translate){
 const x=p[0],y=p[1],z=p[2];
 return [m[0]*x+m[4]*y+m[8]*z+(translate?m[12]:0),
         m[1]*x+m[5]*y+m[9]*z+(translate?m[13]:0),
         m[2]*x+m[6]*y+m[10]*z+(translate?m[14]:0)];
}
function normalise(v){const d=Math.hypot(...v)||1;return v.map(x=>x/d);}
function coord(p){return [-p[2]*UNIT_SCALE,p[1]*UNIT_SCALE+OFFSET_Y,p[0]*UNIT_SCALE+OFFSET_Z];}
function normal(n){return normalise([-n[2],n[1],n[0]]);}
export function readGlb(arrayBuffer){
 const buf=arrayBuffer instanceof ArrayBuffer?arrayBuffer:
  arrayBuffer.buffer.slice(arrayBuffer.byteOffset,arrayBuffer.byteOffset+arrayBuffer.byteLength);
 if(buf.byteLength>MAX_BYTES||buf.byteLength<28)throw Error('3D-wereld is te groot of onvolledig.');
 const dv=new DataView(buf);
 if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==buf.byteLength)
   throw Error('Geen geldig GLB 2.0-model.');
 let json=null,binary=null;
 for(let off=12;off+8<=buf.byteLength;){
  const size=dv.getUint32(off,true),kind=dv.getUint32(off+4,true);
  off+=8;if(off+size>buf.byteLength)throw Error('3D-model onvolledig.');
  if(kind===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,off,size)));
  if(kind===0x004e4942)binary=new DataView(buf,off,size);
  off+=size;
 }
 if(!json||!binary)throw Error('3D-model bevat geen geometrie.');
 // Lights are optional metadata; compressed meshes and external buffers are not supported.
 if((json.extensionsRequired||[]).some(x=>x!=='KHR_lights_punctual'))throw Error('3D-model vereist andere geometrie.');
 if((json.buffers||[]).length!==1||json.buffers[0].uri)throw Error('3D-model bevat externe bestanden.');
 return {json,binary};
}
function accessor(glb,id){
 const {json,binary}=glb,a=json.accessors?.[id],view=json.bufferViews?.[a?.bufferView];
 if(!a||!view||a.sparse||view.buffer!==0)throw Error('Niet-ondersteunde 3D-data.');
 const count=COMPONENTS[a.type],bytes=COMPONENT_BYTES[a.componentType];
 if(!count||!bytes||a.count>1500000)throw Error('Ongeldige 3D-coördinaten.');
 const stride=view.byteStride||count*bytes;
 const offset=(view.byteOffset||0)+(a.byteOffset||0);
 if(stride<count*bytes||offset+Math.max(0,a.count-1)*stride+count*bytes>binary.byteLength)
  throw Error('3D-coördinaten vallen buiten het bestand.');
 function scalar(off){
  switch(a.componentType){
   case 5120:return binary.getInt8(off);
   case 5121:return binary.getUint8(off);
   case 5122:return binary.getInt16(off,true);
   case 5123:return binary.getUint16(off,true);
   case 5125:return binary.getUint32(off,true);
   case 5126:return binary.getFloat32(off,true);
   default:throw Error('Niet-ondersteunde glTF-precisie.');
  }
 }
 function item(i){
  if(i<0||i>=a.count)throw Error('Ongeldige driehoeksindex.');
  const p=offset+i*stride,values=[];
  for(let n=0;n<count;n++){
   let v=scalar(p+n*bytes);
   if(a.normalized&&a.componentType!==5126){
    const max={5120:127,5121:255,5122:32767,5123:65535,5125:4294967295}[a.componentType];
    v=a.componentType===5120||a.componentType===5122?Math.max(-1,v/max):v/max;
   }
   values.push(v);
  }
  return values;
 }
 return {item,length:a.count};
}
const skipNode=name=>/^HERO_(?:kluns_|sofa_)/i.test(name)||/^OBST_/i.test(name);
function srgb(x){return Math.pow(Math.max(0,Math.min(1,x)),1/2.2);}
function materialColor(json,index){
 const mat=json.materials?.[index]||{};
 const color=mat.pbrMetallicRoughness?.baseColorFactor||[.84,.76,.89,1];
 return color.slice(0,3).map(srgb);
}
export function partyWorldTriangles(input){
 const glb=readGlb(input),json=glb.json;
 const values=[];
 let triangles=0,meshCount=0;
 function addMesh(node,m){
  const model=json.meshes[node.mesh];
  if(!model)return;
  for(const prim of model.primitives||[]){
   if((prim.mode??4)!==4||prim.attributes?.POSITION===undefined)continue;
   const vertices=accessor(glb,prim.attributes.POSITION);
   const normals=prim.attributes.NORMAL!==undefined?accessor(glb,prim.attributes.NORMAL):null;
   const indexes=prim.indices===undefined?null:accessor(glb,prim.indices);
   const amount=indexes?indexes.length:vertices.length;
   if(amount%3!==0)throw Error('Onvolledige driehoeken.');
   triangles+=amount/3;
   if(triangles>MAX_TRIANGLES)throw Error('3D-wereld is te zwaar voor de iPad.');
   const color=materialColor(json,prim.material);
   meshCount++;
   for(let i=0;i<amount;i+=3){
    const ids=[i,i+1,i+2].map(k=>indexes?indexes.item(k)[0]:k);
    const points=ids.map(k=>coord(at(m,vertices.item(k),true)));
    const ab=points[1].map((v,k)=>v-points[0][k]),ac=points[2].map((v,k)=>v-points[0][k]);
    const face=normalise([ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]);
    for(let j=0;j<3;j++){
     const n=normals?normal(at(m,normals.item(ids[j]),false)):face;
     values.push(...points[j],...n,...color);
    }
   }
  }
 }
 let visibleNodes=0;
 function visit(i,parent,excluded=false){
  const node=json.nodes?.[i];if(!node)return;
  const hidden=excluded||skipNode(node.name||'');
  const current=multiplication(parent,nodeMatrix(node));
  if(!hidden&&node.mesh!==undefined){visibleNodes++;addMesh(node,current);}
  for(const child of node.children||[])visit(child,current,hidden);
 }
 const roots=json.scenes?.[json.scene??0]?.nodes||[];
 for(const id of roots)visit(id,IDENTITY);
 if(!triangles)throw Error('De 3D-wereld bevat geen speelbare driehoeken.');
 return {data:new Float32Array(values),triangles,visibleNodes,meshCount};
}
