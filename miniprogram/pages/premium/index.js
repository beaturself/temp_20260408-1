// pages/premium/index.js - 会员与充值
Page({
  data: {
    // 会员套餐
    plans: [
      { id: 'month', name: '月卡', price: '19.9', unit: '/月', desc: '每日畅聊', tag: '' },
      { id: 'quarter', name: '季卡', price: '49.9', unit: '/季', desc: '省16%', tag: '推荐' },
      { id: 'year', name: '年卡', price: '148', unit: '/年', desc: '省38%', tag: '超值' }
    ],
    selectedPlan: 'quarter',

    // 次数充值包
    packs: [
      { id: 'p50', count: 50, price: '6.9', unit: '次', extra: '' },
      { id: 'p200', count: 200, price: '19.9', unit: '次', extra: '赠30次' },
      { id: 'p500', count: 500, price: '39.9', unit: '次', extra: '赠100次' }
    ],
    selectedPack: '',

    // 当前选中 tab
    activeTab: 'vip',

    // 权益列表
    benefits: [
      { icon: '💬', text: '无限畅聊次数' },
      { icon: '🖼', text: '图片发送无限制' },
      { icon: '⚡', text: '优先响应速度' },
      { icon: '🌟', text: '专属AI人格解锁' }
    ]
  },

  onSelectPlan(e) {
    this.setData({ selectedPlan: e.currentTarget.dataset.id, activeTab: 'vip' })
  },

  onSelectPack(e) {
    this.setData({ selectedPack: e.currentTarget.dataset.id, activeTab: 'pack' })
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      selectedPlan: tab === 'vip' ? (this.data.selectedPlan || 'quarter') : this.data.selectedPlan,
      selectedPack: tab === 'pack' ? (this.data.selectedPack || 'p200') : this.data.selectedPack
    })
  },

  onPay() {
    const { activeTab, selectedPlan, selectedPack, plans, packs } = this.data
    let item
    if (activeTab === 'vip') {
      item = plans.find(p => p.id === selectedPlan)
    } else {
      item = packs.find(p => p.id === selectedPack)
    }
    if (!item) {
      wx.showToast({ title: '请选择套餐', icon: 'none' })
      return
    }
    // TODO: 接入微信支付
    wx.showToast({ title: '支付功能即将上线', icon: 'none' })
  },

  onShareAppMessage() {
    return {
      title: '暖心AI会员 - 解锁更多温暖',
      path: '/pages/premium/index'
    }
  }
})
