// utils/chat-ai.js - 流式 AI 调用
const { API_URL, API_KEY, MODEL, SYSTEM_PROMPT } = require('./chat-config')
const { arrayBufferToString } = require('./chat-helpers')

module.exports = {
  callAI() {
    const history = this.data.messages
      .filter(m => m.msg_type === 'text')
      .map(m => ({ role: m.role, content: m.content }))

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

    this._callStreamAI([
      { role: 'system', content: SYSTEM_PROMPT },
      ...history
    ])
  },

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
      const chunk = arrayBufferToString(res.data)
      fullContent = this.parseSSEChunk(chunk, fullContent)
      this.updateLastMessage(fullContent)
      this.scrollToBottom()
    })

    reqTask.onHeadersReceived((res) => {
      if (streamFailed) return
      if (res.statusCode && res.statusCode !== 200) {
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

  _callNormalAI(reqMessages) {
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: { model: MODEL, messages: reqMessages },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.choices) {
          this.onStreamComplete(res.data.choices[0].message.content || '')
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

  parseSSEChunk(chunk, currentContent) {
    this._sseBuffer += chunk
    const lines = this._sseBuffer.split('\n')
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
        if (delta && delta.content) content += delta.content
      } catch (e) {}
    }
    return content
  },

  updateLastMessage(content) {
    const lastIdx = this.data.messages.length - 1
    if (lastIdx < 0) return
    this.setData({ [`messages[${lastIdx}].content`]: content })
  },

  onStreamComplete(content) {
    if (!this.data.loading) return
    clearInterval(this._streamTimer)

    const messages = this.data.messages
    const lastMsg = messages[messages.length - 1]

    if (lastMsg && lastMsg.role === 'assistant') {
      this.setData({ [`messages[${messages.length - 1}].content`]: content, loading: false })
    } else {
      this.setData({ loading: false })
    }

    this.saveLocal(this.data.messages)
    this.scrollToBottom()
    this.saveToSupabase({ role: 'assistant', content, msg_type: 'text', image_url: '' })
  }
}
