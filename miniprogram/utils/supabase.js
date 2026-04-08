// utils/supabase.js - Supabase REST API 封装（适用于微信小程序）

// ⚠️ 替换为你的 Supabase 项目配置
const SUPABASE_URL = 'https://wmgjrqeoalyyjwpuxzid.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_XDCfiuxYlS9JcvoJJTZEvg__DUDdO7g'

/**
 * 通用请求方法
 */
function request(path, options = {}) {
  const { method = 'GET', data, headers = {} } = options
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${SUPABASE_URL}${path}`,
      method,
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : '',
        ...headers
      },
      data,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject({ statusCode: res.statusCode, data: res.data })
        }
      },
      fail: reject
    })
  })
}

/**
 * 查询聊天消息
 * @param {string} openid - 用户 openid
 * @param {string} conversationId - 会话ID
 * @param {number} limit - 返回条数
 */
function getMessages(openid, conversationId, limit = 50) {
  const query = `openid=eq.${openid}&conversation_id=eq.${conversationId}&order=created_at.asc&limit=${limit}`
  return request(`/rest/v1/chat_messages?${query}`)
}

/**
 * 插入聊天消息
 * @param {object} message - 消息对象
 */
function insertMessage(message) {
  return request('/rest/v1/chat_messages', {
    method: 'POST',
    data: message
  })
}

/**
 * 上传图片到 Storage
 * @param {string} openid - 用户 openid
 * @param {string} filePath - 本地临时文件路径
 * @returns {Promise<string>} 图片公开访问 URL
 */
function uploadImage(openid, filePath) {
  const ext = filePath.split('.').pop() || 'jpg'
  const storagePath = `${openid}/${Date.now()}.${ext}`

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${SUPABASE_URL}/storage/v1/object/chat-images/${storagePath}`,
      filePath,
      name: 'file',
      header: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/chat-images/${storagePath}`
          resolve(publicUrl)
        } else {
          reject({ statusCode: res.statusCode, data: res.data })
        }
      },
      fail: reject
    })
  })
}

/**
 * 获取图片公开URL
 * @param {string} path - 存储路径
 */
function getImageUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/chat-images/${path}`
}

module.exports = {
  SUPABASE_URL,
  getMessages,
  insertMessage,
  uploadImage,
  getImageUrl
}
