import {Router} from 'express';
import {db} from '../db.js';
import * as email_class from "./email.js"

import jwt from "jsonwebtoken";
import {is_correct_Email} from "./email.js";

function signToken({ sub, role , id}) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }
    const payload = { sub: String(sub), role: String(role).toUpperCase() };
    if (id !== undefined && id !== null) payload.id = Number(id);
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN ?? "24h" }
    );
}



const router = Router();
router.post("/" , async (req, res) => {
    const username = String(req.body?.login);
    const password = String(req.body?.password);
    const adminUsername = process.env.ADMIN_USERNAME ?? process.env.username;
    const adminPassword = process.env.ADMIN_PASSWORD ?? process.env.password;
    if (!adminUsername || !adminPassword) {
        return res.status(500).json({ error: "Admin credentials are not configured" });
    }

    if(adminPassword === password && adminUsername === username) {
        return res.status(200).json({token : signToken({sub: "admin" , role: "admin"})})
    }else{
        return res.status(401).json({error: "invalid credentials"})
    }
})


router.post("/request", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!is_correct_Email(email)) {
        return res.status(400).json({ error: "Email is invalid" });
    }
    try {
        const result = await email_class.sendLoginCode(email);
        if (!result.ok) {
            return res.status(result.status ?? 500).json({ error: result.error ?? "Email was not sent" });
        }
        return res.json({ status: "sent" });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
});
router.post("/verify", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const code = String(req.body?.code ?? "").trim();

    if (!is_correct_Email(email)) {
        return res.status(400).json({ error: "Email is invalid" });
    }
    if (!code) {
        return res.status(400).json({ error: "Code is required" });
    }

    try {
        const userObj = await db.user.findUnique({ where: { email } });
        if (!userObj) return res.status(401).json({ error: "Invalid email" });
        if (userObj.is_banned) return res.status(403).json({ error: "User is banned" });

        const codeFromDb = await db.code.findUnique({ where: { userId: userObj.id } });
        if (!codeFromDb) return res.status(401).json({ error: "Invalid code" });

        const result = email_class.verifyOtpWithExpiry(code, codeFromDb);
        if (!result.ok) return res.status(401).json({ error: result.reason});

        await db.user.update({ where: { id: userObj.id }, data: { is_verified: true } });
        await db.code.delete({ where: { userId: userObj.id } });
        


        const token = signToken({ sub: email, id: userObj.id,  role: "USER" });
        return res.json({ token });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
});
export default router;
