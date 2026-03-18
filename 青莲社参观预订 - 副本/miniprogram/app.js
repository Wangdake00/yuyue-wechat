// app.js
App({
  globalData: {
    env: "cloudbase-0gtahyfu3ab9e560"
  },
  
  onLaunch: function () {
    // 初始化云开发
    try {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true
      });
      console.log('小程序启动，云开发已初始化');
    } catch (error) {
      console.error('云开发初始化失败：', error);
      // 即使云开发初始化失败，也继续运行小程序
    }
  }
});