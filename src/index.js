import "dotenv/config";

import { connectRedis } from "./config/redis.js";
import { connectDatabase } from "./config/database.js";
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
        process.exit(1);
    }
}

start();