import {readFileSync} from 'node:fs';
const cfg=JSON.parse(readFileSync(new URL('wrangler.jsonc',import.meta.url),'utf8'));
if(cfg.account_id!=='25eb8d3849be3adbff3678f4ec781804') throw Error('Conta inesperada');
const allowed=new Set(['$schema','name','account_id','main','compatibility_date','workers_dev','preview_urls','observability','vars','triggers','hyperdrive']);
for(const key of Object.keys(cfg)) if(!allowed.has(key)) throw Error('Binding não permitido: '+key);
console.log('Standalone Worker: manter a conta no Workers Free.');
