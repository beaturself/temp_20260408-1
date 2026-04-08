// utils/chat-image-parser.js - 智谱图片解析
const { ZHIPU_PARSER_URL, ZHIPU_RESULT_URL, ZHIPU_API_KEY, SYSTEM_PROMPT } = require('./chat-config')
const zhipuAuth = require('./zhipu-auth')

module.exports = {
  _uploadToParser(filePath, fileType) {
    const token = zhipuAuth.generateToken(ZHIPU_API_KEY)
    wx.uploadFile({
      url: ZHIPU_PARSER_URL,
      filePath,
      name: 'file',
      header: { 'Authorization': `Bearer ${token}` },
      formData: { tool_type: 'lite', file_type: fileType },
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

  _pollParseResult(taskId, retryCount) {
    if (retryCount > 30) {
      this._onParseFail('解析超时，请重试')
      return
    }
    const token = zhipuAuth.generateToken(ZHIPU_API_KEY)
    wx.request({
      url: `${ZHIPU_RESULT_URL}/${taskId}/text`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
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
      fail: () => this._onParseFail('查询解析结果失败')
    })
  },

  _sendParsedToAI(parsedText, userText) {
    const content = userText
      ? `用户发送了一张图片并附言：「${userText}」\n\n图片识别内容：\n${parsedText}\n\n请综合图片内容和用户附言进行回复。`
      : `用户发送了一张图片，以下是识别出的内容：\n\n${parsedText}\n\n请根据图片内容给出温暖、有帮助的回复。`

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
      ...history,
      { role: 'user', content }
    ])
  },

  _onParseFail(msg) {
    this.setData({ uploading: false })
    wx.showToast({ title: msg, icon: 'none', duration: 2500 })
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    if (url) wx.previewImage({ current: url, urls: [url] })
  }
}
