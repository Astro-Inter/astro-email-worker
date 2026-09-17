import crypto from "crypto";
import { redisClient } from "../config/redis.js";

const TOKEN_PREFIX =
    process.env.ACCESS_TOKEN_PREFIX;

const TOKEN_TTL =
    Number(process.env.ACCESS_TOKEN_TTL_SECONDS);

export function generateAccessToken() {
    return crypto.randomInt(100000, 1000000).toString();
}

export async function saveAccessToken(userId, token) {
    const key = `${TOKEN_PREFIX}${userId}`;

    await redisClient.set(key, token, {
        EX: TOKEN_TTL
    });
}

export async function createAccessToken(userId) {
    const token = generateAccessToken();

    await saveAccessToken(userId, token);

    return token;
}