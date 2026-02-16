import {json, Router} from 'express';
import {db} from '../db.js';
import * as email_class from "./email.js"

import prismaPkg from "@prisma/client";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import {is_correct_Email} from "./email.js";
const { Prisma } = prismaPkg;
dotenv.config();

function signToken({ sub, role , id}) {
    return jwt.sign(
        { sub: String(sub), id: Number(id) ,role: String(role).toUpperCase() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN ?? "24h" }
    );
}



const router = Router();
router.post("/" , async (req, res) => {
    const username = String(req.body?.login);
    const password = String(req.body?.password);
    if(process.env.password === password && process.env.username === username) {
        return res.status(200).json({token : signToken({sub: "admin" , role: "admin"})})
    }else{
        return res.status(400).json({error: "invalid credentials"})
    }
})


router.post("/request", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!is_correct_Email(email)) {
        return res.status(400).json({ error: "Email is invalid" });
    }
    try {
        await email_class.sendLoginCode(email);
        return res.json({ status: "sent" });
    } catch (err) {
        return res.status(500).json({ error: String(err) });
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

        const codeFromDb = await db.code.findUnique({ where: { userId: userObj.id } });
        if (!codeFromDb) return res.status(401).json({ error: "Invalid code" });

        const result = email_class.verifyOtpWithExpiry(code, codeFromDb);
        if (!result.ok) return res.status(401).json({ error: result.reason});


        await db.code.delete({ where: { userId: userObj.id } });


        const token = signToken({ sub: email, id: userObj.id,  role: "USER" });
        return res.json({ token });
    } catch (err) {
        return res.status(500).json({ error: String(err) });
    }
});
export default router;