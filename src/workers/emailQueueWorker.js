import { redisClient } from "../config/redis.js";
import { getEmployeeById } from "../services/userService.js";
import { createAccessToken } from "../services/tokenService.js";
import { sendAccessEmail } from "../services/emailService.js";
import { createLogger } from "../observability/logger.js";

const QUEUE_KEY = process.env.REDIS_QUEUE_KEY;
const logger = createLogger({
    "worker.name": "employee-email-queue",
    "job.name": "process-email-queue"
});

export async function processEmailQueue({
    queueClient = redisClient,
    findEmployee = getEmployeeById,
    createToken = createAccessToken,
    sendEmail = sendAccessEmail
} = {}) {
    const queueStartedAt = Date.now();
    logger.info("Iniciando processamento da fila", { status: "started" });
    try {
        while (true) {
            const employeeId = await queueClient.lPop(QUEUE_KEY);

            if (!employeeId) {
                logger.info("Fila vazia", {
                    operation: "dequeue",
                    status: "empty"
                });
                break;
            }

            const itemStartedAt = Date.now();
            logger.info("Processando item da fila de colaboradores", {
                operation: "process-email",
                status: "started"
            });
            const employee = await findEmployee(employeeId);
            if (!employee) {
                continue;
            }
            try {
                const token = await createToken(employee.id_usuario);

                await sendEmail(employee, token);

                logger.info("E-mail de acesso enviado", {
                    operation: "send-email",
                    "duration.ms": Date.now() - itemStartedAt,
                    status: "success"
                });
            } catch (error) {
                logger.error("Erro ao enviar e-mail de acesso", {
                    operation: "send-email",
                    "duration.ms": Date.now() - itemStartedAt,
                    status: "error",
                    error
                });
            }
        }
    } catch (error) {
        logger.error("Erro ao processar fila", {
            operation: "process-queue",
            "duration.ms": Date.now() - queueStartedAt,
            status: "error",
            error
        });
        throw error;
    }
    logger.info("Processamento da fila finalizado", {
        operation: "process-queue",
        "duration.ms": Date.now() - queueStartedAt,
        status: "success"
    });
}
