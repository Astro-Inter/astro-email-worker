import { database } from "../config/database.js";

export async function findUserById(userId) {
    const result = await database.query(
        `
        SELECT
            u.id_usuario,
            u.nome,
            u.email,
            u.status,
            u.tipo,

            un.id_unidade,
            un.nome AS unidade,

            w.id_workspace,
            w.nome AS workspace,

            c.id_cargo,
            c.nome AS cargo

        FROM usuario u

        INNER JOIN unidade un
            ON un.id_unidade = u.unidade_id

        INNER JOIN workspace w
            ON w.id_workspace = un.workspace_id

        LEFT JOIN cargo c
            ON c.id_cargo = u.cargo_id

        WHERE u.id_usuario = $1
        `,
        [userId]
    );

    return result.rows[0] ?? null;
}