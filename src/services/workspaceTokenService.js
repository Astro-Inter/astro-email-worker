import { redisClient } from "../config/redis.js";
import { generateAccessToken } from "./tokenService.js";

export function getWorkspaceTokenConfig() {
    const prefix = process.env.WORKSPACE_ACCESS_TOKEN_PREFIX;
    const ttl = Number(process.env.WORKSPACE_ACCESS_TOKEN_TTL_SECONDS);

    if (!prefix) {
        throw new Error("WORKSPACE_ACCESS_TOKEN_PREFIX não configurado.");
    }

    if (!Number.isSafeInteger(ttl) || ttl <= 0) {
        throw new Error("WORKSPACE_ACCESS_TOKEN_TTL_SECONDS deve ser um inteiro positivo.");
    }

    return { prefix, ttl };
}

export async function createWorkspaceAccessToken(email) {
    const { prefix, ttl } = getWorkspaceTokenConfig();
    const token = generateAccessToken();

    await redisClient.set(`${prefix}${email}`, token, { EX: ttl });

    return token;
}
