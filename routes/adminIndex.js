const router = require('koa-router')()
const db = require('../utils/connect')

router.prefix('/api/adminIndex')

/**
 * 获取最多阅读列表
 */
router.get("/getBlogsByView",async (ctx,next)=>{
    const userId = ctx.query.userId;
    const sql = `select id,title,readTimes from blog where userId = ? and isDeleted = 0 order by readTimes desc,createTime desc limit 10`;
    const values = [userId];
    const res = await db.executeSql(sql,values);
    ctx.body = res;
})

/**
 * 获取最多评论列表
 */
router.get("/getBlogsByComment",async (ctx,next)=>{
    const userId = ctx.query.userId;
    const sql = `select id,title,commentNumber from blog where userId = ? and isDeleted = 0 order by commentNumber desc,createTime desc limit 10`;
    const values = [userId];
    const res = await db.executeSql(sql,values);
    ctx.body = res;
})

router.get("/getBlogDataCount",async (ctx,next)=>{
    const userId = ctx.query.userId;
    const sql = `select count(id) as count,sum(commentNumber) as commentNumber,sum(readTimes) as readNumber from blog where userId = ? and isDeleted = 0 group by userId`;
    const values = [userId]
    const res = await db.executeSql(sql,values);
    ctx.body = res;
})

module.exports = router
