import { redisClient } from "../config/redis.js";
import { createWorkspaceAccessToken, getWorkspaceTokenPrefix } from "../services/workspaceTokenService.js";
import { sendWorkspaceAccessEmail } from "../services/emailService.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function processWorkspaceEmailQueue() {
    const queueKey = process.env.WORKSPACE_EMAIL_QUEUE_KEY;

    if (!queueKey) {
        throw new Error("WORKSPACE_EMAIL_QUEUE_KEY não configurada.");
    }

    getWorkspaceTokenPrefix();

    console.log("Iniciando processamento da fila de acesso ao workspace...");

    while (true) {
        const queuedEmail = await redisClient.lPop(queueKey);

        if (queuedEmail === null) {
            console.log("Fila de acesso ao workspace vazia.");
            break;
        }

        const email = queuedEmail.trim().toLowerCase();

        if (!EMAIL_PATTERN.test(email)) {
            console.error(`E-mail inválido na fila de workspace: ${queuedEmail}`);
            continue;
        }

        try {
            const token = await createWorkspaceAccessToken(email);
            await sendWorkspaceAccessEmail(email, token);
            console.log(`E-mail de acesso ao workspace enviado para ${email}`);
        } catch (error) {
            console.error(`Falha ao enviar acesso ao workspace para ${email}:`, error);
            await redisClient.rPush(queueKey, queuedEmail);
            console.error(`E-mail ${email} devolvido à fila para nova tentativa.`);
            throw error;
        }
    }
}
