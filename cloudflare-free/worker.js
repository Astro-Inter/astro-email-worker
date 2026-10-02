import pg from 'pg';
import {createClient} from 'redis';
import nodemailer from 'nodemailer';
import {timingSafeEqual} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {connect as connectTls} from 'node:tls';
import {runQueues,validateSettings} from './job.js';
import {queueGrafanaLog} from './grafana-logs.js';
import {createAccessEmail} from './templates/accessEmailTemplate.js';
import {createWorkspaceAccessEmail} from './templates/workspaceAccessEmailTemplate.js';
import {logoBase64,userQuery} from './assets.js';

const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
function authorized(request,env) {
  if(!env.CONTROL_TOKEN||env.CONTROL_TOKEN.length<32) return false;
  const a=Buffer.from(request.headers.get('authorization')||'');
  const b=Buffer.from('Bearer '+env.CONTROL_TOKEN);
  return a.length===b.length&&timingSafeEqual(a,b);
}
async function execute(env,dryRun) {
  validateSettings(env);
  // Criar clientes dentro da invocação evita compartilhar sockets entre requests.
  const redis=createClient({url:env.REDIS_URL,socket:{connectTimeout:5000,reconnectStrategy:false}});
  redis.on('error',()=>{});
  const dbUrl=new URL(env.DATABASE_URL);
  for(const parameter of ['sslmode','sslcert','sslkey','sslrootcert']) dbUrl.searchParams.delete(parameter);
  // Hyperdrive handles verified TLS to the origin; its bound local connection
  // string must be used as supplied, following Cloudflare's node-postgres guide.
  const database=new pg.Client(env.HYPERDRIVE?
    {connectionString:env.HYPERDRIVE.connectionString,connectionTimeoutMillis:5000,query_timeout:8000}:
    {connectionString:dbUrl.toString(),ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000,query_timeout:8000});
  const smtp=nodemailer.createTransport({host:env.SMTP_HOST,port:Number(env.SMTP_PORT),secure:Number(env.SMTP_PORT)===465,requireTLS:true,
    // Preserve the hostname for Workers' TLS transport rather than replacing
    // it with an IP obtained by Nodemailer's own DNS resolver.
    ...(Number(env.SMTP_PORT)===465?{getSocket(options,callback){
      const socket=connectTls({host:env.SMTP_HOST,port:465,servername:env.SMTP_HOST,rejectUnauthorized:true});
      let completed=false;
      const timer=setTimeout(()=>{socket.destroy();finish(new Error('SMTP connection timeout'));},5000);
      function finish(error){if(completed)return;completed=true;clearTimeout(timer);callback(error,error?undefined:{connection:socket,secured:true});}
      socket.once('error',finish);
      socket.once('secureConnect',()=>finish(null));
    }}:{}),
    auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:5000,greetingTimeout:5000,socketTimeout:8000});
  const send=(to,subject,content)=>smtp.sendMail({from:env.SMTP_FROM,to,subject,...content,attachments:[{filename:'astro-logo.png',content:Buffer.from(logoBase64,'base64'),cid:'astro-logo'}]});
  let stage='redis-connect';
  try {
    await redis.connect();
    stage='postgres-connect';
    await database.connect();
    if(dryRun) {stage='redis-ping';await redis.ping();stage='postgres-query';await database.query('SELECT 1');stage='smtp-verify';await smtp.verify();}
    stage=dryRun?'queue-read':'queue-run';
    return await runQueues(env,{redis,findEmployee:async email=>(await database.query(userQuery,[email])).rows[0]??null,
      sendEmployee:(user,token)=>send(user.email,'Seu código de primeiro acesso ao Astro',createAccessEmail(user,token)),
      sendWorkspace:(email,token)=>send(email,'Seu código de acesso ao workspace Astro',createWorkspaceAccessEmail(email,token))},{dryRun});
  } catch(error) {
    const safeCodes=['ENOTFOUND','ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAUTH','ESOCKET','ETLS','ECONNECTION','ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','SELF_SIGNED_CERT_IN_CHAIN','DEPTH_ZERO_SELF_SIGNED_CERT'];
    const failure=new Error('Integration failed');
    failure.stage=stage;
    failure.code=safeCodes.includes(error?.code)?error.code:'UNSPECIFIED';
    const message=String(error?.message||'');
    failure.reason=/not implemented|not supported/i.test(message)?'runtime_unsupported':/certificate|self.signed/i.test(message)?'certificate':/ssl|tls|encryption/i.test(message)?'tls':/password|authentication|auth failed/i.test(message)?'authentication':/timed? ?out/i.test(message)?'timeout':/connect|socket|EOF/i.test(message)?'connection':'unknown';
    throw failure;
  } finally {
    smtp.close();
    await Promise.allSettled([redis.isOpen?redis.quit():Promise.resolve(),database.end()]);
  }
}
export default {
  async fetch(request,env,ctx) {
    const path=new URL(request.url).pathname;
    if(path==='/health'&&request.method==='GET') return json({status:'ok',jobs_enabled:env.JOBS_ENABLED==='true'});
    if(!['/validate','/run'].includes(path)) return json({error:'not_found'},404);
    if(request.method!=='POST') return json({error:'method_not_allowed'},405);
    if(!authorized(request,env)) return json({error:'unauthorized'},401);
    if(path==='/run'&&env.JOBS_ENABLED!=='true') return json({error:'disabled'},409);
    try {
      const dryRun=path==='/validate';
      const result=await execute(env,dryRun);
      queueGrafanaLog(ctx,env,'astro-email-worker',dryRun?'email_connections_validated':'email_queue_processed','INFO',
        {status:'success',dry_run:dryRun});
      return json(result);
    }
    catch(error) {
      const attributes={stage:error.stage,code:error.code,reason:error.reason};
      console.error(JSON.stringify({service:'astro-email-worker',status:'error',...attributes}));
      queueGrafanaLog(ctx,env,'astro-email-worker','email_integration_failed','ERROR',attributes);
      return json({error:'integration_failed',...attributes},502);
    }
  },
  async scheduled(controller,env,ctx) {
    if(env.JOBS_ENABLED!=='true') return;
    try {
      const result=await execute(env,false);
      queueGrafanaLog(ctx,env,'astro-email-worker','email_queue_processed','INFO',{status:'success'});
      console.log(JSON.stringify({service:'astro-email-worker',...result}));
    } catch(error) {
      const attributes={stage:error.stage,code:error.code,reason:error.reason};
      queueGrafanaLog(ctx,env,'astro-email-worker','email_queue_failed','ERROR',attributes);
      throw new Error('Email queue job failed; inspect sanitized Worker logs.');
    }
  }
};
