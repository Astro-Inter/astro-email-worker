import "dotenv/config";

import { redisClient, connectRedis } from "./config/redis.js";
import { processWorkspaceEmailQueue } from "./workers/workspaceEmailQueueWorker.js";

async function start() {
    try {
        console.log("Iniciando worker de acesso ao workspace...");
        await connectRedis();
        await processWorkspaceEmailQueue();
        console.log("Worker de acesso ao workspace finalizado.");
    } catch (error) {
        console.error("Erro no worker de acesso ao workspace:", error);
        process.exitCode = 1;
    } finally {
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
    }
}

start();
