import pg from "pg";
import { createLogger } from "../observability/logger.js";

const { Pool } = pg;
const logger = createLogger({ component: "postgresql" });

export const database = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export async function connectDatabase() {
    const client = await database.connect();

    logger.info("PostgreSQL conectado", {
        operation: "connect",
        status: "success"
    });

    client.release();
}
