// pages/login/index.js - 用户登录
Page({
  data: {
    activeTab: 'phone',
    phone: '',
    phoneCode: '',
    email: '',
    emailCode: '',
    phoneCountdown: 0,
    emailCountdown: 0,
    agreed: false
  },

  // ========== Tab 切换 ==========
  onTabSwitch(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  // ========== 输入处理 ==========
  onPhoneInput(e) { this.setData({ phone: e.detail.value }) },
  onPhoneCodeInput(e) { this.setData({ phoneCode: e.detail.value }) },
  onEmailInput(e) { this.setData({ email: e.detail.value }) },
  onEmailCodeInput(e) { this.setData({ emailCode: e.detail.value }) },

  // ========== 协议勾选 ==========
  onToggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  // ========== 微信登录 ==========
  onWechatLogin() {
    if (!this.checkAgreement()) return

    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = {
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl,
          loginType: 'wechat',
          loginTime: Date.now()
        }
        this.loginSuccess(userInfo)
      },
      fail: () => {
        // getUserProfile 被拒绝或不支持时，使用默认信息登录
        const userInfo = {
          nickName: '微信用户',
          avatarUrl: '',
          loginType: 'wechat',
          loginTime: Date.now()
        }
        this.loginSuccess(userInfo)
      }
    })
  },

  // ========== 发送手机验证码（模拟） ==========
  onSendPhoneCode() {
    if (this.data.phoneCountdown > 0) return
    const phone = this.data.phone.trim()
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    wx.showToast({ title: '验证码已发送', icon: 'success' })
    this.startCountdown('phone')
  },

  // ========== 发送邮箱验证码（模拟） ==========
  onSendEmailCode() {
    if (this.data.emailCountdown > 0) return
    const email = this.data.email.trim()
    if (!email || !this.isValidEmail(email)) {
      wx.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return
    }
    wx.showToast({ title: '验证码已发送', icon: 'success' })
    this.startCountdown('email')
  },

  // ========== 表单登录 ==========
  onFormLogin() {
    if (!this.checkAgreement()) return

    if (this.data.activeTab === 'phone') {
      this.phoneLogin()
    } else {
      this.emailLogin()
    }
  },

  phoneLogin() {
    const { phone, phoneCode } = this.data
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!phoneCode || phoneCode.length < 4) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    const masked = phone.substring(0, 3) + '****' + phone.substring(7)
    const userInfo = {
      nickName: masked,
      avatarUrl: '',
      loginType: 'phone',
      phone: masked,
      loginTime: Date.now()
    }
    this.loginSuccess(userInfo)
  },

  emailLogin() {
    const { email, emailCode } = this.data
    if (!email || !this.isValidEmail(email)) {
      wx.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return
    }
    if (!emailCode || emailCode.length < 4) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    const userInfo = {
      nickName: email,
      avatarUrl: '',
      loginType: 'email',
      email: email,
      loginTime: Date.now()
    }
    this.loginSuccess(userInfo)
  },

  // ========== 登录成功处理 ==========
  loginSuccess(userInfo) {
    wx.setStorageSync('userInfo', userInfo)
    const app = getApp()
    app.globalData.userInfo = userInfo

    wx.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack({ delta: 1 })
      } else {
        wx.switchTab({ url: '/pages/index/index' })
      }
    }, 1000)
  },

  // ========== 工具方法 ==========
  checkAgreement() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' })
      return false
    }
    return true
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  },

  startCountdown(type) {
    const key = type === 'phone' ? 'phoneCountdown' : 'emailCountdown'
    this.setData({ [key]: 60 })
    const timer = setInterval(() => {
      const val = this.data[key] - 1
      this.setData({ [key]: val })
      if (val <= 0) clearInterval(timer)
    }, 1000)
  }
})
