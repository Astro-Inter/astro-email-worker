import {randomInt,randomUUID} from 'node:crypto';

export function validateSettings(env) {
  const required=['REDIS_URL','DATABASE_URL','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','SMTP_FROM','REDIS_QUEUE_KEY','ACCESS_TOKEN_PREFIX','ACCESS_TOKEN_TTL_SECONDS','WORKSPACE_EMAIL_QUEUE_KEY','WORKSPACE_ACCESS_TOKEN_PREFIX'];
  for(const name of required) if(typeof env[name]!=='string'||!env[name].trim()) throw Error('Configuração ausente: '+name);
  if(!['redis:','rediss:'].includes(new URL(env.REDIS_URL).protocol)) throw Error('Redis URL inválida');
  if(!['postgres:','postgresql:'].includes(new URL(env.DATABASE_URL).protocol)) throw Error('PostgreSQL URL inválida');
  if(![465,587].includes(Number(env.SMTP_PORT))) throw Error('SMTP deve usar TLS 465 ou STARTTLS 587');
  if(!Number.isSafeInteger(Number(env.ACCESS_TOKEN_TTL_SECONDS))||Number(env.ACCESS_TOKEN_TTL_SECONDS)<1) throw Error('TTL inválido');
  if(env.REDIS_QUEUE_KEY===env.WORKSPACE_EMAIL_QUEUE_KEY) throw Error('Filas devem ser diferentes');
  return Math.min(5,Math.max(1,Number(env.MAX_ITEMS)||5));
}

// Redis existente fornece a trava compartilhada, sem bindings pagos no Cloudflare.
// TTL cobre o tempo máximo da invocação, mas falhas SMTP não admitem exactly-once.
export async function runQueues(env, clients, {dryRun=true,now=Date.now,makeToken=()=>String(randomInt(100000,1000000)),owner=randomUUID()}={}) {
  const limit=validateSettings(env);
  const {redis,findEmployee,sendEmployee,sendWorkspace}=clients;
  const summary={dry_run:dryRun,employees:0,workspace:0,ignored:0,remaining:false};
  if(dryRun) {
    summary.employees=await redis.lLen(env.REDIS_QUEUE_KEY);
    summary.workspace=await redis.lLen(env.WORKSPACE_EMAIL_QUEUE_KEY);
    return summary;
  }
  if(env.JOBS_ENABLED!=='true') throw Error('Execução desativada');
  const lock=env.REDIS_QUEUE_KEY+':cloudflare:lock';
  if(await redis.set(lock,owner,{NX:true,EX:180})!=='OK') return {...summary,skipped:'locked'};
  const started=now();
  try {
    for(const mode of ['employees','workspace']) {
      const queue=mode==='employees'?env.REDIS_QUEUE_KEY:env.WORKSPACE_EMAIL_QUEUE_KEY;
      for(let index=0;index<limit;index++) {
        if(now()-started>20000) {summary.remaining=true;break;}
        // Mantém o item na fila durante operações de rede. Só remove a cabeça
        // após o envio; uma falha deixa o item disponível para recuperação.
        const queued=await redis.lIndex(queue,0);
        if(queued===null) break;
        const email=queued.trim().toLowerCase();
        const employee=mode==='employees'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?await findEmployee(email):null;
        const valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&(mode==='workspace'||employee?.tipo==='COLABORADOR'&&employee?.status==='PRE_CADASTRADO');
        if(valid) {
          const prefix=mode==='employees'?env.ACCESS_TOKEN_PREFIX:env.WORKSPACE_ACCESS_TOKEN_PREFIX;
          const token=makeToken();
          await redis.set(prefix+email,token,mode==='employees'?{EX:Number(env.ACCESS_TOKEN_TTL_SECONDS)}:undefined);
          if(mode==='employees') await sendEmployee(employee,token); else await sendWorkspace(email,token);
          summary[mode]++;
        } else summary.ignored++;
        const removed=await redis.eval("if redis.call('GET', KEYS[2]) == ARGV[2] and redis.call('LINDEX', KEYS[1], 0) == ARGV[1] then redis.call('LPOP', KEYS[1]); return 1 end; return 0",{keys:[queue,lock],arguments:[queued,owner]});
        if(removed!==1) throw Error('Fila ou trava alterada durante o processamento');
      }
    }
    return summary;
  } finally {
    await redis.eval("if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end; return 0",{keys:[lock],arguments:[owner]});
  }
}
