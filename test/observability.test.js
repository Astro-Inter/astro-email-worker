import assert from "node:assert/strict";
import { test } from "node:test";

import {
    createLogger,
    hasOtlpConfiguration,
    SERVICE_NAME
} from "../src/observability/logger.js";

test("mantém a exportação OTLP opcional", () => {
    assert.equal(hasOtlpConfiguration({}), false);
    assert.equal(hasOtlpConfiguration({
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://example.test/otlp"
    }), false);
    assert.equal(hasOtlpConfiguration({
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://example.test/otlp",
        OTEL_EXPORTER_OTLP_HEADERS: "Authorization=Basic%20credential"
    }), true);
});

test("emite log estruturado no console sem expor credenciais", (context) => {
    const output = [];
    context.mock.method(console, "error", (line) => output.push(line));

    const logger = createLogger({ "worker.name": "test-worker" });
    logger.error("Falha com Authorization=Bearer super-secret", {
        operation: "test-operation",
        status: "error",
        error: new Error("Falha em redis://user:password@example.test")
    });

    assert.equal(output.length, 1);
    const record = JSON.parse(output[0]);

    assert.equal(record.level, "ERROR");
    assert.equal(record["service.name"], SERVICE_NAME);
    assert.equal(record["worker.name"], "test-worker");
    assert.equal(record.operation, "test-operation");
    assert.equal(record.status, "error");
    assert.match(record.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.doesNotMatch(output[0], /super-secret|user:password/);
});
