const router = require('koa-router')()
const db = require('../utils/connect')

router.prefix('/api/friend')

/**
 * 系统推荐好友
 */
router.get('/getNewFriends',async (ctx,next)=>{
    //获取未关注的用户
    const userId = ctx.query.userId;
    let sql = `select a.*,b.name,b.hobbies from user as a left join userInfo as b on a.id = b.userId where a.id != ? and a.id not in (select friendUserId from friends where userId = ?)`;
    let values = [userId,userId];
    const newFriendsRes = await db.executeSql(sql,values);
    
    //获取当前用户的爱好
    sql = `select a.*,b.name,b.hobbies from user as a left join userInfo as b on a.id = b.userId where a.id = ?`;
    values = [userId];
    const user = await db.executeSql(sql,values);
    
    //未关注用户与当前用户匹配
    let newFriends_middle = [];
    newFriendsRes.map(element=>{
      if(element.hobbies!="" && element.hobbies){
        var hobbies = element.hobbies.split(",");
        var hobbyLike = 0;
        hobbies.map(element=>{
          if(user[0].hobbies.indexOf(element)>=0){
            hobbyLike++;
          }
        })
        if(hobbyLike>=1){
          newFriends_middle.push(element);
        }
      }
    })
    if(newFriendsRes.length==0){
        ctx.body = []
        return false
    }
    
    const randomNumber = 10;//返回最大条数
    
    let flag = true;//循环停止标记
    let newFriends = [];//匹配到的推荐好友
    let randomList = [];//随机数下标数组，不重复，防止出现相同推荐
    let index = 0;//返回记录数
    
    
    //未匹配到好友，对所有未关注用户数据随机抽取
    if(newFriends_middle.length==0){
      while(flag){
        const random = Math.floor(Math.random()*newFriendsRes.length);//随机数
        if(randomList.indexOf(random)>=0){//检查是否数组出现过
          flag = true
        }else{//未出现，则放入本次推荐数组
          randomList.push(random);
          newFriends.push(newFriendsRes[random]);
          index++
        }
      
        if(newFriendsRes.length<randomNumber && index>=newFriendsRes.length){
          flag = false
        }else if(newFriendsRes.length>=randomNumber && index>=randomNumber){
          flag = false
        }
      }

      ctx.body = newFriends.map(element=>{
        element.isAttention = false;//所有推荐均为未关注
        return element
      });
      return false
    }
    
    //对匹配成功数据随机抽取
    while(flag){
      const random = Math.floor(Math.random()*newFriends_middle.length);//随机数
      if(randomList.indexOf(random)>=0){//检查是否数组出现过
        flag = true
      }else{//未出现，则放入本次推荐数组
        randomList.push(random);
        newFriends.push(newFriends_middle[random]);
        index++
      }
      
      if(newFriends_middle.length<randomNumber && index>=newFriends_middle.length){//好友数小于最返回数，且达到匹配到的最大推荐数，跳出循环
        flag = false
      }else if(newFriends_middle.length>=randomNumber && index>=randomNumber){//好友数大于最大返回数，达到最大返回记录数，跳出循环
        flag = false
      }
    }
    
    ctx.body = newFriends.map(element=>{
      element.isAttention = false;//所有推荐均为未关注
      return element
    });
})

/**
 * 获取关注列表
 */
router.get('/getAttentions',async (ctx,next)=>{
    const userId = ctx.query.userId;
    const sql = `select a.*,b.nickName,b.photo from friends as a left join user as b on a.friendUserId = b.id where a.userId = ?`;
    const values = [userId];
    const res = await db.executeSql(sql,values);
    ctx.body = res.map(element=>{
      element.isAttention = true;
      return element
    });
})

/**
 * 获取被关注列表
 */
router.get('/getBeAttentions',async (ctx,next)=>{
    const userId = ctx.query.userId;
    let sql = `select a.*,b.nickName,b.photo from friends as a left join user as b on a.friendUserId = b.id where a.userId = ? and a.friendUserId !=?`;
    let values = [userId,userId];
    const attentionRes = await db.executeSql(sql,values);
    
    sql = `select a.*,b.nickName,b.photo from friends as a left join user as b on a.userId = b.id where a.friendUserId = ?`;
    values = [userId];
    const beAttentionRes = await db.executeSql(sql,values);
    
    let arr = [];
    
    attentionRes.forEach((element,index)=>{
      arr[element.friendUserId] = element.userId;
    })
    
    beAttentionRes.forEach((element,index)=>{
      if(element.friendUserId === arr[element.userId]){
        beAttentionRes.splice(index,1)
      }else{
        element.isAttention = false
      }
    })
    ctx.body = beAttentionRes.map(element=>{
      let obj = element;
      let userId = element.friendUserId;
      let fUserId = element.userId;;
      obj.userId = userId;
      obj.friendUserId = fUserId;
      return obj;
    });
})

/**
 * 获取相互关注列表
 */
router.get('/getFriends',async (ctx,next)=>{
    const userId = ctx.query.userId;
    //获取关注sql
    let sql = `select a.*,b.nickName,b.photo from friends as a left join user as b on a.friendUserId = b.id where a.userId = ? and a.friendUserId!=?`;
    let values = [userId,userId];
    const attentionRes = await db.executeSql(sql,values);
    
    //获取被关注sql
    sql = `select a.*,b.nickName,b.photo from friends as a left join user as b on a.userId = b.id where a.friendUserId = ?`;
    values = [userId];
    const beAttentionRes = await db.executeSql(sql,values);
    
    let arr = [];
    
    beAttentionRes.forEach((element,index)=>{
      arr[element.userId] = element.friendUserId;
    })
    
    let friends = [];
    
    attentionRes.map(element=>{
      if(element.userId === arr[element.friendUserId]){
        friends.push(element)
      }
    })
    
    ctx.body = friends.map(element=>{
      element.isAttention = true;
      return element
    });
})


/**
 * 添加关注用户
 */
router.post('/addFriends',async (ctx,next)=>{
    const {userId,friendUserId} = ctx.request.body;
    const friend = {};
    friend.userId = userId;
    friend.friendUserId = friendUserId;
    friend.createTime = formatTime();
    const res = await db.add(friend,"friends");
    ctx.body = {status:100, data:"已关注",friendId:res}
})

/**
 * 取消关注
 */
router.post('/cancelFriends',async (ctx,next)=>{
    const {userId,friendUserId} = ctx.request.body;
    const sql = `delete from friends where userId = ? and friendUserId = ?`;
    const values = [userId,friendUserId];
    const res = await db.executeSql(sql,values);
    ctx.body = "已取消关注";
})

/**
 * 时间格式化
 * @param {new date()} date 
 */
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
