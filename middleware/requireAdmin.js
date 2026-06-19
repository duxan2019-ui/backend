import jwt from "jsonwebtoken";
import { db } from "../db.js";

function jwtSecret() {
    if (!process.env.JWT_SECRET) {
        const err = new Error("JWT_SECRET is not configured");
        err.status = 500;
        throw err;
    }
    return process.env.JWT_SECRET;
}

export function getBearerToken(header = "") {
    const [type, token] = String(header).split(" ");
    return type === "Bearer" && token ? token : null;
}

export function verifyToken(token) {
    const payload = jwt.verify(token, jwtSecret());
    return {
        ...payload,
        role: String(payload.role ?? "").toUpperCase(),
        id: payload.id === undefined ? undefined : Number(payload.id),
    };
}

async function assertUserCanUseApi(payload) {
    if (payload.role !== "USER") return payload;
    if (!Number.isInteger(payload.id) || payload.id <= 0) {
        const err = new Error("Invalid user token");
        err.status = 401;
        throw err;
    }

    const user = await db.user.findUnique({
        where: { id: payload.id },
        select: { id: true, is_banned: true, is_verified: true },
    });

    if (!user || !user.is_verified) {
        const err = new Error("User is not verified");
        err.status = 401;
        throw err;
    }
    if (user.is_banned) {
        const err = new Error("User is banned");
        err.status = 403;
        throw err;
    }

    return payload;
}

export async function requireAdmin(req, res, next) {
    const token = getBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "Missing token" });

    try {
        const payload = verifyToken(token);
        if (payload.role !== "ADMIN") {
            return res.status(403).json({ error: "Admin only" });
        }
        req.user = payload;
        return next();
    } catch (err) {
        const status = err.status ?? 401;
        return res.status(status).json({ error: status === 500 ? "Server error" : "Invalid token" });
    }
}

export async function requireLog(req, res, next) {
    const token = getBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "Missing token" });

    try {
        const payload = verifyToken(token);
        if (payload.role !== "ADMIN" && payload.role !== "USER") {
            return res.status(401).json({ error: "Unauthorized" });
        }
        req.user = await assertUserCanUseApi(payload);
        return next();
    } catch (err) {
        const status = err.status ?? 401;
        return res.status(status).json({ error: err.message || "Unauthorized" });
    }
}
