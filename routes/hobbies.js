const router = require('koa-router')()
const db = require('../utils/connect')

router.prefix('/api/hobby')

/**
 * 获取全部兴趣分类
 */
router.get('/getHobbySorts',async (ctx,next)=>{
    const {sortOrder=0,currentPage=1,everyPage=10} = ctx.query;
    let orderStr = "";

    if(userId=="" || !userId){
        ctx.body = "参数错误";
        return false;
    }
    if(sortOrder==0){
        orderStr = " order by name asc";
    }else{
        orderStr = " order by name desc";
    }

    //${whereStr + " " + orderStr} limit ${(currentPage-1)*everyPage},${everyPage}

    let sql = `select * from hobbySort where isDeleted = 0 ${orderStr} limit ${(currentPage-1)*everyPage},${everyPage}`;
    const values = [];

    const res = await db.executeSql(sql,values);

    sql = `select count(id) as total from hobbySort where isDeleted = 0`;
    const total = await db.executeSql(sql,values);

    const resObj = {};
    resObj.data = res;
    resObj.total = total[0].total;

    ctx.body = resObj;
})

/**
 * 某条兴趣分类信息
 */
router.get('/getHobbySort',async (ctx,next)=>{
    const id = ctx.query.hobbySortId;
    
    const sql = `select * from hobbySort where id = ?`;
    const values = [id];
    
    const res = await db.executeSql(sql,values);
    ctx.body = res;
})

/**
 * 添加兴趣分类
 */
router.post('/addHobbySort',async (ctx,next)=>{
    const {name} = ctx.request.body;
    if(name=="" || !name){
        ctx.body = "参数错误";
        return;
    }
    const values = {};
    values.name = name;
    values.isDeleted = 0;
    const hobbySortId = await db.add(values,"hobbySort");
    ctx.body = hobbySortId;
});

/**
 * 修改栏目
 */
router.post('/updateHobbySort',async (ctx,next)=>{
    const {id,name} = ctx.request.body;
    if(id=="" || !id){
        ctx.body = "参数错误";
        return;
    }
    const values = {};
    values.id = id;
    values.name = name;
    values.isDeleted = 0;

    const res = await db.update(values,"hobbySort");
    ctx.body = res;
})

/**
 * 删除栏目
 */
router.get('/deleteHobbySort',async (ctx,next)=>{
    const id = ctx.query.hobbySortId;
    if(id=="" || !id){
        ctx.body = "参数错误";
        return;
    }
    let sql = "update hobbies set isDeleted = 1 where sortId = ?";
    let values = [id];
    await db.executeSql(sql,values);

    sql = "update hobbySort set isDeleted = 1 where id = ?";
    values = [id];
    await db.executeSql(sql,values);
    
    ctx.body = "已删除";
})

/**
 * 获取某个分类的全部爱好
 */
router.get('/getHobbiesBySort',async (ctx,next)=>{
    const sortId = ctx.query.hobbySortId
    let sql = "select * from hobbies where sortId = ?";
    let values = [sortId];
    const res = await db.executeSql(sql,values);
    ctx.body = res;    
});

/**
 * 添加兴趣爱好
 */
router.post('/addHobby',async (ctx,next)=>{
    const {name,sortId} = ctx.request.body;
    if(!name || name=="" || !sortId || sortId == ""){
      ctx.body = "参数错误";
      return false;
    }
    const values = {};
    values.name = name;
    values.sortId = sortId;
    const hobbyId = await db.add(values,"hobbies");
    ctx.body = hobbyId;
})

/**
 * 修改兴趣爱好
 */
router.post('/updateHobby',async (ctx,next)=>{
    const {name,id} = ctx.request.body;
    if(!name || name=="" || !id || id == ""){
      ctx.body = "参数错误";
      return false;
    }
    const values = {};
    values.name = name;
    values.id = id;
    values.isDeleted = 0;
    const hobbyId = await db.update(values,"hobbies");
    ctx.body = hobbyId;
});

/**
 * 删除兴趣爱好
 */
router.post('/deleteHobby',async (ctx,next)=>{
    const {id} = ctx.request.body;
    if(!id || id == ""){
      ctx.body = "参数错误";
      return false;
    }
    const values = {};
    values.id = id;
    values.isDeleted = 1;
    const hobbyId = await db.update(values,"hobbies");
    ctx.body = hobbyId;
});

module.exports = router