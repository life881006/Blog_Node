const db = require('./connect')

module.exports = function(){
    //配置处理
    return async(ctx,next)=>{
        //需验证tooken的页面
        if(/users\/update[\W]*/.test(ctx.url)){//特定接口检测登陆状态
            //let userId = ctx.header.token;
            let token = ctx.header.token;//通过header获取token
            let sql = `select id from user where token = ?`;
            const res = await db.query(sql,[token]);
            if(res.length==0){
                ctx.body = {status:302,message:"已在其他地方登录，请重新登陆"};
                return false;
            }
        }
        await next();
    }
}