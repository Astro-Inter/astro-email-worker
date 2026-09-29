import assert from "node:assert/strict";
import { test } from "node:test";

import { getEmployeeByEmail } from "../src/services/userService.js";

const preRegisteredEmployee = {
    id_usuario: 42,
    nome: "Maria",
    email: "maria@example.com",
    tipo: "COLABORADOR",
    status: "PRE_CADASTRADO"
};

test("aceita colaborador pré-cadastrado", async () => {
    const result = await getEmployeeByEmail(
        preRegisteredEmployee.email,
        async () => preRegisteredEmployee
    );

    assert.equal(result, preRegisteredEmployee);
});

test("rejeita colaborador com outro status", async (context) => {
    context.mock.method(console, "warn", () => {});
    const activeEmployee = {
        ...preRegisteredEmployee,
        status: "ATIVO"
    };

    const result = await getEmployeeByEmail(
        activeEmployee.email,
        async () => activeEmployee
    );

    assert.equal(result, null);
});

for (const managerType of ["GESTOR", "GESTOR_WORKSPACE"]) {
    test(`rejeita usuário do tipo ${managerType}`, async (context) => {
        context.mock.method(console, "warn", () => {});
        const manager = {
            ...preRegisteredEmployee,
            tipo: managerType
        };

        const result = await getEmployeeByEmail(
            manager.email,
            async () => manager
        );

        assert.equal(result, null);
    });
}

test("rejeita usuário inexistente", async (context) => {
    context.mock.method(console, "warn", () => {});

    const result = await getEmployeeByEmail("inexistente@example.com", async () => null);

    assert.equal(result, null);
});
