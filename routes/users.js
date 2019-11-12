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
  ctx.body = code;
})

/**
 * 注册时验证用户名是否使用过
 */
router.get('/checkExistUserName', async (ctx,next)=>{
  let loginName = ctx.query.loginName;
  let sql = "select * from user where loginName = ?";
  let param = [loginName];
  const res = await db.excuteSql(sql,param);
  if(res.length==0){
    ctx.body = {status:1,info:"可注册"};
  }else{
    ctx.body = {status:2,info:"用户名已存在"};
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
    ctx.body = {status:5,info:"验证码错误"};
    return false;
  }

  let userObj = {
    loginName:loginName,
    password:md5Password(password),
    status:0,
    token:md5Token(),
    nickName:nickName
  };

  let isExist = await db.excuteSql("select id from user where loginName = ?",[loginName]);//检查用户名

  if(isExist.length!=0){
    ctx.body = {status:6,info:"账号已存在，请重新填写"};
    return false;
  }

  const res = await db.add(userObj,"user");
  const resUser = {};
  resUser.id = res;
  resUser.nickName = nickName;
  resUser.loginName = loginName;
  ctx.body = resUser;

  let userInfoObj = {
    name:nickName,
    userId:res,
    phoneNumber:"",
    gender:0,
    birthday:""
  }
  db.add(userInfoObj,"userInfo");
})

/**
 * 登陆
 */
router.get('/login',async (ctx,next)=>{
  
  let {loginName,password} = ctx.query;

  let sql = "select id,loginName,nickName,status,token from user where loginName = ? and password = ?";
  let params = [loginName,md5Password(password)];

  const res = await db.excuteSql(sql,params);
  
  if(res.length==0){
    ctx.body = {status:2,info:"账号或密码错误"};
    return false;
  }
  if(res[0].status==1){
    ctx.body = {status:3,info:"账号已冻结，请联系管理员"};
    return false;
  }else if(res[0].status==2){
    ctx.body = {status:4,info:"账号已注销，请联系管理员"};
    return false;
  }else{
    let newToken = md5Token();
    res[0].token = newToken;
    const newLoginUser = await db.update(res[0],"user");
    const resUser = {};
    resUser.id = newLoginUser.id;
    resUser.nickName = newLoginUser.nickName;
    resUser.loginName = newLoginUser.loginName;

    ctx.body = {status:1,info:resUser};
  }
});

/**
 * 获取全部用户列表 
 */
router.get('/getUsers', async function (ctx, next) {
  const res = await db.excuteSql("select * from user",[])
  ctx.body = res;
})

/**
 * 更新用户信息 
 */
router.post('/updateUser', async (ctx,next)=>{
  let {loginId,nickName,photo="",name,phoneNumber,gender,birthday} = ctx.request.body;
  const userObj = {};
  userObj.id = loginId;
  userObj.nickName = nickName;
  userObj.photo = photo;
  
  const res = await db.update(userObj,"user");
  if(res===0){
    ctx.body = "未找到记录ID";
    ctx.status = 404;
    return false;
  }

  const sql = `update userInfo set name = ?,phoneNumber = ?,gender = ?,birthday = ? where userId = ${loginId}`;
  const params = [name,phoneNumber,gender,birthday];
  const res1 = await db.excuteSql(sql,params);
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
  checkCode.number = codeStr;
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
