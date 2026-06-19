import {Router} from 'express';
import {requireAdmin, requireLog} from "../middleware/requireAdmin.js";
import {db} from "../db.js";


const router = Router();
export const toInt = (v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number.parseInt(String(v), 10);
    return Number.isInteger(n) ? n : null;
};

async function getPublicBets(client = db) {
    return client.bets.findMany({
        orderBy: {id: "asc"},
        select: {
            matchId: true,
            pick: true,
            amount: true,
        },
    });
}


export default router;
//GET
router.get('/', requireAdmin, async (req_, res) => {
    res.json(await db.bets.findMany({orderBy: {id:"asc"}}));
})

router.get('/public', async (req_, res) => {
    res.json(await getPublicBets());
});

//GET
router.get('/by/match/:id', requireAdmin, async (req, res) => {
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
        const result = await db.$transaction(async (tx) => {
            const match = await tx.matchService.findUnique({ where: { id: matchID } });
            if (!match) throw Object.assign(new Error("matchId is invalid"), {status: 400});
            if (match.status !== "scheduled") {
                throw Object.assign(new Error("Match has been already started!"), {status: 400});
            }

            const user = await tx.user.findUnique({
                where: { id: userID },
                select: {
                    id: true,
                    is_banned: true,
                    is_verified: true,
                    avalible_balance: true,
                },
            });
            if (!user) throw new Error("user doesn't exist");
            if (user.is_banned) throw Object.assign(new Error("User is banned"), {status: 403});
            if (!user.is_verified) throw Object.assign(new Error("User is not verified"), {status: 403});
            if (user.avalible_balance < amount) throw new Error("you don't have enough money");

            await tx.user.update({
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
        req.app.locals.io?.emit("betsUpdate", await getPublicBets());
        return res.status(200).json(result);

    } catch (err) {
        return res.status(err.status ?? 400).json({ error: err.message });
    }
});
