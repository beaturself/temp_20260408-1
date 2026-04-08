// app.js
App({
  onLaunch: function () {
    this.globalData = {
      env: "cloud1-3gw1htsn80a1e354",
      userInfo: null,
      openid: null
    };

    // 恢复登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }

    // 恢复 openid 缓存
    const openid = wx.getStorageSync('openid')
    if (openid) {
      this.globalData.openid = openid
    }

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      // 获取 openid
      this.fetchOpenId()
    }
  },

  fetchOpenId() {
    if (this.globalData.openid) return
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: { type: 'getOpenId' },
      success: (res) => {
        const openid = res.result && res.result.openid
        if (openid) {
          this.globalData.openid = openid
          wx.setStorageSync('openid', openid)
        }
      }
    })
  },

  checkLogin() {
    return !!this.globalData.userInfo
  }
});
