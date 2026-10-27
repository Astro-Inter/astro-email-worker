const stages = new WeakMap();
export async function observe(stage,work) {
  try { return await work(); }
  catch(error) { if(error && typeof error==='object' && !stages.has(error)) stages.set(error,stage); throw error; }
}
export function diagnostic(error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,48}$/.test(error.code) ? error.code : 'UNCLASSIFIED_ERROR';
  return { ...(error && typeof error==='object' && stages.has(error) ? {stage:stages.get(error)} : {}), error_type: error instanceof Error ? error.constructor.name : 'ThrownValue', error_code: code,
    error_frames: (error instanceof Error ? error.stack || '' : '').split('\n').slice(1).filter(line => /^\s+at /.test(line))
      .flatMap(line => { const match=line.match(/(?:^|[/(\\\s])([A-Za-z0-9_.-]+\.[cm]?js):(\d+):(\d+)\)?$/); return match ? [match.slice(1).join(':')] : []; }).slice(0,12).join(' > ') };
}
