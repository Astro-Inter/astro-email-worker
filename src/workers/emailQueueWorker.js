import { redisClient } from "../config/redis.js";
import { getEmployeeById } from "../services/userService.js";
import { createAccessToken } from "../services/tokenService.js";

const QUEUE_KEY = process.env.REDIS_QUEUE_KEY;

export async function processEmailQueue() {
    console.log("Iniciando processamento da fila...");
    try {
        while (true) {
            const employeeId = await redisClient.lPop(QUEUE_KEY);

            if (!employeeId) {
                console.log("Fila vazia.");
                break;
            }

            console.log(`Processando funcionário: ${employeeId}`);
            const employee = await getEmployeeById(employeeId);
            if (!employee) {
                continue;
            }
            const token = await createAccessToken(employee.id_usuario);
            console.log(`Token criado para funcionário ${employee.id_usuario}`);
        }
    } catch (error) {
        console.error("Erro ao processar fila:", error);
        throw error;
    }
    console.log("Processamento da fila finalizado.");
}