import { redisClient } from "../config/redis.js";

const QUEUE_KEY = process.env.REDIS_QUEUE_KEY;

async function getNextEmployeeId() {
    return await redisClient.lPop(QUEUE_KEY);
}

export async function processEmailQueue() {
    console.log("Iniciando processamento da fila...");
    try {
        while (true) {
            const employeeId = await redisClient.lPop(QUEUE_KEY);
            if (!employeeId) {
                console.log("Fila vazia.");
                break;
            }
            console.log(`Funcionário encontrado na fila: ${employeeId}`);
        }
    } catch (error) {
        console.error("Erro ao processar fila do Redis:", error);
        throw error;
    }
    console.log("Processamento da fila finalizado.");
}