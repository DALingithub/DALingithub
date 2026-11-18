'use strict';
const http=require('node:http');
const crypto=require('node:crypto');
const PORT=Number(process.env.PORT||10000);
const SECRET=process.env.CALM_API_KEY||'';
const ALLOW_ORIGIN=process.env.ALLOW_ORIGIN||'https://dalingithub.github.io';
const MAX_SIZE=8192;
const peers=new Set();
const latest=new Map();
function cors(req,res){const o=req.headers.origin;if(o&&o===ALLOW_ORIGIN){res.setHeader('Access-Control-Allow-Origin',o);res.setHeader('Vary','Origin');}res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');}
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
function authorized(req){const header=req.headers.authorization||'';const token=header.startsWith('Bearer ')?header.slice(7):'';if(!SECRET||!token)return false;const a=Buffer.from(token),b=Buffer.from(SECRET);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
function receive(req,res){if(!authorized(req))return json(res,401,{error:'Unauthorized. Set CALM_API_KEY and send Authorization: Bearer <key>.'});let size=0,parts=[];req.on('data',b=>{size+=b.length;if(size>MAX_SIZE){req.destroy();return;}parts.push(b)});req.on('end',()=>{let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return json(res,400,{error:'Invalid JSON'});}
const rows=Array.isArray(body)?body:[body];if(!rows.length||rows.length>10)return json(res,400,{error:'Send 1–10 readings'});
const normalized=[];for(const r of rows){if(!r||!/^CALM-(0[1-9]|10)$/.test(r.device_id)||typeof r.index!=='number'||!Number.isFinite(r.index)||r.index<0||r.index>1)return json(res,422,{error:'Each reading requires device_id CALM-01 ... CALM-10 and numeric index between 0 and 1'});
normalized.push({device_id:r.device_id,index:r.index,timestamp:typeof r.timestamp==='string'&&Number.isFinite(Date.parse(r.timestamp))?r.timestamp:new Date().toISOString(),source:'external'});}
for(const d of normalized){latest.set(d.device_id,d);const event='data: '+JSON.stringify(d)+'\n\n';for(const client of peers){try{client.write(event)}catch{peers.delete(client)}}}
return json(res,202,{accepted:normalized.length,subscribers:peers.size});});}
const server=http.createServer((req,res)=>{cors(req,res);if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
const path=new URL(req.url,'http://localhost').pathname;
if(req.method==='GET'&&path==='/health')return json(res,200,{ok:true,service:'grand-parade-receiver',connected_clients:peers.size,devices_seen:latest.size});
if(req.method==='POST'&&path==='/api/readings')return receive(req,res);
if(req.method==='GET'&&path==='/api/stream'){res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 3000\n\n');for(const d of latest.values())res.write('data: '+JSON.stringify(d)+'\n\n');peers.add(res);req.on('close',()=>peers.delete(res));return;}
return json(res,404,{error:'Not found',endpoints:['GET /health','POST /api/readings','GET /api/stream']});});
setInterval(()=>{for(const res of peers){try{res.write(': keepalive\n\n')}catch{peers.delete(res)}}},25000).unref();
server.listen(PORT,'0.0.0.0',()=>console.log('Grand Parade receiver listening on',PORT));
