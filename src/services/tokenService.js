import crypto from "crypto";
import { redisClient } from "../config/redis.js";

const TOKEN_PREFIX =
    process.env.ACCESS_TOKEN_PREFIX;

const TOKEN_TTL =
    Number(process.env.ACCESS_TOKEN_TTL_SECONDS);

export function generateAccessToken() {
    return crypto.randomInt(100000, 1000000).toString();
}

export async function saveAccessToken(email, token) {
    const key = `${TOKEN_PREFIX}${email}`;

    await redisClient.set(key, token, {
        EX: TOKEN_TTL
    });
}

export async function createAccessToken(email) {
    const token = generateAccessToken();

    await saveAccessToken(email, token);

    return token;
}
