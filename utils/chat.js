const router = require('koa-router')();

router.get('/index',async (ctx, next) => {
    await ctx.render('index')
})

router.get('/getUsers', async function (ctx, next) {
    console.log(2);
    ctx.body = 13;
  })

module.exports = router; 