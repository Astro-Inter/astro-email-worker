import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runScheduledPolls} from './schedule.js';

test('consulta imediatamente e novamente após o intervalo de 30 segundos', async () => {
  let release;
  const calls = [];
  const pending = runScheduledPolls(index => calls.push(index), {
    wait: ms => {assert.equal(ms, 30000); return new Promise(resolve => {release = resolve;});},
  });
  await Promise.resolve();
  assert.deepEqual(calls, [0]);
  release();
  await pending;
  assert.deepEqual(calls, [0, 1]);
});

test('falha inicial não impede a segunda consulta e mantém o cron com erro', async () => {
  const calls = [];
  await assert.rejects(runScheduledPolls(index => {
    calls.push(index);
    if (index === 0) throw new Error('falha inicial');
  }, {wait: async () => {}}), /falha inicial/);
  assert.deepEqual(calls, [0, 1]);
});
