const router = require('koa-router')()
const db = require('../utils/connect')

router.prefix('/api/friend')
/**
 * 获取好友列表
 */
router.get('/getFriends',async (ctx,next)=>{
    const userId = ctx.query.userId;
    const sql = `select a.*,b.nickName from friends as a left join user as b on a.friendUserId = b.id where a.userId = ?`;
    const values = [userId];
    const res = await db.excuteSql(sql,values);
    ctx.body = res;
})

/**
 * 关注用户
 */
router.post('/addFriends',async (ctx,next)=>{
    const {userId,friendUserId} = ctx.request.body;
    const friend = {};
    friend.userId = userId;
    friend.friendUserId = friendUserId;
    const res = await db.add(friend,"friends");
    ctx.body = "已关注";
})

/**
 * 取消关注
 */
router.post('/cancelFriends',async (ctx,next)=>{
    const {userId,friendUserId} = ctx.request.body;
    const sql = `delete from friends where userId = ?,friendUserId = ?`;
    const values = [userId,friendUserId];
    const res = await db.excuteSql(sql,values);
    ctx.body = "已取消关注";
})

module.exports = router
