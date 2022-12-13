const router = require('koa-router')()
const db = require('../utils/connect')

router.prefix('/api/comment')

/**
 * 获取评论列表
 */
router.get('/getBlogComments',async (ctx,next)=>{
    const blogId = ctx.query.blogId;
    const sql = `select a.*,b.nickName,b.photo,c.nickName as replayNickName from comment as a left join user as b on a.userId = b.id left join user as c on a.replayUserId = c.id where a.blogId = ? order by a.createTime desc`;
    const values = [blogId];
    const res = await db.executeSql(sql,values);
    
    //获取附件表
    const annexSql = `select a.* from commentAnnex as a left join comment as b on a.commentId = b.id where a.blogId = ? and b.id is not null`;
    const annexRes = await db.executeSql(annexSql,values);
    
    let annexArr = [];
    for(let item of res){
      item.showMore = false;
      annexArr[item.id] = [];
    }
    
    for(let item of annexRes){
      if(annexArr[item.commentId]){
        annexArr[item.commentId].push(item);
      }
    }
    
    let arr = [];
    let trueArr = [];
    for(let item of res){
      if(item.replayCommentId==''){
        arr[item.id] = item;
        arr[item.id].children = []
      }
      const thumbArr = await db.executeSql("select thumb from commentThumb where commentId = ? and userId = ?",[item.id,item.userId]);
      if(thumbArr.length==0){
        item.thumb = {};
      }else{
        item.thumb = {isThumb:true,thumb:thumbArr[0].thumb};
      }
      item.annexes = annexArr[item.id]
    }
    for(let item of res){
      if(item.replayCommentId != "" && arr[item.replayCommentId]){
        arr[item.replayCommentId].children.push(item);
      }
    }
    for(let i in arr){
      if(arr[i]){
        trueArr.push(arr[i]);
      }
    }
    ctx.status = 200;
    ctx.body = trueArr;
})

/**
 * 获取某条评论
 */
router.get('/getComment',async (ctx,next)=>{
    const id = ctx.query.commentId;
    const sql = `select * from comment where id = ?`;
    const values = [id];
    const res = await db.executeSql(sql,values);
    ctx.status = 200;
    ctx.body = res[0];
})

/**
 * 添加评论
 * blog评论加1
 */
router.post('/addComment',async (ctx,next)=>{
    const {blogId,userId,content,replayCommentId="",replayUserId="",replayAnnexes=[]} = ctx.request.body;
    const comment = {};
    comment.blogId = blogId;
    comment.userId = userId;
    comment.content = content;
    comment.replayCommentId = replayCommentId;
    comment.replayUserId = replayUserId;
    comment.createTime = formatTime();
    comment.thumbUpNumber = 0;
    comment.thumbDownNumber = 0;
    const res = await db.add(comment,"comment");
    
    let annexes = [];
    replayAnnexes.map(item=>{
        const obj = {};
        obj.blogId = blogId;
        obj.commentId = res;
        obj.name = item.name;
        obj.url = item.url;
        obj.type = item.type;
        annexes.push(obj);
    });
    if(replayAnnexes.length!=0){
        await db.addBatch(annexes,"commentAnnex");
    }
    
    const updateSql = `update blog set commentNumber = commentNumber+1 where id = ?`;
    const values = [blogId];
    await db.executeSql(updateSql,values);
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
router.get('/deleteComment',async (ctx,next)=>{
    const commentId = ctx.query.commentId;
    let sql = `select * from comment where id = ? or replayCommentId = ?`;
    let values = [commentId,commentId];
    const res = await db.executeSql(sql,values);
    
    const blogId = res[0].blogId;
    const updateBlogSql = `update blog set commentNumber = commentNumber-? where id = ?`;
    values = [res.length,blogId];
    await db.executeSql(updateBlogSql,values);

    const deleteCommentSql = `delete from comment where id = ? or replayCommentId = ?`;
    values = [commentId,commentId];

    await db.executeSql(deleteCommentSql,values);
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
    const searchObj = await db.executeSql(sql,values);
    let thumbSql = "";
    let thumbValues = [commentId];
    if(searchObj.length!=0){
        let updateObj = searchObj[0];
        let oriThumb = updateObj.thumb;
        updateObj.thumb = thumb;
        if(thumb==1 && oriThumb==2){
            await db.update(updateObj,"commentThumb");
            thumbSql = `update comment set thumbUpNumber = thumbUpNumber+1,thumbDownNumber = thumbDownNumber-1 where id = ?`;
            await db.executeSql(thumbSql,thumbValues);
        }else if(thumb==2 && oriThumb==1){
            await db.update(updateObj,"commentThumb");
            thumbSql = `update comment set thumbUpNumber = thumbUpNumber-1,thumbDownNumber = thumbDownNumber+1 where id = ?`;
            await db.executeSql(thumbSql,thumbValues);
        }else if(thumb==1 && oriThumb==1){
            await db.delete(updateObj,"commentThumb");
            thumbSql = `update comment set thumbUpNumber = thumbUpNumber-1 where id = ?`;
            await db.executeSql(thumbSql,thumbValues);
        }else if(thumb==2 && oriThumb==2){
            await db.delete(updateObj,"commentThumb");
            thumbSql = `update comment set thumbDownNumber = thumbDownNumber-1 where id = ?`;
            await db.executeSql(thumbSql,thumbValues);
        }
    }else{
        const thumbObj = {};
        thumbObj.thumb = thumb;
        thumbObj.commentId = commentId;
        thumbObj.userId = userId;
        await db.add(thumbObj,"commentThumb");
        if(thumb==1){
            thumbSql = `update comment set thumbUpNumber = thumbUpNumber+1 where id = ?`;
            await db.executeSql(thumbSql,thumbValues);
        }else if(thumb==2){
            thumbSql = `update comment set thumbDownNumber = thumbDownNumber+1 where id = ?`;
            await db.executeSql(thumbSql,thumbValues);
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
    const searchObj = await db.executeSql(sql,values);
    let thumb = searchObj[0].thumb;
    if(thumb==1){//原本点赞的在点赞记录数上-1
        thumbSql = `update comment set thumbUpNumber = thumbUpNumber-1 where id = ${commentId}`;
        await db.executeSql(thumbSql);
    }else if(thumb==2){//原本点踩的在点踩记录数上-1
        thumbSql = `update comment set thumbDownNumber = thumbDownNumber-1 where id = ${commentId}`;
        await db.executeSql(thumbSql);
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