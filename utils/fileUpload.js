const router = require('koa-router')();
const fs = require('fs');
const uuid = require('uuid/v4')

router.prefix("/api")
/**
 * 上传文件接口
 */
router.post('/upload', async (ctx, next) => {
    //获取上传的文件
    let userId = ctx.request.body.userId;
    let uuidStr = uuid();
    let uploadFile = ctx.request.files.file;//获取到上传文件
    let type = uploadFile.type;
    let name = uploadFile.name;
    let suffix = name.split(".")[1];
    
    let reName = uuidStr+"."+suffix;
    
    if(type.indexOf("image")>=0 || type.indexOf("video")>=0 || type.indexOf("application/vnd")>=0 || type==="text/plain"){
        
    }else{
        ctx.body = "非法上传文件";
        return false;
    }
    // let { someName } = ctx.request.body;//获取其他参数，暂无用到
    // console.log(someName);
    let uploadTime = ""+new Date().getFullYear()+(new Date().getMonth()+1)+(new Date().getDate()<10?"0"+new Date().getDate():new Date().getDate());
    let dirName = `./server/public/uploadFiles/${userId}/${uploadTime}/`;
    let uploadFilePath = uploadFile.path;
    let res = await new Promise((resolve,reject)=>{
        fs.exists(dirName,async (exists)=>{
            let writeFileRes = {}
            let writeFilePath = dirName+reName;
            if(exists){
                writeFileRes = await writeFileByStream(uploadFilePath,writeFilePath,type,reName);
                resolve(writeFileRes);
            }else{
                fs.mkdir(dirName,{recursive:true},async ()=>{
                    writeFileRes = await writeFileByStream(uploadFilePath,writeFilePath,type,reName);
                    resolve(writeFileRes);
                });
            }
        });
    });
    ctx.body = res;
})

function writeFileByStream(filePath,writeFilePath,fileType,fileName){
    
    let readStream = fs.createReadStream(filePath);//打开读取流,path读的地址，[options]:highWaterMark:每次读取大小，默认16KB，单位B，数字
    let writeStream = fs.createWriteStream(writeFilePath);//打开写流，path读的地址，[options]:highWaterMark:每次读取大小，默认16KB，单位B，数字

    readStream.pipe(writeStream);
    
    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
            resolve({status:"已上传",path:writeFilePath,type:fileType,name:fileName});
        });
    });
}

module.exports = router; 