// pages/contact/contact.js
Page({
  data: {
    tapCount: 0, // 点击计数
    lastTapTime: 0, // 上次点击时间
    showAdminEntry: false, // 是否显示管理入口
    contactInfo: {
      phone: '020-12345678',
      email: 'qinglianshe@gdpu.edu.cn',
      address: '广东药科大学大学城校区',
      wechat: '青莲社官方',
      officeHours: '周一至周五 9:00-17:00'
    }
  },

  onLoad: function() {
    // 可以在这里加载联系信息
  },

  // 点击联系方式区域
  onContactTap: function() {
    const currentTime = new Date().getTime();
    
    // 如果距离上次点击超过2秒，重置计数
    if (currentTime - this.data.lastTapTime > 2000) {
      this.setData({
        tapCount: 1,
        lastTapTime: currentTime
      });
    } else {
      // 在2秒内连续点击
      const newCount = this.data.tapCount + 1;
      this.setData({
        tapCount: newCount,
        lastTapTime: currentTime
      });
      
      // 如果点击了3次，显示管理入口
      if (newCount >= 3) {
        this.showAdminEntryModal();
        // 重置计数
        setTimeout(() => {
          this.setData({ tapCount: 0 });
        }, 1000);
      }
    }
  },

  // 显示管理入口弹窗
  showAdminEntryModal: function() {
    this.setData({
      showAdminEntry: true
    });
  },

  // 隐藏管理入口
  hideAdminEntry: function() {
    this.setData({
      showAdminEntry: false
    });
  },

  // 跳转到管理登录页面
  goToAdminLogin: function() {
    this.hideAdminEntry();
    
    wx.showModal({
      title: '管理后台',
      content: '',
      editable: true,
      placeholderText: '请输入管理员密码',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const password = res.content;
          const validPasswords = ['123456', 'admin123', 'admin', 'qinglian2024'];
          
          if (validPasswords.includes(password)) {
            wx.navigateTo({
              url: '/pages/admin/admin'
            });
          } else if (password === '') {
            wx.showToast({
              title: '请输入密码',
              icon: 'none'
            });
          } else {
            wx.showToast({
              title: '密码错误',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 拨打电话
  makePhoneCall: function() {
    wx.makePhoneCall({
      phoneNumber: this.data.contactInfo.phone
    });
  },

  // 复制联系方式
  copyContact: function(e) {
    const type = e.currentTarget.dataset.type;
    const value = e.currentTarget.dataset.value;
    
    wx.setClipboardData({
      data: value,
      success: () => {
        wx.showToast({
          title: `${type}已复制`,
          icon: 'success'
        });
      }
    });
  },

  // 打开地图
  openMap: function() {
    wx.openLocation({
      latitude: 23.0427, // 广东药科大学大学城校区纬度
      longitude: 113.3947, // 广东药科大学大学城校区经度
      name: '广东药科大学大学城校区',
      address: this.data.contactInfo.address
    });
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: '青莲社联系方式',
      path: '/pages/contact/contact',
      imageUrl: '/images/share-contact.jpg'
    };
  }
});
