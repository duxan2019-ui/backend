import jwt from 'jsonwebtoken'
export function requireAdmin(req, res, next) {
    const header = req.headers.authorization || ""
    const [type , token] = header.split(' ');
    if(type !== "Bearer" || !token){
        return res.status(401).json({error: "Missing token"})
    }

    try{
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        if(payload.role !== 'ADMIN' ){
            return res.status(403).json({error: "Admin only :)"})
        }
        req.user = payload;
        return next();
    }catch{
        return res.status(401).json({error: "Invalid token"})
    }
}
export function requireLog(req, res, next) {
    const header = req.headers.authorization || ""
    const [type , token] = header.split(' ');
    if(type !== "Bearer" || !token){
    return res.status(401).json({error: "Missing token"})
    }
    try{
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        if(payload.role === 'ADMIN' || payload.role === 'USER' ){
            req.user = payload;
            return next();
        }else{
            return res.status(401).json({error: "Unauthorized"})
        }
    }catch{
        return res.status(401).json({error: "Unauthorized"})
    }
}