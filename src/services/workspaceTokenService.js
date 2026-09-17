import { redisClient } from "../config/redis.js";
import { generateAccessToken } from "./tokenService.js";

export function getWorkspaceTokenPrefix() {
    const prefix = process.env.WORKSPACE_ACCESS_TOKEN_PREFIX;

    if (!prefix) {
        throw new Error("WORKSPACE_ACCESS_TOKEN_PREFIX não configurado.");
    }

    return prefix;
}

export async function createWorkspaceAccessToken(email) {
    const prefix = getWorkspaceTokenPrefix();
    const token = generateAccessToken();

    await redisClient.set(`${prefix}${email}`, token);

    return token;
}
