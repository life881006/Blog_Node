const Koa = require('koa')
const app = new Koa()

const json = require('koa-json')
const koaBody = require('koa-body')
const bodyparser = require('koa-bodyparser')
const views = require('koa-views')

const jwt = require('./utils/jwtCheck')
const users = require('./routes/users')
const blogs = require('./routes/blogs')
const channels = require('./routes/channels')
const comments = require('./routes/comments')
const friends = require('./routes/friends')
const indexCount = require('./routes/adminIndex')
const fileUpload = require('./utils/fileUpload')
const chat = require('./utils/chat')
const cors = require('koa-cors')

app.use(koaBody({
  multipart:true,
  formidable:{
    maxFileSize:100*1024*1024,
    multipart:true
  },
  onError:(error,ctx)=>{
    if(error.toString().indexOf("maxFileSize exceeded")>=0){
      ctx.res.write("overMax");
      ctx.res.end();
      throw error;
    }
  }
}));

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

app.use(cors({
  origin: () => {
    return 'http://localhost:8081';
  },
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
}))
app.use(json())
app.use(require('koa-static')(__dirname + '/public'))

app.use(jwt())
app.use(fileUpload.routes(), fileUpload.allowedMethods())
app.use(users.routes(), users.allowedMethods())
app.use(blogs.routes(), blogs.allowedMethods())
app.use(channels.routes(), channels.allowedMethods())
app.use(comments.routes(), comments.allowedMethods())
app.use(friends.routes(), friends.allowedMethods())
app.use(indexCount.routes(), indexCount.allowedMethods())

app.use(chat.routes(), chat.allowedMethods())


app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
  // error-handling
  // app.on('error', (err, ctx) => {
  //   console.error('server error', err, ctx)
  // });

