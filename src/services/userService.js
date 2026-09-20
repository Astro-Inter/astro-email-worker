import { findUserById } from "../repositories/userRepository.js";
import { createLogger } from "../observability/logger.js";

const logger = createLogger({ component: "user-service" });

export async function getEmployeeById(userId, findUser = findUserById) {
    const user = await findUser(userId);

    if (!user) {
        logger.warn("Usuário da fila não encontrado", {
            operation: "find-employee",
            status: "not-found"
        });
        return null;
    }

    if (user.tipo !== "COLABORADOR") {
        logger.warn("Usuário da fila não é colaborador", {
            operation: "validate-employee",
            status: "ignored"
        });
        return null;
    }

    if (user.status !== "PRE_CADASTRADO") {
        logger.warn("Colaborador da fila não está pré-cadastrado", {
            operation: "validate-employee",
            status: "ignored"
        });

        return null;
    }

    return user;
}
