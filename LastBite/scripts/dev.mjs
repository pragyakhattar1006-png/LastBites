import http from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import worker from '../dist/server/index.js';
import {database} from './sqlite.mjs';
const env={DB:database(process.env.LASTBITE_DB_PATH||join(tmpdir(),'lastbite-preview.sqlite')),VENDOR_ACCESS_KEY:process.env.VENDOR_ACCESS_KEY||'preview-only-key'};
http.createServer(async(req,res)=>{const bytes=[];for await(const chunk of req)bytes.push(chunk);const r=await worker.fetch(new Request('http://127.0.0.1:5173'+req.url,{method:req.method,headers:req.headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body:Buffer.concat(bytes)})}),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()))}).listen(5173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:5173/'));
