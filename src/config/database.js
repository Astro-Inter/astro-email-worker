import pg from "pg";

const { Pool } = pg;

export const database = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export async function connectDatabase() {
    const client = await database.connect();

    console.log("PostgreSQL conectado");

    client.release();
}