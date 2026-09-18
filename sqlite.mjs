import {DatabaseSync} from 'node:sqlite';
export function database(path=':memory:') {
 const connection=new DatabaseSync(path);
 const prepare=(sql,params=[])=>({bind(...args){return prepare(sql,args)},async all(){return {results:connection.prepare(sql).all(...params)}},async first(){return connection.prepare(sql).get(...params)||null},async run(){const r=connection.prepare(sql).run(...params);return {meta:{changes:Number(r.changes)}}},sql,params});
 return {prepare,async batch(statements){connection.exec('BEGIN');try{const results=statements.map(s=>({meta:{changes:Number(connection.prepare(s.sql).run(...s.params).changes)}}));connection.exec('COMMIT');return results}catch(e){connection.exec('ROLLBACK');throw e}},close(){connection.close()}};
}
