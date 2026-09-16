import { redisClient } from "../config/redis.js";
import { getEmployeeById } from "../services/userService.js";

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
            console.log("Funcionário encontrado:", {
                id: employee.id_usuario,
                nome: employee.nome,
                email: employee.email,
                workspace: employee.workspace,
                unidade: employee.unidade,
                cargo: employee.cargo
            });
        }
    } catch (error) {
        console.error("Erro ao processar fila:", error);
        throw error;
    }
    console.log("Processamento da fila finalizado.");
}