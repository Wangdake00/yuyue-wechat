// app.js
App({
  globalData: {
    env: 'cloudbase-0gtahyfu3ab9e560',
    userData: null,
    isAdmin: false
  },
  
  onLaunch: function () {
    try {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true
      });
      console.log('小程序启动，云开发已初始化');
      
      this.checkLoginStatus();
    } catch (error) {
      console.error('云开发初始化失败：', error);
    }
  },
  
  checkLoginStatus: function() {
    const userDataStr = wx.getStorageSync('userData');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        this.globalData.userData = userData;
        this.globalData.isAdmin = userData.isAdmin || false;
        console.log('用户已登录，是否管理员：', userData.isAdmin);
      } catch (e) {
        console.error('解析用户数据失败：', e);
      }
    }
  },
  
  isLoggedIn: function() {
    return !!this.globalData.userData || !!wx.getStorageSync('userData');
  },
  
  isAdminUser: function() {
    return this.globalData.isAdmin;
  },
  
  setUserData: function(userData) {
    this.globalData.userData = userData;
    this.globalData.isAdmin = userData.isAdmin || false;
    wx.setStorageSync('userData', JSON.stringify(userData));
  },
  
  clearUserData: function() {
    this.globalData.userData = null;
    this.globalData.isAdmin = false;
    wx.removeStorageSync('userData');
    wx.removeStorageSync('openid');
    wx.removeStorageSync('userInfo');
  }
});
