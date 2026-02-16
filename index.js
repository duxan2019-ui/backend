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


const app = express();

app.use(cors({ origin: "*" }));//change localhost
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
    cors: { origin: "*" },
});
app.locals.io = io;
io.on("connection", (socket) => {
    console.log(`Client connected:${socket.id}`);
    socket.on("auth", (userId) => {
        if (!userId) return;
        socket.join(`user:${userId}`);
        socket.data.userId = userId;
        console.log(`Socket ${socket.id} joined user:${userId}`);
    });
    socket.on("disconnect", () => {
        console.log(`Client disconnected:${socket.id}`);
    })
})





server.listen(3000,'0.0.0.0', () => console.log("API: http://localhost:3000"));