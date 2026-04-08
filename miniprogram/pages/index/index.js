// index.js - 暖色背景模板预览
Page({
  data: {
    greeting: '早上好',
    currentQuote: '生活不会辜负每一个努力的人，今天的坚持，是明天的花开。',
    currentAuthor: '佚名',
    features: [
      { id: 1, name: 'AI 对话', icon: '💬', bgColor: 'rgba(255,140,66,0.2)', page: '/pages/chat/index' },
      { id: 2, name: '每日一句', icon: '☀️', bgColor: 'rgba(255,191,105,0.2)' },
      { id: 3, name: '心情记录', icon: '📝', bgColor: 'rgba(255,140,66,0.15)' },
      { id: 4, name: '温暖故事', icon: '📖', bgColor: 'rgba(255,107,107,0.15)' },
      { id: 5, name: '目标打卡', icon: '🎯', bgColor: 'rgba(255,215,0,0.2)' },
      { id: 6, name: '感恩日记', icon: '💛', bgColor: 'rgba(255,154,118,0.15)' },
      { id: 7, name: '正能量', icon: '⭐', bgColor: 'rgba(255,191,105,0.2)' },
      { id: 8, name: '更多', icon: '💫', bgColor: 'rgba(255,224,208,0.5)' },
    ],
    moments: [
      {
        id: 1,
        tag: '晨间寄语',
        time: '08:00',
        title: '新的一天，新的开始',
        desc: '每个清晨都是一次重新出发的机会，带着微笑迎接今天的阳光。'
      },
      {
        id: 2,
        tag: '温暖故事',
        time: '12:30',
        title: '陌生人的善意',
        desc: '一杯热咖啡、一个温暖的微笑，生活中的小美好总在不经意间出现。'
      },
      {
        id: 3,
        tag: '晚间感悟',
        time: '21:00',
        title: '今天也辛苦了',
        desc: '无论今天经历了什么，你都值得被温柔以待。好好休息，明天会更好。'
      }
    ]
  },

  onLoad() {
    this.updateGreeting()
  },

  updateGreeting() {
    const hour = new Date().getHours()
    let greeting = '早上好'
    if (hour >= 6 && hour < 11) {
      greeting = '早上好'
    } else if (hour >= 11 && hour < 14) {
      greeting = '中午好'
    } else if (hour >= 14 && hour < 18) {
      greeting = '下午好'
    } else if (hour >= 18 && hour < 22) {
      greeting = '晚上好'
    } else {
      greeting = '夜深了'
    }
    this.setData({ greeting })
  },

  onFeatureTap(e) {
    const id = e.currentTarget.dataset.id
    const feature = this.data.features.find(f => f.id === id)
    if (feature && feature.page) {
      // AI 对话需要登录
      if (feature.page === '/pages/chat/index') {
        const app = getApp()
        if (!app.checkLogin()) {
          wx.navigateTo({ url: '/pages/login/index' })
          return
        }
      }
      wx.navigateTo({ url: feature.page })
    }
  }
})
