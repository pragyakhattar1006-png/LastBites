import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('dist/server',{recursive:true});
let worker=readFileSync('src/worker.mjs','utf8');
const assets={'/':{type:'text/html; charset=utf-8',body:readFileSync('dist/index.html','utf8')},'/style.css':{type:'text/css; charset=utf-8',body:readFileSync('dist/style.css','utf8')},'/app.js':{type:'text/javascript; charset=utf-8',body:readFileSync('dist/app.js','utf8')}};
worker=worker.replace('return await env.ASSETS.fetch(request)',"const a=assets[new URL(request.url).pathname];return a?new Response(a.body,{headers:{'Content-Type':a.type,'X-Content-Type-Options':'nosniff'}}):new Response('Not found',{status:404})");
writeFileSync('dist/server/index.js','const assets='+JSON.stringify(assets)+';\n'+worker);
