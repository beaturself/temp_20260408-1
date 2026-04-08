// pages/premium/index.js - 会员与充值
const PREMIUM_KEY = 'premiumInfo'

// 套餐时长映射（毫秒）
const PLAN_DURATION = {
  month: 30 * 24 * 3600 * 1000,
  quarter: 90 * 24 * 3600 * 1000,
  year: 365 * 24 * 3600 * 1000
}

// 充值包次数映射（含赠送）
const PACK_QUOTA = {
  p50: 50,
  p200: 230,
  p500: 600
}

Page({
  data: {
    plans: [
      { id: 'month', name: '月卡', price: '19.9', unit: '/月', desc: '每日畅聊', tag: '' },
      { id: 'quarter', name: '季卡', price: '49.9', unit: '/季', desc: '省16%', tag: '推荐' },
      { id: 'year', name: '年卡', price: '148', unit: '/年', desc: '省38%', tag: '超值' }
    ],
    selectedPlan: 'quarter',

    packs: [
      { id: 'p50', count: 50, price: '6.9', unit: '次', extra: '' },
      { id: 'p200', count: 200, price: '19.9', unit: '次', extra: '赠30次' },
      { id: 'p500', count: 500, price: '39.9', unit: '次', extra: '赠100次' }
    ],
    selectedPack: '',

    activeTab: 'vip',
    payMethod: 'wechat',
    currentPrice: '49.9',

    benefits: [
      { icon: '💬', text: '无限畅聊次数' },
      { icon: '🖼', text: '图片发送无限制' },
      { icon: '⚡', text: '优先响应速度' },
      { icon: '🌟', text: '专属AI人格解锁' }
    ]
  },

  onSelectPlan(e) {
    const id = e.currentTarget.dataset.id
    const plan = this.data.plans.find(p => p.id === id)
    this.setData({ selectedPlan: id, activeTab: 'vip', currentPrice: plan ? plan.price : '' })
  },

  onSelectPack(e) {
    const id = e.currentTarget.dataset.id
    const pack = this.data.packs.find(p => p.id === id)
    this.setData({ selectedPack: id, activeTab: 'pack', currentPrice: pack ? pack.price : '' })
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === 'vip') {
      const plan = this.data.plans.find(p => p.id === (this.data.selectedPlan || 'quarter'))
      this.setData({
        activeTab: 'vip',
        selectedPlan: this.data.selectedPlan || 'quarter',
        currentPrice: plan ? plan.price : '49.9'
      })
    } else {
      const packId = this.data.selectedPack || 'p200'
      const pack = this.data.packs.find(p => p.id === packId)
      this.setData({
        activeTab: 'pack',
        selectedPack: packId,
        currentPrice: pack ? pack.price : '19.9'
      })
    }
  },

  onSelectPayMethod(e) {
    this.setData({ payMethod: e.currentTarget.dataset.method })
  },

  onPay() {
    const { activeTab, selectedPlan, selectedPack, plans, packs, payMethod } = this.data

    let item, itemName
    if (activeTab === 'vip') {
      item = plans.find(p => p.id === selectedPlan)
      itemName = item ? `会员${item.name}` : ''
    } else {
      item = packs.find(p => p.id === selectedPack)
      itemName = item ? `${item.count}次对话包` : ''
    }

    if (!item) {
      wx.showToast({ title: '请选择套餐', icon: 'none' })
      return
    }

    const methodName = payMethod === 'wechat' ? '微信支付' : '支付宝'

    wx.showLoading({ title: `${methodName}处理中...`, mask: true })

    // 模拟支付过程（1.5秒）
    setTimeout(() => {
      wx.hideLoading()

      // 构建会员信息
      const now = Date.now()
      let premiumInfo

      if (activeTab === 'vip') {
        const duration = PLAN_DURATION[selectedPlan] || PLAN_DURATION.month
        const existing = getApp().globalData.premiumInfo
        // 如果已是会员，在现有到期时间上叠加
        const baseTime = (existing && existing.type === 'vip' && existing.expiry > now) ? existing.expiry : now
        premiumInfo = {
          type: 'vip',
          planId: selectedPlan,
          planName: item.name,
          expiry: baseTime + duration,
          chatQuota: -1,
          payMethod,
          purchaseTime: now
        }
      } else {
        const quota = PACK_QUOTA[selectedPack] || 0
        const existing = getApp().globalData.premiumInfo
        const existingQuota = (existing && existing.chatQuota > 0) ? existing.chatQuota : 0
        premiumInfo = {
          type: 'pack',
          planId: selectedPack,
          planName: `${item.count}次`,
          expiry: 0,
          chatQuota: existingQuota + quota,
          payMethod,
          purchaseTime: now
        }
      }

      // 持久化
      wx.setStorageSync(PREMIUM_KEY, premiumInfo)
      getApp().globalData.premiumInfo = premiumInfo

      // 成功提示
      wx.showModal({
        title: '支付成功',
        content: `已通过${methodName}成功开通${itemName}`,
        showCancel: false,
        confirmText: '好的',
        confirmColor: '#FF8C42',
        success: () => {
          wx.navigateBack()
        }
      })
    }, 1500)
  },

  onShareAppMessage() {
    return {
      title: '暖心AI会员 - 解锁更多温暖',
      path: '/pages/premium/index'
    }
  }
})
