import {json, Router} from 'express';
import {requireAdmin, requireLog} from "../middleware/requireAdmin.js";
import {db} from "../db.js";


const router = Router();
export const toInt = (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number.parseInt(String(v), 10);
    return Number.isInteger(n) ? n : null;
};


export default router;
//GET
router.get('/', async (req_, res) => {
    res.json(await db.bets.findMany({orderBy: {id:"asc"}}));
})
//GET
router.get('/by/match/:id', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({error: "Invalid match id"});
    }
    res.json(await db.bets.findMany({
        where: {matchId: id}, orderBy: {id: "asc"},
    }))
})
//GET
router.get('/by/user/',requireLog, async (req, res) => {
    const userID = toInt(req.user.id);
    if (!Number.isInteger(userID) || userID <= 0) {
        return res.status(400).json({ error: "userId is invalid" });
    }

    res.json(await db.bets.findMany({
        where: {userId: userID}, orderBy: {id: "desc"}
    }))
})
//POST
router.post("/",requireLog, async (req, res) => {
    const matchID = toInt(req.body?.matchId);
    const userID = toInt(req.user.id);
    const amount = toInt(req.body?.amount);
    console.log(req.user);
    const allowedPicks = new Set(["team1", "team2", "draw"]);
    const pick = allowedPicks.has(req.body?.pick) ? req.body.pick : null;

    if (!Number.isInteger(matchID) || matchID <= 0) {
        return res.status(400).json({ error: "matchId is invalid" });
    }
    if (!Number.isInteger(userID) || userID <= 0) {
        return res.status(400).json({ error: "userId is invalid" });
    }
    if (!Number.isInteger(amount) || amount < 1) {
        return res.status(400).json({ error: "amount should be greater than 0" });
    }
    if (!pick) {
        return res.status(400).json({ error: "pick is invalid" });
    }

    try {
        const match = await db.matchService.findUnique({ where: { id: matchID } });
        if (!match) return res.status(400).json({ error: "matchId is invalid" });
        if (match.status !== "scheduled") {
            return res.status(400).json({ error: "Match has been already started!" });
        }

        const result = await db.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userID } });
            if (!user) throw new Error("user doesn't exist");
            if (user.avalible_balance < amount) throw new Error("you don't have enough money");

            const change_amount = await tx.user.update({
                where: { id: userID },
                data: {
                    avalible_balance: { decrement: amount },
                    frozen_balance: { increment: amount },
                },
            });

            const bet = await tx.bets.create({
                data: { matchId: matchID, userId: userID, pick, amount },
            });

            return {bet};
        });
        req.app.locals.io?.emit("betsUpdate", await db.bets.findMany({orderBy: {id:"asc"}}));
        return res.status(200).json(result);

    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
