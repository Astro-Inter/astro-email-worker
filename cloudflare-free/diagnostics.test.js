import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diagnostic} from './diagnostics.js';

test('diagnóstico SMTP preserva código e frames sem destinatário nem credenciais',()=>{
  const error=Object.assign(new Error('private@example.com password=secret'),{code:'EAUTH'});
  error.stack='Error: private\n    at connect (worker.js:42:7)';
  const result=diagnostic(error);
  assert.equal(result.error_code,'EAUTH');
  assert.equal(result.error_frames,'worker.js:42:7');
  assert.doesNotMatch(JSON.stringify(result),/private|password|secret/);
});
