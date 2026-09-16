import "dotenv/config";

import { connectRedis } from "./config/redis.js";
import { connectDatabase } from "./config/database.js";

async function start() {
    try {
        console.log("Iniciando Astro Email Worker...");

        await connectRedis();
        await connectDatabase();

        console.log("Worker iniciado com sucesso");
    } catch (error) {
        console.error("Erro ao iniciar worker:", error);
        process.exit(1);
    }
}

start();