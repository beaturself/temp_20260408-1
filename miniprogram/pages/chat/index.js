// pages/chat/index.js - AI 暖心对话（会话管理 + 流式输出 + 图片解析）
const supabase = require('../../utils/supabase')
const zhipuAuth = require('../../utils/zhipu-auth')
const API_URL = 'https://api.deepseek.com/chat/completions'
const API_KEY = 'sk-cea233d8fefd49c38f9585a9108f132a'
const MODEL = 'deepseek-chat'
const SYSTEM_PROMPT = '你是一个温暖贴心的AI助手，名叫「暖心AI」。你的语气温柔、真诚、有力量。你善于倾听，给人鼓励和安慰。回复简洁而温暖，每次回复控制在100字以内。适当使用温暖的表达，但不要过于夸张。'

// 智谱 AI 文件解析
const ZHIPU_PARSER_URL = 'https://open.bigmodel.cn/api/paas/v4/files/parser/create'
const ZHIPU_RESULT_URL = 'https://open.bigmodel.cn/api/paas/v4/files/parser/result'
const ZHIPU_API_KEY = '44177b5247b14689a112c2f66589ccba.LL0GMfQVtnNWdl4L'

const STORAGE_KEY = 'chat_messages'
const CONVERSATION_KEY = 'conversation_id'
const CONV_LIST_KEY = 'conversation_list'

Page({
  data: {
    messages: [],
    inputValue: '',
    loading: false,
    scrollToView: '',
    msgId: 0,
    chatHeight: 0,
    uploading: false,
    uploadText: '图片处理中...',
    pendingImage: '',
    showHistory: false,
    conversationList: [],
    currentConvId: ''
  },

  onLoad() {
    this.calcLayout()
    this.loadConversationList()
    this.initConversation()
    this.loadMessages()
  },

  onShow() {
    const app = getApp()
    if (!app.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/index' })
    }
  },

  // ========== 会话管理 ==========

  loadConversationList() {
    const list = (wx.getStorageSync(CONV_LIST_KEY) || []).map(c => ({
      ...c,
      timeText: c.timeText || this.formatTime(c.createdAt)
    }))
    this.setData({ conversationList: list })
  },

  saveConversationList(list) {
    wx.setStorageSync(CONV_LIST_KEY, list)
    this.setData({ conversationList: list })
  },

  initConversation() {
    let cid = wx.getStorageSync(CONVERSATION_KEY)
    if (!cid) {
      cid = this.generateUUID()
      wx.setStorageSync(CONVERSATION_KEY, cid)
    }
    this.conversationId = cid
    this.setData({ currentConvId: cid })
  },

  /** 记录会话到列表（首次发消息时调用） */
  recordConversation(firstMsg) {
    const list = this.data.conversationList
    const exists = list.find(c => c.id === this.conversationId)
    if (exists) return

    const title = firstMsg.length > 15 ? firstMsg.substring(0, 15) + '...' : firstMsg
    const now = Date.now()
    const newConv = {
      id: this.conversationId,
      title,
      createdAt: now,
      timeText: this.formatTime(now)
    }
    const updated = [newConv, ...list]
    this.saveConversationList(updated)
  },

  /** 新建对话 */
  onNewChat() {
    if (this.data.loading) return
    const cid = this.generateUUID()
    wx.setStorageSync(CONVERSATION_KEY, cid)
    this.conversationId = cid
    this.setData({
      messages: [],
      msgId: 0,
      currentConvId: cid,
      showHistory: false
    })
    wx.setStorageSync(STORAGE_KEY, [])
  },

  /** 切换到历史对话 */
  onSwitchConversation(e) {
    if (this.data.loading) return
    const cid = e.currentTarget.dataset.id
    if (cid === this.conversationId) {
      this.setData({ showHistory: false })
      return
    }
    wx.setStorageSync(CONVERSATION_KEY, cid)
    this.conversationId = cid
    this.setData({
      messages: [],
      msgId: 0,
      currentConvId: cid,
      showHistory: false
    })
    this.loadMessages()
  },

  /** 删除历史对话 */
  onDeleteConversation(e) {
    const cid = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除对话',
      content: '确定删除这个对话吗？',
      confirmColor: '#FF8C42',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.conversationList.filter(c => c.id !== cid)
          this.saveConversationList(list)
          if (cid === this.conversationId) {
            this.onNewChat()
          }
        }
      }
    })
  },

  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory })
  },

  closeHistory() {
    this.setData({ showHistory: false })
  },

  // ========== 消息加载 ==========

  loadMessages() {
    const saved = wx.getStorageSync(STORAGE_KEY)
    if (saved && saved.length) {
      const maxId = Math.max(...saved.map(m => m.id))
      this.setData({ messages: saved, msgId: maxId })
      this.scrollToBottom()
    }

    const app = getApp()
    const openid = app.globalData.openid
    if (!openid) return

    supabase.getMessages(openid, this.conversationId).then(rows => {
      if (!rows || !rows.length) return
      const messages = rows.map((r, i) => ({
        id: i + 1,
        role: r.role,
        content: r.content || '',
        msg_type: r.msg_type || 'text',
        image_url: r.image_url || ''
      }))
      const maxId = messages.length
      this.setData({ messages, msgId: maxId })
      this.saveLocal(messages)
      this.scrollToBottom()
    }).catch(() => {})
  },

  calcLayout() {
    const sys = wx.getSystemInfoSync()
    const screenHeight = sys.windowHeight
    const ratio = sys.windowWidth / 750
    const navBarTotalHeight = sys.statusBarHeight + 56
    const inputBarHeight = Math.ceil(110 * ratio)
    this.setData({
      chatHeight: screenHeight - navBarTotalHeight - inputBarHeight
    })
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  onHintTap(e) {
    const text = e.currentTarget.dataset.text
    this.setData({ inputValue: text }, () => {
      this.onSend()
    })
  },

  // ========== 发送消息 ==========

  onSend() {
    const text = this.data.inputValue.trim()
    const image = this.data.pendingImage
    if ((!text && !image) || this.data.loading || this.data.uploading) return

    // 首次发消息时记录会话
    const userMessages = this.data.messages.filter(m => m.role === 'user')
    if (userMessages.length === 0) {
      this.recordConversation(text || '[图片识别]')
    }

    if (image) {
      // 有图片（可能带文字）
      const msgType = text ? 'image_text' : 'image'
      const userMsg = {
        id: this.data.msgId + 1,
        role: 'user',
        content: text || '[图片]',
        msg_type: msgType,
        image_url: image
      }
      this._userText = text
      this.setData({
        messages: [...this.data.messages, userMsg],
        inputValue: '',
        pendingImage: '',
        msgId: userMsg.id,
        uploading: true,
        uploadText: '正在解析图片...'
      })
      this.scrollToBottom()

      const ext = image.split('.').pop().toUpperCase()
      const fileType = ['PNG', 'JPG', 'JPEG', 'BMP', 'GIF', 'WEBP'].includes(ext) ? ext : 'JPG'
      this._uploadToParser(image, fileType)
    } else {
      // 纯文字
      const userMsg = {
        id: this.data.msgId + 1,
        role: 'user',
        content: text,
        msg_type: 'text',
        image_url: ''
      }
      this.setData({
        messages: [...this.data.messages, userMsg],
        inputValue: '',
        loading: true,
        msgId: userMsg.id
      })
      this.scrollToBottom()
      this.saveToSupabase(userMsg)
      this.callAI()
    }
  },

  onChooseImage() {
    if (this.data.loading || this.data.uploading) return

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ pendingImage: res.tempFiles[0].tempFilePath })
      }
    })
  },

  onCancelImage() {
    this.setData({ pendingImage: '' })
  },

  onPreviewPending() {
    if (this.data.pendingImage) {
      wx.previewImage({ current: this.data.pendingImage, urls: [this.data.pendingImage] })
    }
  },

  // ========== 智谱图片解析 ==========

  /** 上传图片到智谱文件解析 */
  _uploadToParser(filePath, fileType) {
    const token = zhipuAuth.generateToken(ZHIPU_API_KEY)
    wx.uploadFile({
      url: ZHIPU_PARSER_URL,
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': `Bearer ${token}`
      },
      formData: {
        tool_type: 'lite',
        file_type: fileType
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.success && data.task_id) {
            this.setData({ uploadText: '正在识别内容...' })
            this._pollParseResult(data.task_id, 0)
          } else {
            console.error('智谱解析响应:', data)
            this._onParseFail(data.message || '解析任务创建失败')
          }
        } catch (e) {
          console.error('智谱响应解析异常:', res.data)
          this._onParseFail('解析响应异常')
        }
      },
      fail: (err) => {
        console.error('智谱上传失败:', err)
        this._onParseFail('图片上传失败，请检查网络')
      }
    })
  },

  /** 轮询获取解析结果 */
  _pollParseResult(taskId, retryCount) {
    if (retryCount > 30) {
      this._onParseFail('解析超时，请重试')
      return
    }

    const token = zhipuAuth.generateToken(ZHIPU_API_KEY)
    wx.request({
      url: `${ZHIPU_RESULT_URL}/${taskId}/text`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        const data = res.data
        if (data.status === 'succeeded' && data.content) {
          this.setData({ uploading: false })
          this._sendParsedToAI(data.content, this._userText || '')
        } else if (data.status === 'processing') {
          setTimeout(() => this._pollParseResult(taskId, retryCount + 1), 2000)
        } else {
          console.error('智谱解析结果:', data)
          this._onParseFail(data.message || '图片解析失败')
        }
      },
      fail: () => {
        this._onParseFail('查询解析结果失败')
      }
    })
  },

  /** 解析成功，将内容发给 AI */
  _sendParsedToAI(parsedText, userText) {
    let content
    if (userText) {
      content = `用户发送了一张图片并附言：「${userText}」\n\n图片识别内容：\n${parsedText}\n\n请综合图片内容和用户附言进行回复。`
    } else {
      content = `用户发送了一张图片，以下是识别出的内容：\n\n${parsedText}\n\n请根据图片内容给出温暖、有帮助的回复。`
    }

    const history = this.data.messages
      .filter(m => m.msg_type === 'text')
      .map(m => ({ role: m.role, content: m.content }))

    // 创建 AI 占位消息
    const aiMsg = {
      id: this.data.msgId + 1,
      role: 'assistant',
      content: '',
      msg_type: 'text',
      image_url: ''
    }
    this.setData({
      messages: [...this.data.messages, aiMsg],
      msgId: aiMsg.id,
      loading: true
    })
    this.scrollToBottom()

    const reqMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content }
    ]

    this._callStreamAI(reqMessages)
  },

  /** 解析失败处理 */
  _onParseFail(msg) {
    this.setData({ uploading: false })
    wx.showToast({ title: msg, icon: 'none', duration: 2000 })
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    if (url) {
      wx.previewImage({ current: url, urls: [url] })
    }
  },

  // ========== 流式 AI 调用 ==========

  callAI() {
    const history = this.data.messages
      .filter(m => m.msg_type === 'text')
      .map(m => ({ role: m.role, content: m.content }))

    // 创建空的 AI 消息占位
    const aiMsg = {
      id: this.data.msgId + 1,
      role: 'assistant',
      content: '',
      msg_type: 'text',
      image_url: ''
    }
    this.setData({
      messages: [...this.data.messages, aiMsg],
      msgId: aiMsg.id,
      loading: true
    })
    this.scrollToBottom()

    const reqMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history
    ]

    // 尝试流式请求，失败则降级为普通请求
    this._callStreamAI(reqMessages)
  },

  /** 流式请求 */
  _callStreamAI(reqMessages) {
    let fullContent = ''
    this._sseBuffer = ''
    let streamFailed = false

    const reqTask = wx.request({
      url: API_URL,
      method: 'POST',
      enableChunked: true,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: MODEL,
        stream: true,
        messages: reqMessages
      },
      success: () => {},
      fail: () => {
        streamFailed = true
        clearInterval(this._streamTimer)
        console.warn('流式请求失败，降级为普通请求')
        this._callNormalAI(reqMessages)
      }
    })

    reqTask.onChunkReceived((res) => {
      if (streamFailed) return
      const chunk = this.arrayBufferToString(res.data)
      fullContent = this.parseSSEChunk(chunk, fullContent)
      this.updateLastMessage(fullContent)
      this.scrollToBottom()
    })

    reqTask.onHeadersReceived((res) => {
      if (streamFailed) return
      const status = res.statusCode
      if (status && status !== 200) {
        streamFailed = true
        clearInterval(this._streamTimer)
        this._callNormalAI(reqMessages)
      }
    })

    this._streamTimer = setInterval(() => {
      if (streamFailed || !this.data.loading) {
        clearInterval(this._streamTimer)
        return
      }
      if (fullContent && this._lastContent === fullContent) {
        this._stableCount = (this._stableCount || 0) + 1
        if (this._stableCount >= 3) {
          this.onStreamComplete(fullContent)
          clearInterval(this._streamTimer)
        }
      } else {
        this._stableCount = 0
      }
      this._lastContent = fullContent
    }, 500)
  },

  /** 普通请求（非流式降级方案） */
  _callNormalAI(reqMessages) {
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: MODEL,
        messages: reqMessages
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.choices) {
          const content = res.data.choices[0].message.content || ''
          this.onStreamComplete(content)
        } else {
          this.handleError('AI 服务暂时不可用')
          const msgs = this.data.messages.slice(0, -1)
          this.setData({ messages: msgs, msgId: this.data.msgId - 1 })
        }
      },
      fail: () => {
        this.handleError('网络不太给力，再试一次吧')
        const msgs = this.data.messages.slice(0, -1)
        this.setData({ messages: msgs, msgId: this.data.msgId - 1 })
      }
    })
  },

  /** 解析 SSE chunk */
  parseSSEChunk(chunk, currentContent) {
    this._sseBuffer += chunk
    const lines = this._sseBuffer.split('\n')
    // 保留最后一行（可能不完整）
    this._sseBuffer = lines.pop() || ''

    let content = currentContent
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const dataStr = trimmed.slice(5).trim()
      if (dataStr === '[DONE]') {
        this.onStreamComplete(content)
        return content
      }
      try {
        const json = JSON.parse(dataStr)
        const delta = json.choices && json.choices[0] && json.choices[0].delta
        if (delta && delta.content) {
          content += delta.content
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    return content
  },

  /** 更新最后一条消息内容 */
  updateLastMessage(content) {
    const messages = this.data.messages
    const lastIdx = messages.length - 1
    if (lastIdx < 0) return
    const key = `messages[${lastIdx}].content`
    this.setData({ [key]: content })
  },

  /** 流式完成回调 */
  onStreamComplete(content) {
    if (!this.data.loading) return
    clearInterval(this._streamTimer)

    const messages = this.data.messages
    const lastMsg = messages[messages.length - 1]

    // 确保内容是最终版本
    if (lastMsg && lastMsg.role === 'assistant') {
      const key = `messages[${messages.length - 1}].content`
      this.setData({ [key]: content, loading: false })
    } else {
      this.setData({ loading: false })
    }

    this.saveLocal(this.data.messages)
    this.scrollToBottom()

    // 保存到 Supabase
    this.saveToSupabase({
      role: 'assistant',
      content,
      msg_type: 'text',
      image_url: ''
    })
  },

  /** ArrayBuffer 转字符串 */
  arrayBufferToString(buffer) {
    const uint8 = new Uint8Array(buffer)
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(uint8)
    }
    // 兼容不支持 TextDecoder 的环境
    let str = ''
    for (let i = 0; i < uint8.length; i++) {
      str += String.fromCharCode(uint8[i])
    }
    try { return decodeURIComponent(escape(str)) } catch (e) { return str }
  },

  // ========== 存储 ==========

  saveToSupabase(msg) {
    const app = getApp()
    const openid = app.globalData.openid
    if (!openid) return

    supabase.insertMessage({
      openid,
      role: msg.role,
      content: msg.content,
      msg_type: msg.msg_type || 'text',
      image_url: msg.image_url || null,
      conversation_id: this.conversationId
    }).catch(err => {
      console.warn('Supabase 写入失败', err)
    })
  },

  handleError(msg) {
    this.setData({ loading: false })
    wx.showToast({ title: msg, icon: 'none', duration: 2000 })
  },

  saveLocal(messages) {
    wx.setStorageSync(STORAGE_KEY, messages.slice(-50))
  },

  scrollToBottom() {
    setTimeout(() => {
      const id = this.data.loading ? `msg-${this.data.msgId}` : `msg-${this.data.msgId}`
      this.setData({ scrollToView: id })
    }, 100)
  },

  // ========== 工具方法 ==========

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  },

  formatTime(timestamp) {
    const d = new Date(timestamp)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${month}/${day} ${h}:${m}`
  },

  onShareAppMessage() {
    return {
      title: '暖心AI - 让温暖与你同行',
      path: '/pages/chat/index'
    }
  }
})
