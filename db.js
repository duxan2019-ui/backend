import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const { PrismaClient } = prismaPkg;

const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL, // file:./dev.db
});

export const db = new PrismaClient({ adapter });