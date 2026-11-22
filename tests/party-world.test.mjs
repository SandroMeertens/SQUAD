import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {partyWorldTriangles,readGlb} from '../web/party-world.js';
const modelPath=new URL('../web/public/models/squad-party-world.glb',import.meta.url);
function fakeGlb(){
 const vertices=new Float32Array([0,0,0,1,0,0,0,0,1]);
 const indices=new Uint16Array([0,1,2]);
 const payload=new Uint8Array(44);
 payload.set(new Uint8Array(vertices.buffer),0);
 payload.set(new Uint8Array(indices.buffer),36);
 const gltf={
  asset:{version:'2.0'},buffers:[{byteLength:44}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}],
  accessors:[
   {bufferView:0,componentType:5126,count:3,type:'VEC3'},
   {bufferView:1,componentType:5123,count:3,type:'SCALAR'}
  ],
  materials:[{pbrMetallicRoughness:{baseColorFactor:[.3,.8,.5,1]}}],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],
  nodes:[{name:'HERO_wide_rounded_bridge',mesh:0},{name:'HERO_kluns_1_body',mesh:0}],
  scenes:[{nodes:[0,1]}],scene:0
 };
 const json=new TextEncoder().encode(JSON.stringify(gltf));
 const padded=Math.ceil(json.length/4)*4;
 const bytes=new Uint8Array(12+8+padded+8+payload.length);
 const dv=new DataView(bytes.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,bytes.length,true);
 dv.setUint32(12,padded,true);dv.setUint32(16,0x4e4f534a,true);bytes.fill(32,20,20+padded);bytes.set(json,20);
 const second=20+padded;dv.setUint32(second,payload.length,true);dv.setUint32(second+4,0x004e4942,true);bytes.set(payload,second+8);
 return bytes.buffer;
}
test('Converts a real, indexed glTF triangle into playable SQUAD orientation',()=>{
 const glb=fakeGlb();
 const parsed=readGlb(glb);
 assert.equal(parsed.json.meshes.length,1);
 const world=partyWorldTriangles(glb);
 assert.equal(world.triangles,1);
 assert.equal(world.visibleNodes,1,'Never render static duplicate team members');
 assert.equal(world.data.length,27);
 assert.deepEqual(Array.from(world.data.slice(0,3)),[0,Math.fround(-3.22),13]);
 assert.equal(world.data[9+2],16.5,'Blender road direction becomes gameplay Z');
 assert.ok(world.data.slice(6,9).every(n=>n>=0&&n<=1),'Material colors are display-safe');
});
test('Malformed assets fail safely, keeping classical world fallback available',()=>{
 assert.throws(()=>readGlb(new ArrayBuffer(8)),/onvolledig/);
 const broken=fakeGlb().slice(0);
 new DataView(broken).setUint32(0,0,true);
 assert.throws(()=>partyWorldTriangles(broken),/Geen geldig/);
});
test('The real 3D Jutsu floating world ships with the game and fits the budget',()=>{
 assert.ok(existsSync(modelPath),'The full exported Higgsfield GLB must be committed');
 const file=readFileSync(modelPath);
 assert.ok(file.byteLength<12*1024*1024,'Mobile asset size limit');
 const glb=readGlb(file);
 assert.ok(glb.json.meshes.length>=150,'Complete world, not a preview screenshot');
 const world=partyWorldTriangles(file);
 assert.ok(world.triangles>200,'Must contain actual geometry');
 assert.ok(world.triangles<=125000,'Triangle budget enforced');
 assert.ok(world.visibleNodes>20,'Keep playfield and decorations');
 assert.equal(world.data.length,world.triangles*27);
 assert.ok(world.data.every(Number.isFinite),'Geometry must not contain invalid coordinates');
});
