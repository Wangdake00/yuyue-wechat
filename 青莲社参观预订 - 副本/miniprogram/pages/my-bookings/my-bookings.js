Page({
  data: {
    bookings: [],
    isLoading: false,
    isLoggedIn: false,
    stats: {
      total: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0
    }
  },
  
  onLoad: function() {
    this.checkLoginStatus();
  },
  
  onShow: function() {
    this.checkLoginStatus();
  },
  
  checkLoginStatus: function() {
    const openid = wx.getStorageSync('openid');
    const userDataStr = wx.getStorageSync('userData');
    
    if (openid && userDataStr) {
      this.setData({
        isLoggedIn: true
      });
      this.loadBookings(openid);
    } else {
      this.setData({
        isLoggedIn: false,
        bookings: []
      });
      this.showLoginTips();
    }
  },
  
  showLoginTips: function() {
    wx.showModal({
      title: '请先登录',
      content: '请先登录后查看您的预约记录',
      showCancel: false,
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      }
    });
  },
  
  loadBookings: function(openid) {
    if (this.data.isLoading) return;
    
    this.setData({ 
      isLoading: true
    });
    
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    
    db.collection('bookings')
      .where({
        openid: openid
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        wx.hideLoading();
        this.setData({ isLoading: false });
        
        const formattedBookings = res.data.map(item => ({
          ...item,
          displayDate: this.formatDate(item.date),
          displayCreateTime: this.formatDateTime(item.createTime),
          displayUpdateTime: item.updateTime ? this.formatDateTime(item.updateTime) : ''
        }));
        
        const stats = this.calculateStats(formattedBookings);
        
        this.setData({
          bookings: formattedBookings,
          stats: stats
        });
        
        if (formattedBookings.length === 0) {
          wx.showToast({
            title: '暂无预约记录',
            icon: 'none',
            duration: 2000
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ isLoading: false });
        console.error('查询失败：', err);
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      });
  },
  
  calculateStats: function(bookings) {
    const stats = {
      total: bookings.length,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0
    };
    
    bookings.forEach(item => {
      if (item.status === 'confirmed') {
        stats.confirmed++;
      } else if (item.status === 'pending') {
        stats.pending++;
      } else if (item.status === 'cancelled') {
        stats.cancelled++;
      } else if (item.status === 'completed') {
        stats.completed++;
      }
    });
    
    return stats;
  },
  
  getStatusText: function(status) {
    const statusMap = {
      'pending': '待处理',
      'confirmed': '已确认',
      'cancelled': '已取消',
      'completed': '已完成'
    };
    return statusMap[status] || status;
  },
  
  getStatusColor: function(status) {
    const colorMap = {
      'pending': '#faad14',
      'confirmed': '#52c41a',
      'cancelled': '#ff4d4f',
      'completed': '#13c2c2'
    };
    return colorMap[status] || '#666';
  },
  
  getDateDay: function(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('-')[2];
  },
  
  getDateMonth: function(dateStr) {
    if (!dateStr) return '';
    const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const monthIndex = parseInt(dateStr.split('-')[1]) - 1;
    return months[monthIndex];
  },
  
  formatDate: function(dateValue) {
    if (!dateValue) return '';
    
    try {
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      let date;
      if (dateValue.$date) {
        date = new Date(dateValue.$date);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        date = new Date(dateValue);
      }
      
      if (date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      return String(dateValue);
      
    } catch (e) {
      console.error('日期格式化错误:', e);
      return String(dateValue);
    }
  },
  
  formatDateTime: function(dateTimeValue) {
    if (!dateTimeValue) return '';
    
    try {
      let date;
      
      if (dateTimeValue.$date) {
        date = new Date(dateTimeValue.$date);
      } else if (dateTimeValue instanceof Date) {
        date = dateTimeValue;
      } else {
        date = new Date(dateTimeValue);
      }
      
      if (date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
      }
      
      return String(dateTimeValue);
      
    } catch (e) {
      console.error('日期时间格式化错误:', e);
      return String(dateTimeValue);
    }
  },
  
  checkInBooking: function(e) {
    const bookingId = e.currentTarget.dataset.id;
    const booking = this.data.bookings.find(item => item._id === bookingId);
    
    if (!booking) {
      wx.showToast({
        title: '预订不存在',
        icon: 'none'
      });
      return;
    }
    
    if (booking.status !== 'confirmed') {
      wx.showToast({
        title: '只有已确认的预约才能签到',
        icon: 'none'
      });
      return;
    }
    
    const today = new Date();
    const bookingDate = new Date(booking.date);
    
    if (today.toDateString() !== bookingDate.toDateString()) {
      wx.showModal({
        title: '提示',
        content: '请在预约当天进行签到',
        showCancel: false
      });
      return;
    }
    
    wx.showModal({
      title: '确认签到',
      content: `确定要签到 ${booking.displayDate} ${booking.timePeriod} ${booking.startTime}-${booking.endTime} 的活动吗？`,
      success: (res) => {
        if (res.confirm) {
          this.doCheckIn(bookingId);
        }
      }
    });
  },
  
  doCheckIn: function(bookingId) {
    wx.showLoading({
      title: '签到中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    
    db.collection('bookings').doc(bookingId).update({
      data: {
        status: 'completed',
        checkInTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    .then(res => {
      wx.hideLoading();
      
      wx.showToast({
        title: '签到成功',
        icon: 'success'
      });
      
      const openid = wx.getStorageSync('openid');
      this.loadBookings(openid);
    })
    .catch(err => {
      wx.hideLoading();
      console.error('签到失败：', err);
      
      wx.showToast({
        title: '签到失败，请重试',
        icon: 'none',
        duration: 3000
      });
    });
  },
  
  cancelBooking: function(e) {
    const bookingId = e.currentTarget.dataset.id;
    const booking = this.data.bookings.find(item => item._id === bookingId);
    
    if (!booking) {
      wx.showToast({
        title: '预订不存在',
        icon: 'none'
      });
      return;
    }
    
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      wx.showToast({
        title: '该预订无法取消',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认取消',
      content: `确定要取消 ${booking.displayDate} ${booking.timePeriod} ${booking.startTime}-${booking.endTime} 的预订吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateBookingStatus(bookingId, 'cancelled');
        }
      }
    });
  },
  
  updateBookingStatus: function(bookingId, newStatus) {
    wx.showLoading({
      title: '处理中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    
    db.collection('bookings').doc(bookingId).update({
      data: {
        status: newStatus,
        updateTime: db.serverDate()
      }
    })
    .then(res => {
      wx.hideLoading();
      
      wx.showToast({
        title: newStatus === 'cancelled' ? '取消成功' : '操作成功',
        icon: 'success'
      });
      
      const openid = wx.getStorageSync('openid');
      this.loadBookings(openid);
    })
    .catch(err => {
      wx.hideLoading();
      console.error('更新失败：', err);
      
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none',
        duration: 3000
      });
    });
  },
  
  onRefresh: function() {
    const openid = wx.getStorageSync('openid');
    if (openid) {
      this.loadBookings(openid);
    } else {
      this.showLoginTips();
    }
  },
  
  deleteBooking: function(e) {
    const bookingId = e.currentTarget.dataset.id;
    const booking = this.data.bookings.find(item => item._id === bookingId);
    
    if (!booking) {
      wx.showToast({
        title: '预订不存在',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要永久删除 ${booking.displayDate} 的预约记录吗？\n\n此操作不可恢复！`,
      confirmColor: '#ff4d4f',
      confirmText: '确认删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteBooking(bookingId);
        }
      }
    });
  },
  
  doDeleteBooking: function(bookingId) {
    wx.showLoading({
      title: '删除中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    
    db.collection('bookings').doc(bookingId).remove()
      .then(res => {
        wx.hideLoading();
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        const openid = wx.getStorageSync('openid');
        this.loadBookings(openid);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('删除失败：', err);
        wx.showToast({
          title: '删除失败，请重试',
          icon: 'none'
        });
      });
  },
  
  goToBooking: function() {
    wx.switchTab({
      url: '/pages/booking/booking'
    });
  }
});
