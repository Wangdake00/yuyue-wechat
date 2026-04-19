// pages/index/index.js
Page({
  data: {
    noticeList: [
      '请提前10分钟到达接待处',
      '参观期间请保持安静，勿打扰他人', 
      '请爱护社团内设施和展品',
      '如需取消预订，请提前24小时通知',
      '团队参观请提前3天预约'
    ]
  },

  onLoad() {
  },

  onShow() {
  },

  onShareAppMessage() {
    return {
      title: '青莲社参观预订',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  }
});
