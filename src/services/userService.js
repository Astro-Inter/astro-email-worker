import { findUserById } from "../repositories/userRepository.js";

export async function getEmployeeById(userId) {
    const user = await findUserById(userId);

    if (!user) {
        console.warn(`Usuário ${userId} não encontrado.`);
        return null;
    }

    if (user.tipo !== "FUNCIONARIO") {
        console.warn(`Usuário ${userId} não é um funcionário.`);
        return null;
    }

    if (user.status !== "PRE_CADASTRADO") {
        console.warn(
            `Funcionário ${userId} não está com status PRE_CADASTRADO.`
        );

        return null;
    }

    return user;
}