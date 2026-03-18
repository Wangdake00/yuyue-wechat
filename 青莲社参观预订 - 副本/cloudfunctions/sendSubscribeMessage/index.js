// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { templateId, data, page, openid } = event
    
    // 获取用户openid
    const { OPENID } = cloud.getWXContext()
    const targetOpenid = openid || OPENID
    
    // 发送订阅消息
    const result = await cloud.openapi.subscribeMessage.send({
      touser: targetOpenid,
      templateId: templateId,
      page: page,
      data: data
    })
    
    return {
      success: true,
      result: result
    }
  } catch (err) {
    console.error('发送订阅消息失败：', err)
    return {
      success: false,
      error: err.message
    }
  }
}