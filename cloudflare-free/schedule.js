// O cron tem resolução de minutos; cada disparo inicia duas consultas.
export async function runScheduledPolls(run, {
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  const results = await Promise.allSettled([
    Promise.resolve().then(() => run(0)),
    wait(30000).then(() => run(1)),
  ]);
  // Uma falha na primeira consulta não impede a segunda tentativa.
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
}
