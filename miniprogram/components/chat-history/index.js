// components/chat-history/index.js - 对话历史面板
Component({
  properties: {
    show: { type: Boolean, value: false },
    conversationList: { type: Array, value: [] },
    currentConvId: { type: String, value: '' }
  },
  methods: {
    onNewChat() { this.triggerEvent('newchat') },
    onSwitch(e) { this.triggerEvent('switch', { id: e.currentTarget.dataset.id }) },
    onDelete(e) { this.triggerEvent('delete', { id: e.currentTarget.dataset.id }) },
    onClose() { this.triggerEvent('close') }
  }
})
