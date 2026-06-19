import {db} from "../db.js";
import {Router} from 'express';
import {requireAdmin, requireLog} from "../middleware/requireAdmin.js";
import {is_correct_Email} from "./email.js";



const router = Router();

const toInt = (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number.parseInt(String(v), 10);
    return Number.isInteger(n) ? n : null;
};

function publicDisplayName(email) {
    const name = String(email).split("@")[0] || "user";
    return name.replace(".", " ");
}



export default router;
router.get('/', requireAdmin, async (req, res) => {
  const users = await db.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      email: true,
      avalible_balance: true,
      frozen_balance: true,
      is_banned: true,
      is_verified: true,
      code_requests: true,
      last_code_request: true,
    },
  });

  res.json(users);
});

router.get('/leaderboard', async (req, res) => {
    const users = await db.user.findMany({
        where: { is_verified: true, is_banned: false },
        orderBy: { id: 'asc' },
        select: {
            id: true,
            email: true,
            avalible_balance: true,
            frozen_balance: true,
        },
    });

    res.json(users.map(user => ({
        id: user.id,
        displayName: publicDisplayName(user.email),
        avalible_balance: user.avalible_balance,
        frozen_balance: user.frozen_balance,
    })));
});

router.get('/acc', requireLog ,async (req, res) => {
    const userID = toInt(req.user.id);
    if (userID) {
        const user = await db.user.findUnique({
            where: {id: userID},
            select: {
                id: true,
                email: true,
                avalible_balance: true,
                frozen_balance: true,
                is_banned: true,
                is_verified: true,
            },
        });
        if (!user) return res.status(404).json({error: "User not found"});
        res.status(200).json(user);
    } else {
        res.status(404).json({error: "User not found"});
    }

})
router.post('/', requireAdmin, async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const avalible_balance = toInt(req.body?.avalible_balance) ?? 0;
    const frozen_balance = toInt(req.body?.frozen_balance) ?? 0;
    if (!is_correct_Email(email)) {
        return res.status(400).json({error: "Email is invalid"});
    }
    if (avalible_balance < 0 || frozen_balance < 0) {
        return res.status(400).json({error: "Balance must be >= 0"});
    }
    try{
        const user = await db.user.create({
            data: {email, avalible_balance, frozen_balance},
        })
        res.status(201).json(user)
    }catch(err){
        if (err?.code === "P2002") return res.status(409).json({error: "User already exists"});
        res.status(500).json({error:"Server error"})
    }
});

router.patch('/:id/ban', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({error: "Invalid user id"});
    }
    try {
        const user = await db.user.update({
            where: { id },
            data: { is_banned: true },
            select: {
                id: true,
                email: true,
                avalible_balance: true,
                frozen_balance: true,
                is_banned: true,
                is_verified: true,
                code_requests: true,
                last_code_request: true,
            },
        });
        req.app.locals.io?.to(`user:${id}`).emit("AccountBlocked");
        req.app.locals.io?.emit("UsersUpdate");
        res.json(user);
    } catch (err) {
        if (err?.code === "P2025") return res.status(404).json({error: "User not found"});
        res.status(500).json({error: "Server error"});
    }
});

router.patch('/:id/unban', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({error: "Invalid user id"});
    }
    try {
        const user = await db.user.update({
            where: { id },
            data: { is_banned: false },
            select: {
                id: true,
                email: true,
                avalible_balance: true,
                frozen_balance: true,
                is_banned: true,
                is_verified: true,
                code_requests: true,
                last_code_request: true,
            },
        });
        req.app.locals.io?.emit("UsersUpdate");
        res.json(user);
    } catch (err) {
        if (err?.code === "P2025") return res.status(404).json({error: "User not found"});
        res.status(500).json({error: "Server error"});
    }
});
