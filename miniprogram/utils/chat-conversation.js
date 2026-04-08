// utils/chat-conversation.js - 会话管理
const { STORAGE_KEY, CONVERSATION_KEY, CONV_LIST_KEY } = require('./chat-config')
const { generateUUID, formatTime } = require('./chat-helpers')

module.exports = {
  loadConversationList() {
    const list = (wx.getStorageSync(CONV_LIST_KEY) || []).map(c => ({
      ...c,
      timeText: c.timeText || formatTime(c.createdAt)
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
      cid = generateUUID()
      wx.setStorageSync(CONVERSATION_KEY, cid)
    }
    this.conversationId = cid
    this.setData({ currentConvId: cid })
  },

  recordConversation(firstMsg) {
    const list = this.data.conversationList
    if (list.find(c => c.id === this.conversationId)) return

    const title = firstMsg.length > 15 ? firstMsg.substring(0, 15) + '...' : firstMsg
    const now = Date.now()
    this.saveConversationList([{
      id: this.conversationId,
      title,
      createdAt: now,
      timeText: formatTime(now)
    }, ...list])
  },

  onNewChat() {
    if (this.data.loading) return
    const cid = generateUUID()
    wx.setStorageSync(CONVERSATION_KEY, cid)
    this.conversationId = cid
    this.setData({
      messages: [],
      msgId: 0,
      currentConvId: cid,
      showHistory: false,
      pendingImage: ''
    })
    wx.setStorageSync(STORAGE_KEY, [])
  },

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
      showHistory: false,
      pendingImage: ''
    })
    this.loadMessages()
  },

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
          if (cid === this.conversationId) this.onNewChat()
        }
      }
    })
  },

  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory })
  },

  closeHistory() {
    this.setData({ showHistory: false })
  }
}
