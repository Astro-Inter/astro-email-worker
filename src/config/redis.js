import { createClient } from "redis";
import { createLogger } from "../observability/logger.js";

const logger = createLogger({ component: "redis" });

export const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on("error", (error) => {
    logger.error("Erro na conexão com o Redis", {
        operation: "connect",
        status: "error",
        error
    });
});

export async function connectRedis() {
    await redisClient.connect();
    logger.info("Redis conectado", {
        operation: "connect",
        status: "success"
    });
}
