import "dotenv/config";
import express from "express";
import cors from "cors";
import teams from "./routes/teams.js";
import match from "./routes/match.js";
import admin from "./routes/admin.js";
import bets from "./routes/bets.js";
import user from "./routes/user.js";
import email from "./routes/email.js";
import * as http from "node:http";
import {Server} from "socket.io";
import {verifyToken} from "./middleware/requireAdmin.js";


const app = express();

const defaultOrigins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "https://scoro.shov.studio",
];
const allowedOrigins = (process.env.CORS_ORIGINS ?? defaultOrigins.join(","))
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

function corsOrigin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
}

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/admin" , admin)
app.use("/api/teams" ,teams )
app.use("/api/match", match )
app.use("/api/bets" , bets)
app.use("/api/user", user)
app.use("/api/email", email)

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: corsOrigin, credentials: true },
});
app.locals.io = io;

let currentAdminTimer = null; // Сохраняем текущий таймер админа

// Эндпоинт для получения текущего таймера при загрузке страницы
app.get("/api/admin-timer", (req, res) => {
    res.json({ timerEndTime: currentAdminTimer });
});

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();

    try {
        socket.data.user = verifyToken(token);
        return next();
    } catch {
        return next(new Error("Unauthorized"));
    }
});

io.on("connection", (socket) => {
    console.log(`Client connected:${socket.id}`);
    
    // Отправляем текущий таймер новому подключению
    if (currentAdminTimer) {
        socket.emit("timerStarted", currentAdminTimer);
    }
    
    socket.on("auth", () => {
        const user = socket.data.user;
        if (!user || user.role !== "USER" || !Number.isInteger(user.id)) return;
        socket.join(`user:${user.id}`);
        socket.data.userId = user.id;
        console.log(`Socket ${socket.id} joined user:${user.id}`);
    });
    
    // Админ устанавливает таймер и отправляет конечное время всем
    socket.on("setAdminTimer", (endTime) => {
        if (socket.data.user?.role !== "ADMIN") {
            socket.emit("adminTimerError", "Admin token required");
            return;
        }
        const parsed = new Date(endTime);
        if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
            socket.emit("adminTimerError", "Timer end time must be in the future");
            return;
        }
        currentAdminTimer = endTime;
        console.log(`Timer set to: ${endTime}`);
        // Отправляем конечное время всем клиентам, они сами считают локально
        io.emit("timerStarted", endTime);
    });
    
    socket.on("disconnect", () => {
        console.log(`Client disconnected:${socket.id}`);
    })
})





const port = Number(process.env.PORT ?? 3000);
server.listen(port,'0.0.0.0', () => console.log(`API: http://localhost:${port}`));
