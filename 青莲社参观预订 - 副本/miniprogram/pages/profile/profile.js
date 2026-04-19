const app = getApp();

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    isAdmin: false,
    isLoading: false,
    openid: ''
  },

  onLoad: function() {
    this.checkLoginAndLoadData();
  },

  onShow: function() {
    this.checkLoginAndLoadData();
  },

  checkLoginAndLoadData: function() {
    const userDataStr = wx.getStorageSync('userData');
    const openid = wx.getStorageSync('openid');
    
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        const userInfo = wx.getStorageSync('userInfo');
        
        this.setData({
          hasUserInfo: true,
          isAdmin: userData.isAdmin || false,
          userInfo: userInfo || { nickName: '用户' },
          openid: userData.openid || ''
        });
      } catch (e) {
        console.error('解析用户数据失败:', e);
        this.setData({
          hasUserInfo: false,
          isAdmin: false,
          openid: ''
        });
      }
    } else {
      this.setData({
        hasUserInfo: false,
        isAdmin: false,
        openid: ''
      });
    }
  },

  login: function() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo;
        wx.setStorageSync('userInfo', userInfo);
        this.loginToCloud(userInfo);
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

  loginToCloud: function(userInfo) {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: (res) => {
        const openid = res.result.openid;
        wx.setStorageSync('openid', openid);
        this.checkAdminStatus(openid, userInfo);
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

  // 辅助函数：比较两个openid是否相等（处理空格和大小写）
  compareOpenid: function(openid1, openid2) {
    // 去除两端空格并转换为小写
    const trimmed1 = openid1.trim().toLowerCase();
    const trimmed2 = openid2.trim().toLowerCase();
    
    // 比较长度
    if (trimmed1.length !== trimmed2.length) {
      return false;
    }
    
    // 逐字符比较
    for (let i = 0; i < trimmed1.length; i++) {
      if (trimmed1[i] !== trimmed2[i]) {
        return false;
      }
    }
    
    return true;
  },

  checkAdminStatus: function(openid, userInfo) {
    const db = wx.cloud.database();
    
    // 直接获取整个集合，不使用where查询
    db.collection('admins').get().then(res => {
      if (res.data.length > 0) {
        // 遍历所有记录，查找匹配的openid
        let matched = false;
        
        for (let i = 0; i < res.data.length; i++) {
          const record = res.data[i];
          // 使用辅助函数比较
          const isMatch = this.compareOpenid(record.openid, openid);
          
          if (isMatch) {
            matched = true;
            break;
          }
        }
        
        const isAdmin = matched;
        const userData = {
          openid: openid,
          isAdmin: isAdmin,
          loginTime: new Date().getTime()
        };
        
        app.setUserData(userData);
        
        this.setData({
          isLoading: false,
          hasUserInfo: true,
          isAdmin: isAdmin,
          userInfo: userInfo,
          openid: openid
        });
        
        wx.showToast({
          title: isAdmin ? '管理员登录成功' : '登录成功',
          icon: 'success'
        });
      } else {
        const isAdmin = false;
        const userData = {
          openid: openid,
          isAdmin: isAdmin,
          loginTime: new Date().getTime()
        };
        
        app.setUserData(userData);
        
        this.setData({
          isLoading: false,
          hasUserInfo: true,
          isAdmin: isAdmin,
          userInfo: userInfo,
          openid: openid
        });
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      }
    }).catch(err => {
      console.error('检查管理员状态失败:', err);
      this.setData({ isLoading: false });
      
      const userData = {
        openid: openid,
        isAdmin: false,
        loginTime: new Date().getTime()
      };
      app.setUserData(userData);
      
      this.setData({
        hasUserInfo: true,
        isAdmin: false,
        userInfo: userInfo,
        openid: openid
      });
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    });
  },

  goToMyBookings: function() {
    wx.navigateTo({
      url: '/pages/my-bookings/my-bookings'
    });
  },

  goToAdmin: function() {
    if (!this.data.isAdmin) {
      wx.showModal({
        title: '权限不足',
        content: '您不是管理员，无法访问后台管理',
        showCancel: false
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  },

  logout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          app.clearUserData();
          
          this.setData({
            userInfo: null,
            hasUserInfo: false,
            isAdmin: false,
            openid: ''
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
});
