Page({
  data: {
    phone: '',
    bookings: [],
    isLoading: false,
    hasPhoneNumber: false,
    stats: {
      total: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0
    }
  },
  
  onLoad: function() {
    const phoneNumber = wx.getStorageSync('phoneNumber');
    if (phoneNumber) {
      this.setData({
        phone: phoneNumber,
        hasPhoneNumber: true
      });
      this.loadBookings();
    } else {
      this.showNoPhoneNumberTips();
    }
  },
  
  onShow: function() {
    const phoneNumber = wx.getStorageSync('phoneNumber');
    if (phoneNumber) {
      this.setData({
        phone: phoneNumber,
        hasPhoneNumber: true
      });
      this.loadBookings();
    } else if (this.data.hasPhoneNumber) {
      this.showNoPhoneNumberTips();
    }
  },
  
  showNoPhoneNumberTips: function() {
    wx.showModal({
      title: '需要绑定手机号',
      content: '请先到个人中心绑定手机号以查看预约记录',
      showCancel: false,
      confirmText: '去绑定',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      }
    });
  },
  
  loadBookings: function() {
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
        phone: this.data.phone
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
      } else if (item.status === 'pending_discipline' || item.status === 'pending_director' || item.status === 'pending_guide') {
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
      'pending_discipline': '待受理',
      'pending_director': '待审批',
      'pending_guide': '待安排',
      'confirmed': '已确认',
      'cancelled': '已取消',
      'completed': '已完成'
    };
    return statusMap[status] || status;
  },
  
  getStatusColor: function(status) {
    const colorMap = {
      'pending_discipline': '#faad14',
      'pending_director': '#1890ff',
      'pending_guide': '#722ed1',
      'confirmed': '#52c41a',
      'cancelled': '#ff4d4f',
      'completed': '#13c2c2'
    };
    return colorMap[status] || '#666';
  },
  
  // 新增：获取日期的日
  getDateDay: function(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('-')[2];
  },
  
  // 新增：获取日期的月
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
  
  // 签到功能
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
    
    // 检查是否在预约时间当天
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
      
      this.loadBookings();
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
      
      this.loadBookings();
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
    if (this.data.hasPhoneNumber) {
      this.loadBookings();
    } else {
      this.showNoPhoneNumberTips();
    }
  },
  
  goToBooking: function() {
    wx.switchTab({
      url: '/pages/booking/booking'
    });
  }
});
