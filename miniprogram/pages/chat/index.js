// pages/chat/index.js - AI 暖心对话（主页面）
const { STORAGE_KEY } = require('../../utils/chat-config')
const supabase = require('../../utils/supabase')
const conversationMethods = require('../../utils/chat-conversation')
const aiMethods = require('../../utils/chat-ai')
const imageParserMethods = require('../../utils/chat-image-parser')

Page(Object.assign({
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
    if (!getApp().checkLogin()) {
      wx.redirectTo({ url: '/pages/login/index' })
    }
  },

  // ========== 消息加载 ==========

  loadMessages() {
    const saved = wx.getStorageSync(STORAGE_KEY)
    if (saved && saved.length) {
      this.setData({ messages: saved, msgId: Math.max(...saved.map(m => m.id)) })
      this.scrollToBottom()
    }
    const openid = getApp().globalData.openid
    if (!openid) return
    supabase.getMessages(openid, this.conversationId).then(rows => {
      if (!rows || !rows.length) return
      const messages = rows.map((r, i) => ({
        id: i + 1, role: r.role, content: r.content || '',
        msg_type: r.msg_type || 'text', image_url: r.image_url || ''
      }))
      this.setData({ messages, msgId: messages.length })
      this.saveLocal(messages)
      this.scrollToBottom()
    }).catch(() => {})
  },

  calcLayout() {
    const sys = wx.getSystemInfoSync()
    const ratio = sys.windowWidth / 750
    this.setData({
      chatHeight: sys.windowHeight - (sys.statusBarHeight + 56) - Math.ceil(110 * ratio)
    })
  },

  onInput(e) { this.setData({ inputValue: e.detail.value }) },

  onHintTap(e) {
    this.setData({ inputValue: e.currentTarget.dataset.text }, () => this.onSend())
  },

  // ========== 发送消息 ==========

  onSend() {
    const text = this.data.inputValue.trim()
    const image = this.data.pendingImage
    if ((!text && !image) || this.data.loading || this.data.uploading) return

    if (this.data.messages.filter(m => m.role === 'user').length === 0) {
      this.recordConversation(text || '[图片识别]')
    }

    if (image) {
      const msgType = text ? 'image_text' : 'image'
      const userMsg = { id: this.data.msgId + 1, role: 'user', content: text || '[图片]', msg_type: msgType, image_url: image }
      this._userText = text
      this.setData({ messages: [...this.data.messages, userMsg], inputValue: '', pendingImage: '', msgId: userMsg.id, uploading: true, uploadText: '正在解析图片...' })
      this.scrollToBottom()
      const ext = image.split('.').pop().toUpperCase()
      this._uploadToParser(image, ['PNG','JPG','JPEG','BMP','GIF','WEBP'].includes(ext) ? ext : 'JPG')
    } else {
      const userMsg = { id: this.data.msgId + 1, role: 'user', content: text, msg_type: 'text', image_url: '' }
      this.setData({ messages: [...this.data.messages, userMsg], inputValue: '', loading: true, msgId: userMsg.id })
      this.scrollToBottom()
      this.saveToSupabase(userMsg)
      this.callAI()
    }
  },

  onChooseImage() {
    if (this.data.loading || this.data.uploading) return
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sizeType: ['compressed'], sourceType: ['album', 'camera'],
      success: (res) => this.setData({ pendingImage: res.tempFiles[0].tempFilePath })
    })
  },

  onCancelImage() { this.setData({ pendingImage: '' }) },

  onPreviewPending() {
    if (this.data.pendingImage) wx.previewImage({ current: this.data.pendingImage, urls: [this.data.pendingImage] })
  },

  // ========== 组件事件适配 ==========

  onSwitchFromHistory(e) {
    this.onSwitchConversation({ currentTarget: { dataset: { id: e.detail.id } } })
  },

  onDeleteFromHistory(e) {
    this.onDeleteConversation({ currentTarget: { dataset: { id: e.detail.id } } })
  },

  onInputFromBar(e) { this.setData({ inputValue: e.detail.value }) },

  // ========== 存储 ==========

  saveToSupabase(msg) {
    const openid = getApp().globalData.openid
    if (!openid) return
    supabase.insertMessage({
      openid, role: msg.role, content: msg.content,
      msg_type: msg.msg_type || 'text', image_url: msg.image_url || null,
      conversation_id: this.conversationId
    }).catch(err => console.warn('Supabase 写入失败', err))
  },

  handleError(msg) {
    this.setData({ loading: false })
    wx.showToast({ title: msg, icon: 'none', duration: 2000 })
  },

  saveLocal(messages) { wx.setStorageSync(STORAGE_KEY, messages.slice(-50)) },

  scrollToBottom() {
    setTimeout(() => this.setData({ scrollToView: `msg-${this.data.msgId}` }), 100)
  },

  onShareAppMessage() {
    return { title: '暖心AI - 让温暖与你同行', path: '/pages/chat/index' }
  }
}, conversationMethods, aiMethods, imageParserMethods))
