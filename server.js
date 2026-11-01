import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const app=express();const server=createServer(app);const io=new Server(server,{cors:{origin:true}});
const dirname=path.dirname(fileURLToPath(import.meta.url));app.use(express.static(path.join(dirname,'public')));
const users=new Map();
const clean=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
const scrubCooldown=new Map();
const actions=new Set(['idle','soak','float','sleep','splash','wave']);
io.on('connection',socket=>{
 if(users.size>=80){socket.emit('room-full');socket.disconnect(true);return;}
 const color=['#9d6b4c','#b88257','#c59a74','#876447','#ab7859'][Math.floor(Math.random()*5)];
 const player={id:socket.id,x:(Math.random()-.5)*7,z:4+(Math.random()-.5)*2,rot:Math.PI,color,action:'idle',orange:false};users.set(socket.id,player);
 socket.emit('init',{id:socket.id,players:[...users.values()]});socket.broadcast.emit('joined',player);io.emit('count',users.size);
 socket.on('move',data=>{if(!data||typeof data!=='object')return;const p=users.get(socket.id);if(!p)return;const nx=clean(data.x,-16,16,p.x), nz=clean(data.z,-12,13,p.z);if(Math.hypot(nx-p.x,nz-p.z)>3)return;p.x=nx;p.z=nz;p.rot=clean(data.rot,-100,100,p.rot);socket.broadcast.emit('moved',{id:p.id,x:p.x,z:p.z,rot:p.rot});});
 socket.on('act',data=>{const p=users.get(socket.id);if(!p||!data)return;if(actions.has(data.action))p.action=data.action;if(typeof data.orange==='boolean')p.orange=data.orange;io.emit('acted',{id:p.id,action:p.action,orange:p.orange});});
 socket.on('scrub',data=>{
  const actor=users.get(socket.id);const target=users.get(data?.targetId);
  if(!actor||!target||actor.id===target.id)return;
  if(Math.hypot(actor.x-target.x,actor.z-target.z)>2.8)return;
  const now=Date.now();if(now-(scrubCooldown.get(actor.id)||0)<3500)return;
  scrubCooldown.set(actor.id,now);io.emit('scrubbed',{from:actor.id,to:target.id});
 });
 socket.on('disconnect',()=>{scrubCooldown.delete(socket.id);users.delete(socket.id);io.emit('left',socket.id);io.emit('count',users.size);});
});
const port=process.env.PORT||3000;server.listen(port,()=>console.log(`둥둥온천: http://localhost:${port}`));
