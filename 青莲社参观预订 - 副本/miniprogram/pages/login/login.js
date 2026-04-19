Page({
  data: {
    isLoading: false,
    canIUseGetUserProfile: false
  },

  onLoad: function() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
    
    this.checkLoginStatus();
  },

  checkLoginStatus: function() {
    const openid = wx.getStorageSync('openid');
    if (openid) {
      this.redirectToAppropriatePage();
    }
  },

  getUserProfile: function() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo;
        wx.setStorageSync('userInfo', userInfo);
        this.loginToCloud();
      },
      fail: (err) => {
        this.setData({ isLoading: false });
        console.error('获取用户信息失败:', err);
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        });
      }
    });
  },

  loginToCloud: function() {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: (res) => {
        console.log('云函数登录成功:', res);
        const openid = res.result.openid;
        wx.setStorageSync('openid', openid);
        
        this.checkAdminStatus(openid);
      },
      fail: (err) => {
        this.setData({ isLoading: false });
        console.error('云函数登录失败:', err);
        
        wx.showModal({
          title: '登录失败',
          content: '云开发登录失败，请检查云函数是否部署',
          showCancel: false
        });
      }
    });
  },

  checkAdminStatus: function(openid) {
    const db = wx.cloud.database();
    
    db.collection('admins').where({
      _openid: openid
    }).get().then(res => {
      const isAdmin = res.data.length > 0;
      const userData = {
        openid: openid,
        isAdmin: isAdmin,
        loginTime: new Date().getTime()
      };
      
      wx.setStorageSync('userData', JSON.stringify(userData));
      
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      setTimeout(() => {
        this.redirectToAppropriatePage();
      }, 1000);
    }).catch(err => {
      console.error('检查管理员状态失败:', err);
      this.setData({ isLoading: false });
      
      const userData = {
        openid: openid,
        isAdmin: false,
        loginTime: new Date().getTime()
      };
      wx.setStorageSync('userData', JSON.stringify(userData));
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1000);
    });
  },

  redirectToAppropriatePage: function() {
    const userDataStr = wx.getStorageSync('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      if (userData.isAdmin) {
        wx.redirectTo({
          url: '/pages/admin/admin'
        });
      } else {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  }
});
