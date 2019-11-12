const router = require('koa-router')()
const db = require('../utils/connect')

router.prefix('/api/comment')

/**
 * 获取评论列表
 */
router.get('/getBlogComments',async (ctx,next)=>{
    const blogId = ctx.query.blogId;
    const sql = `select a.*,b.nickName from comment as a left join user as b on a.userId = b.id where a.blogId = ? order by a.createTime desc`;
    const values = [blogId];
    const res = await db.excuteSql(sql,values);
    ctx.status = 200;
    ctx.body = res;
})

/**
 * 获取某条评论
 */
router.get('/getComment',async (ctx,next)=>{
    const id = ctx.query.commentId;
    const sql = `select * from comment where id = ?`;
    const values = [id];
    const res = await db.excuteSql(sql,values);
    ctx.status = 200;
    ctx.body = res[0];
})

/**
 * 添加评论
 * blog评论加1
 */
router.post('/addComment',async (ctx,next)=>{
    const {blogId,userId,content,replayCommentId=""} = ctx.request.body;
    const comment = {};
    comment.blogId = blogId;
    comment.userId = userId;
    comment.content = content;
    comment.replayCommentId = replayCommentId;
    comment.createTime = formatTime();
    comment.thumbUpNumber = 0;
    comment.thumbDownNumber = 0;
    const res = await db.add(comment,"comment");
    
    const updateSql = `update blog set commentNumber = commentNumber+1 where id = ?`;
    const values = [blogId];
    await db.excuteSql(updateSql,values);
    ctx.status = 200;
    ctx.body = res;
})

/**
 * 修改评论
 */
router.post('/updateComment',async (ctx,next)=>{
    const {commentId,content} = ctx.request.body;
    const comment = {
        id:commentId,
        content:content
    };
    const res = await db.update(comment,"comment");
    ctx.status = 200;
    ctx.body = res;
})

/**
 * 删除评论
 * blog评论减1
 */
router.get('deleteComment',async (ctx,next)=>{
    const commentId = ctx.query.commentId;
    let sql = `select * from comment where id = ?`;
    let values = [commentId];
    const res = await db.excuteSql(sql);
    const blogId = res[0].blogId;
    const updateBlogSql = `update blog set commentNumber = commentNumber-1 where id = ?`;
    values = [blogId];
    await db.excuteSql(updateBlogSql,values);

    const deleteCommentSql = `delete from comment where id = ? or replayCommentId = ?`;
    values = [commentId,commentId];

    await db.excuteSql(deleteCommentSql,values);
    ctx.body = "已删除";
})

/**
 * 评论点赞
 * 评论点赞数+1或评论点踩数+1
 */
router.post('/updateCommentThumb',async (ctx,next)=>{
    const {commentId,userId,thumb} = ctx.request.body;
    const sql = `select * from commentThumb where commentId = ? and userId = ? `;
    let values = [commentId,userId];
    const searchObj = await db.excuteSql(sql,values);
    let thumbSql = "";
    if(searchObj.length!=0){
        let updateObj = searchObj[0];
        updateObj.thumb = thumb;
        await db.update(updateObj,"commentThumb");
        if(thumb==1){
            thumbSql = `update comment set thumbUpNumber = thumbUpNumber+1,thumbDownNumber = thumbDownNumber-1 where id = ${commentId}`;
            await db.excuteSql(thumbSql);
        }else if(thumb==2){
            thumbSql = `update comment set thumbUpNumber = thumbUpNumber-1,thumbDownNumber = thumbDownNumber+1 where id = ${commentId}`;
            await db.excuteSql(thumbSql);
        }
    }else{
        const thumbObj = {};
        thumbObj.thumb = thumb;
        thumbObj.commentId = commentId;
        thumbObj.userId = userId;
        await db.add(thumbObj,"commentThumb");
        if(thumb==1){
            thumbSql = `update comment set thumbUpNumber = thumbUpNumber+1 where id = ${commentId}`;
            await db.excuteSql(thumbSql);
        }else if(thumb==2){
            thumbSql = `update comment set thumbDownNumber = thumbDownNumber+1 where id = ${commentId}`;
            await db.excuteSql(thumbSql);
        }
    }
    
    ctx.body = "已更新";
})

/**
 * 评论取消点赞
 * 根据之前数据点赞、点踩-1
 */
router.get("/cancelCommentThumb",async (ctx,next)=>{
    const {commentId,userId} = ctx.request.body;
    const sql = `select * from commentThumb where commentId = ? and userId = ? `;
    let values = [commentId,userId];
    
    //查到该用户的评论点赞记录
    const searchObj = await db.excuteSql(sql,values);
    let thumb = searchObj[0].thumb;
    if(thumb==1){//原本点赞的在点赞记录数上-1
        thumbSql = `update comment set thumbUpNumber = thumbUpNumber-1 where id = ${commentId}`;
        await db.excuteSql(thumbSql);
    }else if(thumb==2){//原本点踩的在点踩记录数上-1
        thumbSql = `update comment set thumbDownNumber = thumbDownNumber-1 where id = ${commentId}`;
        await db.excuteSql(thumbSql);
    }
    //删除该用户的点赞记录
    await db.delete(searchObj[0],"commentThumb");
    ctx.body = "已取消";
});


function formatTime(date=new Date()){
    let year = date.getFullYear();
    let month = date.getMonth()+1;
    let day = date.getDate()<10?"0"+date.getDate():date.getDate();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();
    return year+"-"+month+"-"+day+" "+hour+":"+minute+":"+second;
}

module.exports = router