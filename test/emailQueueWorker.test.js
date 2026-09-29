import assert from "node:assert/strict";
import { test } from "node:test";

import { getEmployeeByEmail } from "../src/services/userService.js";
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
    const queue = ["  MARIA@EXAMPLE.COM  ", null];
    const generatedToken = "123456";
    const calls = [];

    await processEmailQueue({
        queueClient: {
            lPop: async () => queue.shift()
        },
        findEmployee: (email) =>
            getEmployeeByEmail(email, async (receivedEmail) => {
                calls.push(["busca", receivedEmail]);
                return employee;
            }),
        createToken: async (email) => {
            calls.push(["token", email]);
            return generatedToken;
        },
        sendEmail: async (recipient, token) => {
            calls.push(["email", recipient, token]);
        }
    });

    assert.deepEqual(calls, [
        ["busca", employee.email],
        ["token", employee.email],
        ["email", employee, generatedToken]
    ]);
});

test("descarta item da fila quando o e-mail é inválido", async (context) => {
    context.mock.method(console, "warn", () => {});

    const queue = ["email-invalido", null];
    let searched = false;

    await processEmailQueue({
        queueClient: {
            lPop: async () => queue.shift()
        },
        findEmployee: async () => {
            searched = true;
        }
    });

    assert.equal(searched, false);
});
