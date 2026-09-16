import { redisClient } from "../config/redis.js";
import { getEmployeeById } from "../services/userService.js";
import { createAccessToken } from "../services/tokenService.js";
import { sendAccessEmail } from "../services/emailService.js";

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
            try {
                const token = await createAccessToken(employee.id_usuario);

                await sendAccessEmail(employee, token);

                console.log(`E-mail enviado para ${employee.email}`);
            } catch (error) {
                console.error(
                    `Erro ao enviar e-mail para funcionário ${employee.id_usuario}:`,
                    error
                );
            }
        }
    } catch (error) {
        console.error("Erro ao processar fila:", error);
        throw error;
    }
    console.log("Processamento da fila finalizado.");
}