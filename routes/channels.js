const router = require('koa-router')()
const db = require('../utils/connect')

router.prefix('/api/channel')

/**
 * 获取某人全部栏目
 */
router.get('/getChannels',async (ctx,next)=>{
    const userId = ctx.query.userId;

    if(userId=="" || !userId){
        ctx.body = "参数错误";
        return false;
    }

    const sql = "select * from channel where userId = ? and isDeleted = 0 order by serialNumber asc";
    const values = [userId];

    const res = await db.excuteSql(sql,values);
    ctx.body = res;
})

/**
 * 添加栏目
 */
router.post('/addChannel',async (ctx,next)=>{
    const {serialNumber,name,userId} = ctx.request.body;
    if(userId=="" || !userId){
        ctx.body = "参数错误";
        return;
    }
    const values = {};
    values.serialNumber = serialNumber;
    values.name = name;
    values.userId = userId;
    values.isDeleted = 0;
    const blogId = await db.add(values,"channel");
    ctx.body = blogId;
});

/**
 * 修改栏目
 */
router.post('/updateChannel',async (ctx,next)=>{
    const {id,serialNumber,name} = ctx.request.body;
    if(id=="" || !id){
        ctx.body = "参数错误";
        return;
    }
    const values = {};
    values.id = id;
    values.name = name;
    values.serialNumber = serialNumber;
    values.isDeleted = 0;

    const res = await db.update(values,"channel");
    ctx.body = res;
})

/**
 * 删除栏目
 */
router.get('/deleteChannel',async (ctx,next)=>{
    const id = ctx.query.channelId;
    if(id=="" || !id){
        ctx.body = "参数错误";
        return;
    }
    let sql = "update blog set isDeleted = 1 where channelId = ?";
    let values = [id];
    const blogs = await db.excuteSql(sql,values);

    sql = "update channel set isDeleted = 1 where id = ?";
    values = [id];
    const channels = await db.excuteSql(sql,values);
    
    ctx.body = "已删除";
})


module.exports = router