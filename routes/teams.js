import {Router} from 'express';
import {db} from '../db.js';

import prismaPkg from "@prisma/client";
import {requireAdmin} from "../middleware/requireAdmin.js";
const { Prisma } = prismaPkg;

const router = Router();

//GET /api/teams
router.get('/' , async (_req, res) => {
    const teams = await db.team.findMany({orderBy: {name:"asc"}});
    res.json(teams);
})
//POST /api/teams
router.post('/',requireAdmin, async (req, res) => {
    const name = String(req.body?.name ?? "").trim().toUpperCase();
    const scoreRaw = req.body?.score;
    if(!name) return res.status(400).json({error: "Name is required"});
    const score = scoreRaw === undefined || scoreRaw === null ? 0 : Number(scoreRaw);
    if(!Number.isInteger(score) || score < 0) return res.status(400).json({error: "Score must be an integer >=0"});
    try{
        const team = await db.team.create({ data:{name , score}})
        req.app.locals.io?.emit("TeamUpdate");
        return res.status(201).json(team)
    }catch(err){
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            return res.status(409).json({ error: "Team name must be unique" });
        }
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
})
//DEl /api/teams/delete-by-id/:id
router.delete('/delete-by-id/:id', requireAdmin, async (req, res) => {
    const id = req.params?.id;
    if(!id || isNaN(Number(id)) || Number(id) < 0) return res.status(400).json({error: "Id is invalid"});
    try{
        const parsedId = Number(id);
        const existingTeam = await db.team.findUnique({
            where: { id: parsedId }
        });
        const match = await db.matchService.findFirst({where:{
                OR:[
                    {team1Id: parsedId},
                    {team2Id:parsedId},
                ]}
        });
        if(match){
            return res.status(409).json({error: "Cannot delete team that has matches"});
        }
        if(!existingTeam){
            return res.status(404).json({error: "Team not found"});
        }
        const del = await db.team.delete({
            where: {id: parsedId},
        })
        return res.status(200).json(del);

    }catch(err){
        return res.status(500).json({error: err.message});
    }


})

//PUT  /api/teams/by-name/:name/score
router.put("/by-name/:name/score", requireAdmin, async (req, res) => {
    const name = String(req.params.name).trim().toUpperCase();
    const score = req.body?.score;
    if(!name) return res.status(400).json({error: "Name is required"});
    if(!Number.isInteger(score)) {
        return res.status(400).json({error: "Score must be an integer >=0"});
    }
    const teamObj = await db.team.findUnique({
        where: {name: name},
    })
    if(!teamObj){
        return res.status(404).json({error: "Team does not exist"});
    }
    let act_score = teamObj.score + score;
    try{
        const updated = await db.team.update({
            where: {name},
            data: {score: act_score},
        })
        return res.status(201).json(updated)
    }catch(err){
        console.error(err);
    }
})
export default router;