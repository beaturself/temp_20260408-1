Component({
  options: {
    multipleSlots: true
  },
  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: false }
  },
  data: {
    statusBarHeight: 20,
    navBarHeight: 56
  },
  lifetimes: {
    attached() {
      const sys = wx.getSystemInfoSync()
      this.setData({
        statusBarHeight: sys.statusBarHeight,
        navBarHeight: 56
      })
    }
  },
  methods: {
    onBack() {
      wx.navigateBack({ delta: 1 })
    }
  }
})
