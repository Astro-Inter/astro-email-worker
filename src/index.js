import "dotenv/config";

import { redisClient, connectRedis } from "./config/redis.js";
import { database, connectDatabase } from "./config/database.js";
import { processEmailQueue } from "./workers/emailQueueWorker.js";
import { createLogger, shutdownObservability } from "./observability/logger.js";

const logger = createLogger({
    "worker.name": "employee-email-queue",
    "job.name": "process-email-queue"
});

async function start() {
    try {
        logger.info("Iniciando Astro Email Worker", { status: "starting" });

        await connectRedis();
        await connectDatabase();

        await processEmailQueue();

        logger.info("Worker finalizado com sucesso", { status: "success" });
    } catch (error) {
        logger.error("Erro ao executar worker", { status: "error", error });
        process.exitCode = 1;
    } finally {
        const results = await Promise.allSettled([
            redisClient.isOpen ? redisClient.quit() : Promise.resolve(),
            database.end()
        ]);

        for (const result of results) {
            if (result.status === "rejected") {
                logger.error("Erro ao fechar conexão do worker", {
                    operation: "close-connections",
                    status: "error",
                    error: result.reason
                });
                process.exitCode = 1;
            }
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
