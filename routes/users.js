const router = require('koa-router')()
const db = require('../utils/connect')
const crypto = require('crypto')
const redis = require('redis')
const uuid = require('uuid/v4')

/**
 * 验证码库
 */
const checkCode_UpperCase = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z'];
const checkCode_number = [1,2,3,4,5,6,7,8,9,0];
const checkCodeArr = [checkCode_UpperCase,checkCode_number];

var client = redis.createClient(6379, '127.0.0.1')
client.on('error', function (err) {
  console.log('Error ' + err);
});

// client.expire("要设置过期的key","过期时间")

router.prefix('/api/user')

/**
 * 获取验证码
 */
router.get('/getCheckCode',async (ctx,nexx)=>{
  /**
   * redis设置验证码
   */
  let code = getCheckCode();
  ctx.body = { status: 1, data: code };
})

/**
 * 注册时验证用户名是否使用过
 */
router.get('/checkExistUserName', async (ctx,next)=>{
  let loginName = ctx.query.loginName;
  let sql = "select * from user where loginName = ?";
  let param = [loginName];
  const res = await db.executeSql(sql,param);
  if(res.length==0){
    ctx.body = {status:1, data:"可注册"};
  }else{
    ctx.body = {status:1, data:"用户名已存在"};
  }
})

/**
 * 注册用户 
 */
router.post('/regist', async function (ctx, next) {
  /**
   * 获取redis保存的验证码
   */
  let {loginName,password,nickName,checkCode,checkCodeId} = ctx.request.body;
  const redisCheckCode = await getRedisCheckCode(checkCodeId);

  if(redisCheckCode!=checkCode.toUpperCase()){
    ctx.body = {status:5, msg:"验证码错误"};
    return false;
  }

  let userObj = {
    loginName:loginName,
    password:md5Password(password),
    status:0,
    token:md5Token(),
    nickName:nickName
  };

  let isExist = await db.executeSql("select id from user where loginName = ?",[loginName]);//检查用户名

  if(isExist.length!=0){
    ctx.body = {status:6, msg:"账号已存在，请重新填写"};
    return false;
  }

  const res = await db.add(userObj,"user");
  const resUser = {};
  resUser.id = res;
  resUser.nickName = nickName;
  resUser.loginName = loginName;
  ctx.body = {status: 1, data: resUser};

  let userInfoObj = {
    name:nickName,
    userId:res,
    phoneNumber:"",
    gender:0,
    birthday:"",
    hobbies:""
  }
  db.add(userInfoObj,"userInfo");
})

/**
 * 登陆
 */
router.get('/login',async (ctx,next)=>{
  
  let {loginName,password} = ctx.query;

  let sql = "select a.id,a.loginName,a.nickName,a.status,a.token,a.photo,b.name,b.gender,b.birthday,b.phoneNumber,b.hobbies from user as a left join userInfo as b on a.id = b.userId where a.loginName = ? and a.password = ?";
  let params = [loginName,md5Password(password)];

  const res = await db.executeSql(sql,params);
  
  if(res.length==0){
    ctx.body = {status:2, msg:"账号或密码错误"};
    return false;
  }
  if(res[0].status==1){
    ctx.body = {status:3, msg:"账号已冻结，请联系管理员"};
    return false;
  }else if(res[0].status==2){
    ctx.body = {status:4, msg:"账号已注销，请联系管理员"};
    return false;
  }else{
    const friendsSql = `select a.*,b.nickName from friends as a left join user as b on a.friendUserId = b.id where a.userId = ?`;
    params = [res[0].id];
    let friends = await db.executeSql(friendsSql,params);
    let newToken = md5Token();
    res[0].token = newToken;

    const updateTokenSql = `update user set token = ? where id = ?`;
    params = [newToken,res[0].id];
    db.executeSql(updateTokenSql,params);
    
    const resUser = {};
    resUser.id = res[0].id;
    resUser.nickName = res[0].nickName;
    resUser.photo = res[0].photo;
    resUser.name = res[0].name;
    resUser.gender = res[0].gender==0?"女":"男";
    resUser.birthday = res[0].birthday;
    resUser.phoneNumber = res[0].phoneNumber;
    resUser.hobbies = res[0].hobbies;
    resUser.token = newToken;
    
    resUser.friends = friends;

    ctx.body = {status:1, data:resUser};
  }
});

router.get('/logout', async function (ctx, next) {
  const userId = ctx.query.userId;
  const updateObj = {};
  updateObj.id = userId;
  updateObj.status = 3;
  updateObj.token = '';
  const res = await db.update(updateObj, 'user');

  if (res === 0) {
    ctx.body = {status: 5, msg: "账号不存在"};
    return false;
  }
  
  ctx.body = {status: 1, data: "账号已退出"};
})

/**
 * 获取全部用户列表 
 */
router.get('/getUsers', async function (ctx, next) {
  const res = await db.executeSql("select a.id,a.nickName,a.photo,a.status,b.name,b.gender,b.birthday,b.hobbies from user as a left join userInfo as b on a.id = b.userId",[])
  ctx.body = res;
})

/**
 * 获取单个用户
 */
router.get('/getUser',async (ctx,next)=>{
  const userId = ctx.query.userId;
  const sql = "select a.id,a.nickName,a.photo,b.name,b.phoneNumber,b.gender,b.birthday,b.hobbies from user as a left join userInfo as b on a.id = b.userId where a.id = ?";
  const values = [userId];
  const res = await db.executeSql(sql,values);
  ctx.body = res[0];
})

/**
 * 更新用户信息 
 */
router.post('/updateUser', async (ctx,next)=>{
  let {id,nickName,photo="",name,phoneNumber,gender,birthday,hobbies} = ctx.request.body;

  const userObj = {};
  userObj.id = id;
  userObj.nickName = nickName;
  userObj.photo = photo;
  
  const res = await db.update(userObj,"user");
  if(res===0){
    ctx.body = "未找到记录ID";
    ctx.status = 404;
    return false;
  }

  const sql = `update userInfo set name = ?,phoneNumber = ?,gender = ?,birthday = ?,hobbies = ? where userId = ?`;
  const params = [name,phoneNumber,gender,birthday,hobbies,id];
  const res1 = await db.executeSql(sql,params);
  ctx.body = "修改成功";
});

//delete
/**
 * 删除用户 
 * 最好是移动数据到别的库
 */
router.get('/deleteUser', async (ctx,next)=>{
  let {id} = ctx.query;
  const userObj = {};
  userObj.id = id;
  const res = await db.delete(userObj,"user");
  if(res===0){
    ctx.body = "未找到记录ID";
    return false;
  }
  ctx.body = res;
});

/**
 * 更新密码 
 */
router.post('/updatePassword',async (ctx,next)=>{
  let {loginId,password} = ctx.request.body;
  let userObj = {};
  userObj.id = loginId;
  userObj.password = md5Password(password);//调用加密

  const res = await db.update(userObj,"user");
  if(res===0){
    ctx.body = "未找到记录ID";
    return false;
  }
  ctx.body = "修改成功";
});

/**
 * 获取全部兴趣爱好
 */
router.get('/getAllHobbies',async (ctx,next)=>{
  const sql = "select a.id,a.name as sortName,b.name as hobbiesName from hobbySort as a left join hobbies as b on a.id = b.sortId where a.isDeleted = 0 and b.isDeleted = 0";
  const res = await db.executeSql(sql,[]);
  
  let newArr = [];
  let flagName = "";
  res.map(element=>{
    if(element.sortName != flagName){
      flagName = element.sortName;
      let obj = {};
      obj.name = element.sortName;
      obj.array = [];
      newArr[element.id] = obj;
    }
    newArr[element.id].array.push(element.hobbiesName);
  })
  
  let formatArr = [];
  newArr.map(element=>{
    formatArr.push(element);
  })
  ctx.body = formatArr;
});

/**
 * 加密密码
 * @param {String} str 
 */
function md5Password(str){
  const md5 = crypto.createHash('md5');
  return md5.update(str+"|pass").digest('hex');
}
/**
 * 加密token
 */
function md5Token(){
  const md5 = crypto.createHash('md5');
  return md5.update(new Date().getTime()+"|token").digest('hex');
}
/**
 * 返回验证码
 */
function getCheckCode(){

  let i = 0;
  let codeStr = "";
  const checkCode = {};
  let uuidStr = uuid();

  while(i<4){
    const type = Math.floor(Math.random()*2);
    codeStr += checkCodeArr[type][Math.floor(Math.random()*checkCodeArr[type].length)];
    i++;
  }
  client.set(uuidStr,codeStr,redis.print);
  checkCode.id = uuidStr;
  checkCode.code = codeStr;
  return checkCode;
}

/**
 * 获取redis中的校验码
 */
function getRedisCheckCode(checkCodeId){
  return new Promise((resolve,reject)=>{
    client.get(checkCodeId,(err,value)=>{
      if(err) reject(err);
      resolve(value)
    });
  });
}

module.exports = router
