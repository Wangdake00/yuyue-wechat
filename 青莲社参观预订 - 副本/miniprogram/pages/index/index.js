// pages/index/index.js
Page({
  data: {
    noticeList: [
      '请提前10分钟到达接待处',
      '参观期间请保持安静，勿打扰他人', 
      '请爱护社团内设施和展品',
      '如需取消预订，请提前24小时通知',
      '团队参观请提前3天预约'
    ],
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false
  },

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
    } else {
      this.setData({
        userInfo: null,
        hasUserInfo: false
      });
    }
  },

  // 统一的登录方法
  handleLogin() {
    if (this.data.canIUseGetUserProfile) {
      this.getUserProfile();
    } else {
      wx.showToast({
        title: '请使用最新版微信',
        icon: 'none'
      });
    }
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        const userInfo = res.userInfo;
        wx.setStorageSync('userInfo', userInfo);
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true
        });
        wx.showToast({
          title: '授权成功',
          icon: 'success'
        });
        
        // 检查是否需要绑定手机号
        setTimeout(() => {
          this.checkPhoneNumber();
        }, 1000);
      },
      fail: (err) => {
        console.log('用户拒绝授权', err);
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        });
      }
    });
  },

  // 检查是否需要绑定手机号
  checkPhoneNumber() {
    const phoneNumber = wx.getStorageSync('phoneNumber');
    if (!phoneNumber) {
      wx.showModal({
        title: '绑定手机号',
        content: '建议绑定手机号以便管理预约记录',
        confirmText: '去绑定',
        cancelText: '以后再说',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        }
      });
    }
  },

  onShareAppMessage() {
    return {
      title: '青莲社参观预订',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  }
});