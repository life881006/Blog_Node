const router = require('koa-router')()
const db = require('../utils/connect')

router.prefix('/api/channel')

/**
 * 获取某人全部栏目
 */
router.get('/getChannels',async (ctx,next)=>{
    const {userId,searchText='',sortOrder=0,currentPage=1,everyPage=10} = ctx.query;
    let orderStr = "";
    let searchStr = "";

    if(userId=="" || !userId){
        ctx.body = "参数错误";
        return false;
    }
    
    if(searchText!=""){
        searchStr = ` and name like concat ('%',?,'%')`;
    }
    
    if(sortOrder==0){
        orderStr = " order by serialNumber asc";
    }else{
        orderStr = " order by serialNumber desc";
    }

    //${whereStr + " " + orderStr} limit ${(currentPage-1)*everyPage},${everyPage}

    let sql = `select * from channel where userId = ? and isDeleted = 0 ${searchStr} ${orderStr} limit ${(currentPage-1)*everyPage},${everyPage}`;
    let values = [userId];
    if(searchText!=""){
      values.push(searchText);
    }

    const res = await db.executeSql(sql,values);

    sql = `select count(id) as total from channel where userId = ? and isDeleted = 0`;
    const total = await db.executeSql(sql,values);

    const resObj = {};
    resObj.data = res;
    resObj.total = total[0].total;

    ctx.body = {status: 1, data: resObj};
})

/**
 * 某条栏目信息
 */
router.get('/getChannel',async (ctx,next)=>{
    const id = ctx.query.channelId;
    
    const sql = `select * from channel where id = ?`;
    const values = [id];
    
    const res = await db.executeSql(sql,values);
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
    const channelId = await db.add(values,"channel");
    ctx.body = channelId;
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
    const blogs = await db.executeSql(sql,values);

    values = {};
    values.id = id;
    values.isDeleted = 1;
    
    const channels = await db.update(values,"channel");
    
    ctx.body = "已删除";
})

/**
 * 获取最大序号
 */
router.get('/maxSerialNumber',async(ctx,next)=>{
    const id = ctx.query.userId;
    if(id=="" || !id){
        ctx.body = "参数错误";
        return;
    }
    let sql = "select max(serialNumber) as max from channel where userId = ? and isDeleted = 0";
    let values = [id];

    const res = await db.executeSql(sql,values);
    let max = 0;
    if(res[0].max){
      max = res[0].max+1;
    }else{
      max = 1;
    }
    ctx.body = max;
})

module.exports = router