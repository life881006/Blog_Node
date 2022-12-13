const router = require('koa-router')()
const db = require('../utils/connect')

router.prefix('/api/blog')

/**
 * blog列表，默认显示10条
 */
router.get('/getBlogs', async (ctx, next) => {
  const {
    userId,
    sortType,
    searchType = '',
    keywords = '',
    publisher = '',
    sortOrder = 1,
    currentPage = 1,
    everyPage = 10,
  } = ctx.query
  let orderStr = ''
  let whereStr = ''
  let values = []
  if (sortType === 'title') {
    orderStr = ` order by a.title`
  } else if (sortType === 'channelName') {
    orderStr = ` order by c.name`
  } else {
    orderStr = ` order by a.createTime`
  }
  orderStr += sortOrder == 0 ? ' asc' : ' desc'

  if (userId && userId != '') {
    whereStr += ` where a.userId = ?`
    values.push(userId)
  }

  if (whereStr != '') {
    whereStr += ` and c.isDeleted = 0 and a.isDeleted = 0 `
  } else {
    whereStr += ` where c.isDeleted = 0 and a.isDeleted = 0 `
  }

  if (keywords && keywords != '') {
    if (searchType === "channelName") {
      whereStr += ` and c.name like concat ('%',?,'%') `
    } else if (searchType === "title") {
      whereStr += ` and a.title like concat ('%',?,'%') `
    }
    values.push(keywords)
  }

  if (publisher && publisher != '') {
    if (whereStr != '') {
      whereStr += ` and b.nickName like concat ('%',?,'%') `
    } else {
      whereStr += ` where b.nickName like concat ('%',?,'%') `
    }
    values.push(publisher)
  }

  const blogSql = `select a.id,a.title,a.channelId,a.userId,a.createTime,a.readTimes,a.commentNumber,a.thumbUpNumber,a.thumbDownNumber,b.nickName,c.name as channelName from blog as a 
    left join user as b on a.userId = b.id 
    left join channel as c on a.channelId = c.id 
    ${whereStr} ${orderStr} 
    limit ${(currentPage - 1) * everyPage},${everyPage}`

  values.push(0)
  const res = await db.executeSql(blogSql, values)

  if (res.length == 0) {
    ctx.status = 200
    ctx.body = { status: 1, data: [] }
    return false
  }

  let Arr = []
  let ids = ''
  res.forEach((item) => {
    ids += `'${item.id}',`
    //去除html标签，输出纯文字
    item.annexes = []
    Arr[item.id] = item
  })

  ids = ids.substring(ids, ids.length - 1)

  const annexesSql = `select * from blogAnnex where blogId in (${ids})`
  const annexesRes = await db.executeSql(annexesSql)

  annexesRes.forEach((element) => {
    if (Arr[element.blogId].annexes.length < 3) {
      Arr[element.blogId].annexes.push(element)
    }
  })

  let results = []
  for (let i in Arr) {
    results.push(Arr[i])
  }

  const totalSql = `select count(a.id) as total from blog as a 
    left join user as b on a.userId = b.id 
    left join channel as c on a.channelId = c.id 
     ${whereStr}`
  const total = await db.executeSql(totalSql, values)
  const blogRes = {}
  blogRes.total = total[0].total
  blogRes.results = results

  ctx.status = 200
  ctx.body = { status: 1, data: blogRes }
})

/**
 * 前台博客列表
 **/
router.get('/getBlogs_front', async (ctx, next) => {
  const {
    userId,
    sortType,
    keywords = '',
    sortOrder = 1,
    currentPage = 1,
    everyPage = 10,
  } = ctx.query
  let orderStr = ''
  let whereStr = ''
  let values = []
  if (sortType === 'title') {
    orderStr = ` order by a.title`
  } else if (sortType === 'channelName') {
    orderStr = ` order by c.name`
  } else {
    orderStr = ` order by a.createTime`
  }
  orderStr += sortOrder == 0 ? ' asc' : ' desc'

  if (userId && userId != '') {
    whereStr += ` where a.userId = ?`
    values.push(userId)
  }

  if (whereStr != '') {
    whereStr += ` and c.isDeleted = 0 and a.isDeleted = 0 `
  } else {
    whereStr += ` where c.isDeleted = 0 and a.isDeleted = 0 `
  }

  if (keywords && keywords != '') {
    if (whereStr != '') {
      whereStr += ` and a.title like concat ('%',?,'%') `
    } else {
      whereStr += ` where a.title like concat ('%',?,'%') `
    }
    values.push(keywords)
  }

  const blogSql = `select a.id,a.content,a.title,a.channelId,a.userId,a.createTime,a.readTimes,a.commentNumber,a.thumbUpNumber,a.thumbDownNumber,b.nickName,c.name as channelName from blog as a 
    left join user as b on a.userId = b.id 
    left join channel as c on a.channelId = c.id 
    ${whereStr} ${orderStr} 
    limit ${(currentPage - 1) * everyPage},${everyPage}`
  values.push(0)
  const res = await db.executeSql(blogSql, values)
  if (res.length == 0) {
    ctx.status = 200
    ctx.body = []
    return false
  }

  let Arr = []
  let ids = ''
  res.forEach((item) => {
    ids += `'${item.id}',`
    //去除html标签，输出纯文字
    item.content = item.content
      .replace(/<(style|script|iframe)[^>]*?>[\s\S]+?<\/\1\s*>/gi, '')
      .replace(/<[^>]+?>/g, '')
      .replace(/\s+/g, ' ')
      .replace(/ /g, ' ')
      .replace(/>/g, ' ')
    item.annexes = []
    Arr[item.id] = item
  })

  ids = ids.substring(ids, ids.length - 1)

  const annexesSql = `select * from blogAnnex where blogId in (${ids})`
  const annexesRes = await db.executeSql(annexesSql)

  annexesRes.forEach((element) => {
    if (Arr[element.blogId].annexes.length < 3) {
      Arr[element.blogId].annexes.push(element)
    }
  })

  let results = []
  for (let i in Arr) {
    results.push(Arr[i])
  }

  const totalSql = `select count(a.id) as total from blog as a 
    left join user as b on a.userId = b.id 
    left join channel as c on a.channelId = c.id 
     ${whereStr}`
  const total = await db.executeSql(totalSql, values)
  const blogRes = {}
  blogRes.total = total[0].total
  blogRes.results = results

  ctx.status = 200
  ctx.body = blogRes
  //const res = await db.executeSql(sql);
})

/**
 * 管理端用
 * blog详情
 * blogAnnex详情
 */
router.get('/getBlog', async (ctx, next) => {
  const id = ctx.query.id
  let blogSql = `select a.*,b.nickName from blog as a left join user as b on a.userId = b.id where a.id = ?`
  let annexSql = `select * from blogAnnex where blogId = ?`
  let values = [id]
  const blogRes = await db.executeSql(blogSql, values)
  const annexRes = await db.executeSql(annexSql, values)
  let blog = blogRes[0]
  blog.annexes = annexRes
  ctx.status = 200
  ctx.body = blog
})

/**
 * 前台浏览用
 * blog详情
 * blogAnnex
 * 加评论内容
 * 点赞数据
 */
router.get('/getBlogForView', async (ctx, next) => {
  const id = ctx.query.id
  let values = [id]
  //更新阅读次数
  let updateReadTimes = `update blog set readTimes = readTimes+1 where id = ?`
  let blogSql = `select a.*,b.nickName,b.photo,c.name as channelName from blog as a left join user as b on a.userId = b.id left join channel as c on a.channelId = c.id where a.id = ?`
  let annexSql = `select * from blogAnnex where blogId = ?`
  let commentSql = `select a.*,b.nickName from comment as a left join user as b on a.userId = b.id where a.blogId = ? order by a.createTime desc`
  db.executeSql(updateReadTimes, values)
  const blogRes = await db.executeSql(blogSql, values)
  const annexRes = await db.executeSql(annexSql, values)
  const commentRes = await db.executeSql(commentSql, values)

  let commentsArr = []
  commentRes.forEach((item, index) => {
    if (item.replayCommentId == '') {
      item.replayComments = []
      commentsArr[item.id] = item
    }
  })
  commentRes.forEach((item) => {
    if (item.replayCommentId != '') {
      commentsArr[item.replayCommentId].replayComments.push(item)
    }
  })
  let comments = []
  commentsArr.forEach((item) => {
    if (item != null) {
      comments.push(item)
    }
  })
  let blog = blogRes[0]
  blog.annexes = annexRes
  blog.comments = comments
  ctx.status = 200
  ctx.body = blog
})

/**
 * 插入blog
 * 插入blogannex
 */
router.post('/addBlog', async (ctx, next) => {
  const { title, content, channelId, userId, annexes } = ctx.request.body
  const blogObj = {}
  blogObj.title = title
  blogObj.content = content
  blogObj.channelId = channelId
  blogObj.userId = userId
  blogObj.createTime = formatTime()
  blogObj.readTimes = 0
  blogObj.isDeleted = 0
  blogObj.commentNumber = 0
  blogObj.thumbUpNumber = 0
  blogObj.thumbDownNumber = 0

  const res = await db.add(blogObj, 'blog')
  let annexArr = []
  annexes.map((item) => {
    const obj = {}
    obj.blogId = res
    obj.name = item.name
    obj.url = item.url
    obj.type = item.type
    annexArr.push(obj)
  })

  if (annexArr.length != 0) {
    await db.addBatch(annexArr, 'blogAnnex')
  }
  ctx.body = {status: 1, data: "添加成功"};
})

/**
 * 更新blog
 * 删除blogAnnex
 * 添加blogAnnex
 */
router.post('/updateBlog', async (ctx, next) => {
  const { id, title, content, channelId, annexArr } = ctx.request.body
  const blogObj = {}
  blogObj.id = id
  blogObj.title = title
  blogObj.content = content
  blogObj.channelId = channelId

  const deleteSql = `delete from blogAnnex where blogId = ?`
  let values = [id]
  let annexes = []
  annexArr.map((item) => {
    const obj = {}
    obj.blogId = id
    obj.name = item.name
    obj.url = item.url
    obj.type = item.type
    annexes.push(obj)
  })

  db.executeSql(deleteSql, values)
  await db.update(blogObj, 'blog')
  if (annexes.length != 0) {
    await db.addBatch(annexes, 'blogAnnex')
  }
  ctx.status = 200
  ctx.body = '已更新'
})

/**
 * 删除blog
 * 删除blogAnnex记录
 */
router.get('/deleteBlog', async (ctx, next) => {
  const id = ctx.query.id
  const blog = {}
  blog.id = id
  blog.isDeleted = 1
  const res = await db.update(blog, 'blog')
  ctx.status = 200
  ctx.body = '已删除'
})

/**
 * 文章点赞
 * 文章点赞数+1
 * 文章点踩数+1
 */
router.post('/updateBlogThumb', async (ctx, next) => {
  const { blogId, userId, thumb } = ctx.request.body
  const sql = `select * from blogThumb where blogId = ? and userId = ? `
  let values = [blogId, userId]
  const searchObj = await db.executeSql(sql, values)
  let updateBlogId = []
  let thumbSql = ''
  if (searchObj.length != 0) {
    let updateObj = searchObj[0]
    updateObj.thumb = thumb
    await db.update(updateObj, 'blogThumb')
    if (thumb == 1) {
      thumbSql = `update blog set thumbUpNumber = thumbUpNumber+1,thumbDownNumber = thumbDownNumber-1 where id = ?`
      updateBlogId = [blogId]
      await db.executeSql(thumbSql, updateBlogId)
    } else if (thumb == 2) {
      thumbSql = `update blog set thumbUpNumber = thumbUpNumber-1,thumbDownNumber = thumbDownNumber+1 where id = ?`
      updateBlogId = [blogId]
      await db.executeSql(thumbSql, updateBlogId)
    }
  } else {
    const thumbObj = {}
    thumbObj.thumb = thumb
    thumbObj.blogId = blogId
    thumbObj.userId = userId
    await db.add(thumbObj, 'blogThumb')
    if (thumb == 1) {
      thumbSql = `update blog set thumbUpNumber = thumbUpNumber+1 where id = ?`
      updateBlogId = [blogId]
      await db.executeSql(thumbSql, updateBlogId)
    } else if (thumb == 2) {
      thumbSql = `update blog set thumbDownNumber = thumbDownNumber+1 where id = ?`
      updateBlogId = [blogId]
      await db.executeSql(thumbSql, updateBlogId)
    }
  }

  thumbSql = 'select thumbUpNumber,thumbDownNumber from blog where id = ?'
  const thumbNumbers = await db.executeSql(thumbSql, [blogId])

  ctx.body = thumbNumbers[0]
})

/**
 * 文章取消点赞
 * 根据之前数据点赞、点踩-1
 */
router.post('/cancelBlogThumb', async (ctx, next) => {
  const { blogId, userId } = ctx.request.body
  const sql = `select * from blogThumb where blogId = ? and userId = ? `
  let values = [blogId, userId]

  //查到该用户的评论点赞记录
  const searchObj = await db.executeSql(sql, values)
  if (searchObj.length == 0) {
    ctx.body = []
    return false
  }
  let thumb = searchObj[0].thumb
  if (thumb == 1) {
    //原本点赞的在点赞记录数上-1
    thumbSql = `update blog set thumbUpNumber = thumbUpNumber-1 where id = ?`
    await db.executeSql(thumbSql, [blogId])
  } else if (thumb == 2) {
    //原本点踩的在点踩记录数上-1
    thumbSql = `update blog set thumbDownNumber = thumbDownNumber-1 where id = ?`
    await db.executeSql(thumbSql, [blogId])
  }
  //删除该用户的点赞记录
  await db.delete(searchObj[0], 'blogThumb')
  ctx.body = '已取消'
})

router.get('/getBlogThumb', async (ctx, next) => {
  const { blogId, userId } = ctx.query
  const sql = `select thumb from blogThumb where blogId = ? and userId = ? `
  const searchObj = await db.executeSql(sql, [blogId, userId])
  ctx.body = searchObj.length == 0 ? 0 : searchObj[0].thumb
})

/**
 * 时间格式化
 * @param {new date()} date
 */
function formatTime(date = new Date()) {
  let year = date.getFullYear()
  let month = date.getMonth() + 1
  let day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
  let hour = date.getHours()
  let minute = date.getMinutes()
  let second = date.getSeconds()
  return (
    year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second
  )
}

module.exports = router
