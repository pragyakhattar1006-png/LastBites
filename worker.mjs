const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const nextDay=(now=new Date())=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));return new Date(Date.UTC(+p.year,+p.month-1,+p.day+(+p.hour>=18?1:0))).toISOString().slice(0,10)};
const maxDay=()=>new Date(Date.parse(nextDay()+'T00:00:00Z')+13*86400000).toISOString().slice(0,10);
const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&d>=nextDay()&&d<=maxDay();
const active="status IN ('reserved','collected','missed')";
const ids=['brown','green','crumb'];
async function init(db){await db.batch([
 db.prepare('CREATE TABLE IF NOT EXISTS slots (vendor TEXT NOT NULL, date TEXT NOT NULL, quota INTEGER NOT NULL CHECK(quota BETWEEN 0 AND 100), confirmed INTEGER NOT NULL DEFAULT 0, address TEXT NOT NULL DEFAULT \'\', PRIMARY KEY(vendor,date))'),
 db.prepare('CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer TEXT NOT NULL, vendor TEXT NOT NULL, date TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'reserved\', createdAt TEXT NOT NULL, updatedAt TEXT)'),
 db.prepare('CREATE INDEX IF NOT EXISTS order_slot ON orders(vendor,date,status)'),
 db.prepare('CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY, customer TEXT NOT NULL, intent TEXT NOT NULL, comment TEXT NOT NULL, createdAt TEXT NOT NULL)')
]);}
export async function api(request,env){
 const url=new URL(request.url),db=env.DB;
 if(!db)return json({error:'Shared reservations are unavailable. Please try again later.'},503);
 if(request.method!=='GET'&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Request origin is not allowed.'},403);
 const customer=request.headers.get('X-Customer-Token')||'';
 const operator=!!env.VENDOR_ACCESS_KEY&&request.headers.get('X-Vendor-Key')===env.VENDOR_ACCESS_KEY;
 if(url.pathname.startsWith('/api/vendor')&&!operator)return json({error:'Enter the operator access key.'},401);
 if(url.pathname!=='/api/slots'&&!url.pathname.startsWith('/api/vendor')&&!/^[a-f0-9]{64}$/.test(customer))return json({error:'A valid device session is required.'},401);
 await init(db);
 let body={};if(request.method!=='GET'){if(+(request.headers.get('Content-Length')||0)>5000)return json({error:'Request too large.'},413);try{const raw=await request.text();if(raw.length>5000)return json({error:'Request too large.'},413);body=JSON.parse(raw)}catch{return json({error:'Invalid request.'},400)}}
 const date=url.searchParams.get('date')||nextDay();
 if(request.method==='GET'&&url.pathname==='/api/slots'){
  if(!validDay(date))return json({error:'Choose a collection day within the next two weeks.'},400);
  const rows=await db.prepare(`SELECT s.*, MAX(0,s.quota-(SELECT COUNT(*) FROM orders o WHERE o.vendor=s.vendor AND o.date=s.date AND ${active})) AS remaining FROM slots s WHERE s.date=?`).bind(date).all();return json({date,minDate:nextDay(),maxDate:maxDay(),slots:rows.results});
 }
 if(request.method==='GET'&&url.pathname==='/api/orders'){const r=await db.prepare('SELECT id,vendor,date,name,status,createdAt,updatedAt FROM orders WHERE customer=? ORDER BY createdAt DESC').bind(customer).all();return json({orders:r.results})}
 if(request.method==='POST'&&url.pathname==='/api/orders'){
  if(!ids.includes(body.vendor)||!validDay(body.date)||typeof body.name!=='string'||!body.name.trim()||body.name.length>60||body.agreed!==true)return json({error:'Check your name, collection date and policy agreement.'},400);
  const id='LB-'+crypto.randomUUID().replace(/-/g,'').slice(0,12).toUpperCase();
  const result=await db.prepare(`INSERT INTO orders(id,customer,vendor,date,name,createdAt) SELECT ?,?,?,?,?,? FROM slots s WHERE s.vendor=? AND s.date=? AND s.confirmed=1 AND s.quota>(SELECT COUNT(*) FROM orders o WHERE o.vendor=s.vendor AND o.date=s.date AND ${active}) AND NOT EXISTS (SELECT 1 FROM orders WHERE customer=? AND vendor=? AND date=? AND status='reserved')`).bind(id,customer,body.vendor,body.date,body.name.trim(),new Date().toISOString(),body.vendor,body.date,customer,body.vendor,body.date).run();
  if(!result.meta.changes)return json({error:'This bag is unconfirmed, sold out, or already reserved by you. Refresh availability.'},409);return json({id,status:'reserved',demo:true},201);
 }
 if(request.method==='POST'&&url.pathname==='/api/orders/cancel'){
  const o=await db.prepare('SELECT * FROM orders WHERE id=? AND customer=?').bind(body.id||'',customer).first();if(!o)return json({error:'Reservation not found.'},404);
  if(o.status!=='reserved')return json({error:'This reservation is already closed.'},409);
  if(Date.now()>=Date.parse(o.date+'T20:30:00+05:30'))return json({error:'Cancellation closes when pickup starts at 8:30 pm IST.'},409);
  const r=await db.prepare("UPDATE orders SET status='cancelled',updatedAt=? WHERE id=? AND customer=? AND status='reserved'").bind(new Date().toISOString(),o.id,customer).run();if(!r.meta.changes)return json({error:'Reservation changed; refresh and try again.'},409);return json({status:'cancelled'});
 }
 if(request.method==='POST'&&url.pathname==='/api/feedback'){
  if(!['Yes','Maybe','No'].includes(body.intent)||typeof body.comment!=='string'||!body.comment.trim()||body.comment.length>1500)return json({error:'Enter feedback up to 1,500 characters.'},400);
  await db.prepare('INSERT INTO feedback VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),customer,body.intent,body.comment.trim(),new Date().toISOString()).run();return json({saved:true},201);
 }
 if(request.method==='GET'&&url.pathname==='/api/vendor'){
  const slots=await db.prepare(`SELECT s.*,(SELECT COUNT(*) FROM orders o WHERE o.vendor=s.vendor AND o.date=s.date AND ${active}) AS allocated FROM slots s WHERE s.date=?`).bind(date).all();
  const orders=await db.prepare('SELECT id,vendor,date,status,createdAt,updatedAt FROM orders WHERE date=? ORDER BY createdAt').bind(date).all();return json({date,slots:slots.results,orders:orders.results});
 }
 if(request.method==='POST'&&url.pathname==='/api/vendor/stock'){
  if(!ids.includes(body.vendor)||!validDay(body.date)||!Number.isInteger(body.quota)||body.quota<0||body.quota>100||typeof body.confirmed!=='boolean'||typeof body.address!=='string'||body.address.length>250)return json({error:'Choose a valid date, quota (0–100), and pickup address.'},400);
  const r=await db.prepare(`INSERT INTO slots(vendor,date,quota,confirmed,address) SELECT ?,?,?,?,? WHERE ?>=(SELECT COUNT(*) FROM orders WHERE vendor=? AND date=? AND ${active}) ON CONFLICT(vendor,date) DO UPDATE SET quota=excluded.quota,confirmed=excluded.confirmed,address=excluded.address`).bind(body.vendor,body.date,body.quota,body.confirmed?1:0,body.address.trim(),body.quota,body.vendor,body.date).run();
  if(!r.meta.changes)return json({error:'Quota cannot be lower than bags already allocated.'},409);return json({saved:true});
 }
 if(request.method==='POST'&&url.pathname==='/api/vendor/order'){
  if(!['collected','vendor_cancelled','missed'].includes(body.status))return json({error:'Invalid pickup status.'},400);
  const o=await db.prepare('SELECT * FROM orders WHERE id=?').bind(body.id||'').first();if(!o)return json({error:'Reservation not found.'},404);
  if(body.status==='missed'&&Date.now()<Date.parse(o.date+'T22:00:00+05:30'))return json({error:'Mark a missed pickup only after 10 pm IST.'},409);
  const r=await db.prepare("UPDATE orders SET status=?,updatedAt=? WHERE id=? AND status='reserved'").bind(body.status,new Date().toISOString(),o.id).run();if(!r.meta.changes)return json({error:'Reservation already closed.'},409);return json({status:body.status});
 }
 return json({error:'Not found.'},404);
}
export default {async fetch(request,env){try{if(new URL(request.url).pathname.startsWith('/api/'))return await api(request,env);return await env.ASSETS.fetch(request)}catch{return json({error:'Unable to complete this request. Please try again.'},503)}}};
