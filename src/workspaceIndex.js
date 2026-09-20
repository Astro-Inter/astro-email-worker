import "dotenv/config";

import { redisClient, connectRedis } from "./config/redis.js";
import { processWorkspaceEmailQueue } from "./workers/workspaceEmailQueueWorker.js";
import { createLogger, shutdownObservability } from "./observability/logger.js";

const logger = createLogger({
    "worker.name": "workspace-email-queue",
    "job.name": "process-workspace-email-queue"
});

async function start() {
    try {
        logger.info("Iniciando worker de acesso ao workspace", { status: "starting" });
        await connectRedis();
        await processWorkspaceEmailQueue();
        logger.info("Worker de acesso ao workspace finalizado", { status: "success" });
    } catch (error) {
        logger.error("Erro no worker de acesso ao workspace", {
            status: "error",
            error
        });
        process.exitCode = 1;
    } finally {
        try {
            if (redisClient.isOpen) {
                await redisClient.quit();
            }
        } catch (error) {
            logger.error("Erro ao fechar conexão do worker de workspace", {
                operation: "close-connections",
                status: "error",
                error
            });
            process.exitCode = 1;
        }

        try {
            await shutdownObservability();
        } catch (error) {
            logger.error("Erro ao finalizar exportação de observabilidade", {
                operation: "shutdown-observability",
                status: "error",
                error
            });
            process.exitCode = 1;
        }
    }
}

start();
