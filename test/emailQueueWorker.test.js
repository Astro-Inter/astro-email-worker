import assert from "node:assert/strict";
import { test } from "node:test";

import { getEmployeeById } from "../src/services/userService.js";
import { processEmailQueue } from "../src/workers/emailQueueWorker.js";

test("colaborador pré-cadastrado prossegue para geração do token e envio do e-mail", async (context) => {
    context.mock.method(console, "log", () => {});

    const employee = {
        id_usuario: 42,
        nome: "Maria",
        email: "maria@example.com",
        tipo: "COLABORADOR",
        status: "PRE_CADASTRADO"
    };
    const queue = [String(employee.id_usuario), null];
    const generatedToken = "123456";
    const calls = [];

    await processEmailQueue({
        queueClient: {
            lPop: async () => queue.shift()
        },
        findEmployee: (userId) =>
            getEmployeeById(userId, async () => employee),
        createToken: async (userId) => {
            calls.push(["token", userId]);
            return generatedToken;
        },
        sendEmail: async (recipient, token) => {
            calls.push(["email", recipient, token]);
        }
    });

    assert.deepEqual(calls, [
        ["token", employee.id_usuario],
        ["email", employee, generatedToken]
    ]);
});
