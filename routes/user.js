import {db} from "../db.js";
import {json, Router} from 'express';
import {toInt} from "./bets.js";
import {requireLog} from "../middleware/requireAdmin.js";



const router = Router();




export default router;
//GET
router.get('/', async (req, res) => {
  const users = await db.user.findMany({
    where: { is_verified: true },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      email: true,
      avalible_balance: true,
      frozen_balance: true,
      is_banned: true,
      is_verified: true,
    },
  });

  res.json(users);
});
router.get('/acc', requireLog ,async (req, res) => {
    const userID = toInt(req.user.id);
    if (userID) {
        res.status(200).json(await db.user.findUnique({where: {id: userID}}));
    } else {
        res.status(404).json({error: "User not found"});
    }

})
router.post('/', async (req, res) => {
    const email = req.body.email;
    try{
        const user = await db.user.create({
            data: {email: email, avalible_balance: 0, frozen_balance: 0},
        })
        res.json(user)
    }catch(err){
        res.status(500).json({error:err})
    }
})