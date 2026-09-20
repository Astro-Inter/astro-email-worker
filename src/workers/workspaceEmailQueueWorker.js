import { redisClient } from "../config/redis.js";
import { createWorkspaceAccessToken, getWorkspaceTokenPrefix } from "../services/workspaceTokenService.js";
import { sendWorkspaceAccessEmail } from "../services/emailService.js";
import { createLogger } from "../observability/logger.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const logger = createLogger({
    "worker.name": "workspace-email-queue",
    "job.name": "process-workspace-email-queue"
});

export async function processWorkspaceEmailQueue() {
    const queueKey = process.env.WORKSPACE_EMAIL_QUEUE_KEY;

    if (!queueKey) {
        throw new Error("WORKSPACE_EMAIL_QUEUE_KEY não configurada.");
    }

    getWorkspaceTokenPrefix();

    const queueStartedAt = Date.now();
    logger.info("Iniciando processamento da fila de acesso ao workspace", {
        status: "started"
    });

    while (true) {
        const queuedEmail = await redisClient.lPop(queueKey);

        if (queuedEmail === null) {
            logger.info("Fila de acesso ao workspace vazia", {
                operation: "dequeue",
                status: "empty"
            });
            break;
        }

        const email = queuedEmail.trim().toLowerCase();

        if (!EMAIL_PATTERN.test(email)) {
            logger.error("E-mail inválido na fila de workspace", {
                operation: "validate-email",
                status: "discarded"
            });
            continue;
        }

        const itemStartedAt = Date.now();
        try {
            const token = await createWorkspaceAccessToken(email);
            await sendWorkspaceAccessEmail(email, token);
            logger.info("E-mail de acesso ao workspace enviado", {
                operation: "send-email",
                "duration.ms": Date.now() - itemStartedAt,
                status: "success"
            });
        } catch (error) {
            logger.error("Falha ao enviar acesso ao workspace", {
                operation: "send-email",
                "duration.ms": Date.now() - itemStartedAt,
                status: "error",
                error
            });
            await redisClient.rPush(queueKey, queuedEmail);
            logger.warn("Item devolvido à fila para nova tentativa", {
                operation: "requeue",
                status: "retry"
            });
            throw error;
        }
    }

    logger.info("Processamento da fila de acesso ao workspace finalizado", {
        operation: "process-queue",
        "duration.ms": Date.now() - queueStartedAt,
        status: "success"
    });
}
