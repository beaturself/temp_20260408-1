// pages/profile/index.js - 个人中心
const LOGIN_TYPE_MAP = {
  wechat: '微信登录',
  phone: '手机号登录',
  email: '邮箱登录'
}

Page({
  data: {
    userInfo: null,
    loginTypeText: '',
    vipStatus: ''
  },

  onShow() {
    const app = getApp()
    const userInfo = app.globalData.userInfo
    this.setData({
      userInfo,
      loginTypeText: userInfo ? (LOGIN_TYPE_MAP[userInfo.loginType] || '已登录') : '',
      vipStatus: this.getVipStatus()
    })
  },

  getVipStatus() {
    const info = getApp().globalData.premiumInfo
    if (!info) return ''
    if (info.type === 'vip') {
      if (info.expiry > Date.now()) {
        const d = new Date(info.expiry)
        const month = d.getMonth() + 1
        const day = d.getDate()
        return `已开通 · ${month}/${day}到期`
      }
      return ''
    }
    if (info.type === 'pack' && info.chatQuota > 0) {
      return `剩余${info.chatQuota}次对话`
    }
    return ''
  },

  onUserCardTap() {
    if (!this.data.userInfo) {
      wx.navigateTo({ url: '/pages/login/index' })
    }
  },

  onPremiumTap() {
    wx.navigateTo({ url: '/pages/premium/index' })
  },

  onClearChat() {
    wx.showModal({
      title: '清除聊天记录',
      content: '确定要清除所有聊天记录吗？此操作不可恢复。',
      confirmColor: '#FF8C42',
      success(res) {
        if (res.confirm) {
          wx.removeStorageSync('chat_messages')
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      }
    })
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清除聊天记录等本地缓存数据，登录状态不受影响。',
      confirmColor: '#FF8C42',
      success(res) {
        if (res.confirm) {
          const userInfo = wx.getStorageSync('userInfo')
          wx.clearStorageSync()
          if (userInfo) {
            wx.setStorageSync('userInfo', userInfo)
            getApp().globalData.userInfo = userInfo
          }
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      }
    })
  },

  onAbout() {
    wx.showModal({
      title: '关于温暖前行',
      content: '温暖前行 v1.0.0\n\n一个想给你带来温暖和力量的小程序。\n当你需要时，我就在这里。',
      showCancel: false,
      confirmColor: '#FF8C42',
      confirmText: '知道了'
    })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#FF8C42',
      success(res) {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          getApp().globalData.userInfo = null
          wx.showToast({ title: '已退出', icon: 'success' })
          setTimeout(() => {
            wx.switchTab({ url: '/pages/index/index' })
          }, 500)
        }
      }
    })
  }
})
