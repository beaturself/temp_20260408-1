// components/chat-input-bar/index.js - 输入栏组件
Component({
  properties: {
    inputValue: { type: String, value: '' },
    pendingImage: { type: String, value: '' },
    loading: { type: Boolean, value: false },
    uploading: { type: Boolean, value: false }
  },
  methods: {
    onInput(e) { this.triggerEvent('input', { value: e.detail.value }) },
    onConfirm() { this.triggerEvent('send') },
    onSend() { this.triggerEvent('send') },
    onChooseImage() { this.triggerEvent('chooseimage') },
    onCancelImage() { this.triggerEvent('cancelimage') },
    onPreviewPending() { this.triggerEvent('previewpending') }
  }
})
