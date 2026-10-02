import test from 'node:test';
import assert from 'node:assert/strict';
import {runQueues,validateSettings} from './job.js';
import worker from './worker.js';
const env={REDIS_URL:'redis://example.test:6379',DATABASE_URL:'postgresql://example.test/db',SMTP_HOST:'smtp.example.test',SMTP_PORT:'587',SMTP_USER:'user',SMTP_PASSWORD:'test-only',SMTP_FROM:'from@example.test',REDIS_QUEUE_KEY:'employees',WORKSPACE_EMAIL_QUEUE_KEY:'workspace',ACCESS_TOKEN_PREFIX:'access:',ACCESS_TOKEN_TTL_SECONDS:'120',WORKSPACE_ACCESS_TOKEN_PREFIX:'work:',JOBS_ENABLED:'true',MAX_ITEMS:'5'};
function fixture(employees=[],workspace=[]) {
 const lists={employees:[...employees],workspace:[...workspace]},values=new Map(),sent=[];
 const redis={lLen:async key=>lists[key].length,lIndex:async key=>lists[key][0]??null,
  set:async(key,value,options)=>{if(options?.NX&&values.has(key))return null;values.set(key,value);return 'OK';},
  eval:async(script,{keys,arguments:args})=>{
   if(keys.length===1) {if(values.get(keys[0])!==args[0])return 0;values.delete(keys[0]);return 1;}
   if(values.get(keys[1])!==args[1]||lists[keys[0]][0]!==args[0])return 0;lists[keys[0]].shift();return 1;
  }};
 const clients={redis,findEmployee:async email=>({email,tipo:'COLABORADOR',status:'PRE_CADASTRADO'}),sendEmployee:async(user,token)=>sent.push([user.email,token]),sendWorkspace:async(email,token)=>sent.push([email,token])};
 return {clients,lists,values,sent};
}
test('validate is read-only and includes both queues',async()=>{const f=fixture(['one@example.test'],['two@example.test']);const result=await runQueues(env,f.clients);assert.equal(result.employees,1);assert.equal(result.workspace,1);assert.equal(f.sent.length,0);assert.equal(f.values.size,0);assert.equal(f.lists.employees.length,1);});
test('execute both queues with normalized emails and corresponding token keys',async()=>{const f=fixture([' ONE@EXAMPLE.TEST '],['two@example.test']);const result=await runQueues(env,f.clients,{dryRun:false,makeToken:()=> '123456'});assert.equal(result.employees,1);assert.equal(result.workspace,1);assert.equal(f.values.get('access:one@example.test'),'123456');assert.equal(f.values.get('work:two@example.test'),'123456');assert.deepEqual(f.sent,[['one@example.test','123456'],['two@example.test','123456']]);assert.equal(f.lists.employees.length,0);assert.equal(f.values.has('employees:cloudflare:lock'),false);});
test('SMTP failure preserves head and releases lock; no automatic retry',async()=>{const f=fixture(['one@example.test']);let attempts=0;f.clients.sendEmployee=async()=>{attempts++;throw Error('smtp');};await assert.rejects(runQueues(env,f.clients,{dryRun:false}),/smtp/);assert.equal(attempts,1);assert.equal(f.lists.employees.length,1);assert.equal(f.values.has('employees:cloudflare:lock'),false);});
test('parallel execution respects Redis shared lock',async()=>{const f=fixture(['one@example.test']);f.values.set('employees:cloudflare:lock','another');const result=await runQueues(env,f.clients,{dryRun:false});assert.equal(result.skipped,'locked');assert.equal(f.sent.length,0);assert.equal(f.values.get('employees:cloudflare:lock'),'another');});
test('bounded batch leaves next items available',async()=>{const f=fixture(Array.from({length:7},(_,i)=>`${i}@example.test`));await runQueues(env,f.clients,{dryRun:false});assert.equal(f.sent.length,5);assert.equal(f.lists.employees.length,2);});
test('preserves employee eligibility and discards malformed entries',async()=>{const f=fixture(['bad','normal@example.test']);f.clients.findEmployee=async()=>({tipo:'ADMINISTRADOR',status:'ATIVO'});const result=await runQueues(env,f.clients,{dryRun:false});assert.equal(result.ignored,2);assert.equal(f.sent.length,0);});
test('disabled jobs cannot execute or modify Redis',async()=>{const f=fixture(['one@example.test']);await assert.rejects(runQueues({...env,JOBS_ENABLED:'false'},f.clients,{dryRun:false}),/desativada/);assert.equal(f.values.size,0);});
test('queue mutation after SMTP fails without popping another entry',async()=>{const f=fixture(['one@example.test','two@example.test']);f.clients.sendEmployee=async()=>{f.lists.employees.shift();};await assert.rejects(runQueues(env,f.clients,{dryRun:false}),/alterada/);assert.deepEqual(f.lists.employees,['two@example.test']);});
test('settings reject unsupported SMTP, duplicate queues and invalid TTL',()=>{assert.throws(()=>validateSettings({...env,SMTP_PORT:'25'}));assert.throws(()=>validateSettings({...env,ACCESS_TOKEN_TTL_SECONDS:'NaN'}));assert.throws(()=>validateSettings({...env,WORKSPACE_EMAIL_QUEUE_KEY:'employees'}));});
test('HTTP authentication accepts only the configured bearer token',async()=>{const configured={...env,JOBS_ENABLED:'false',CONTROL_TOKEN:'test-only-123456789012345678901234567890'};for(const header of ['', 'Bearer wrong']) {const r=await worker.fetch(new Request('https://test.invalid/run',{method:'POST',headers:{authorization:header}}),configured);assert.equal(r.status,401);}const accepted=await worker.fetch(new Request('https://test.invalid/run',{method:'POST',headers:{authorization:'Bearer '+configured.CONTROL_TOKEN}}),configured);assert.equal(accepted.status,409);});
