import "dotenv/config";

import { redisClient, connectRedis } from "./config/redis.js";
import { database, connectDatabase } from "./config/database.js";
import { processEmailQueue } from "./workers/emailQueueWorker.js";

async function start() {
    try {
        console.log("Iniciando Astro Email Worker...");

        await connectRedis();
        await connectDatabase();

        await processEmailQueue();

        console.log("Worker finalizado com sucesso");
    } catch (error) {
        console.error("Erro ao executar worker:", error);
        process.exitCode = 1;
    } finally {
        const results = await Promise.allSettled([
            redisClient.isOpen ? redisClient.quit() : Promise.resolve(),
            database.end()
        ]);

        for (const result of results) {
            if (result.status === "rejected") {
                console.error("Erro ao fechar conexão do worker:", result.reason);
                process.exitCode = 1;
            }
        }
    }
}

start();
