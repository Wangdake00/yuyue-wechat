const app = getApp();
const volunteers = require('../../data/volunteers.js');

Page({
  data: {
    bookings: [],
    isLoading: false,
    totalCount: 0,
    filterStatus: 'all',
    searchKeyword: '',
    
    showVolunteerModal: false,
    currentBookingId: '',
    volunteerOptions: [],
    volunteerIndex: 0,
    selectedVolunteer: '',
    volunteerClass: '',
    volunteerName: '',
    volunteerPhone: ''
  },

  onLoad: function() {
    this.checkAdminPermission();
  },

  onShow: function() {
    this.checkAdminPermission();
  },

  checkAdminPermission: function() {
    const userDataStr = wx.getStorageSync('userData');
    
    if (!userDataStr) {
      wx.showModal({
        title: '请先登录',
        content: '您还未登录，请先登录',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      });
      return;
    }
    
    try {
      const userData = JSON.parse(userDataStr);
      console.log('管理员页面 - 用户数据:', userData);
      
      if (!userData.isAdmin) {
        wx.showModal({
          title: '权限不足',
          content: '您不是管理员，无法访问此页面',
          showCancel: false,
          success: () => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        });
        return;
      }
      
      this.initVolunteerOptions();
      this.loadAllBookings();
    } catch (e) {
      console.error('解析用户数据失败:', e);
      wx.switchTab({
        url: '/pages/profile/profile'
      });
    }
  },

  loadAllBookings: function() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    const _ = db.command;
    
    let query = db.collection('bookings');
    
    if (this.data.filterStatus !== 'all') {
      query = query.where({
        status: this.data.filterStatus
      });
    }
    
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword;
      query = query.where(_.or([
        {
          name: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          phone: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        }
      ]));
    }
    
    query.orderBy('createTime', 'desc')
      .get()
      .then(res => {
        wx.hideLoading();
        
        const formattedBookings = res.data.map(item => ({
          ...item,
          displayDate: this.formatDate(item.date),
          displayCreateTime: this.formatDateTime(item.createTime),
          displayUpdateTime: item.updateTime ? this.formatDateTime(item.updateTime) : '',
          displayNotes: item.notes || '无备注'
        }));
        
        this.setData({
          bookings: formattedBookings,
          totalCount: formattedBookings.length,
          isLoading: false
        });
        
        if (formattedBookings.length === 0) {
          wx.showToast({
            title: '暂无数据',
            icon: 'none'
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

  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value.trim()
    });
  },

  onSearch: function() {
    this.loadAllBookings();
  },

  onStatusFilter: function(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      filterStatus: status
    }, () => {
      this.loadAllBookings();
    });
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

  formatDate: function(dateValue) {
    if (!dateValue) return '未设置';
    
    try {
      if (typeof dateValue === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          return dateValue;
        }
        if (dateValue.includes('T') || dateValue.includes(' ')) {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
      }
      
      let date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (dateValue.$date) {
        date = new Date(dateValue.$date);
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
    if (!dateTimeValue) return '未记录';
    
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
        const second = date.getSeconds().toString().padStart(2, '0');
        
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      }
      
      return '未记录';
      
    } catch (e) {
      console.error('日期时间格式化错误:', e);
      return '未记录';
    }
  },

  updateBookingStatus: function(e) {
    const bookingId = e.currentTarget.dataset.id;
    const newStatus = e.currentTarget.dataset.status;
    const booking = this.data.bookings.find(item => item._id === bookingId);
    
    if (!booking) return;
    
    const statusTextMap = {
      'confirmed': '确认',
      'cancelled': '取消',
      'completed': '完成'
    };
    
    wx.showModal({
      title: '确认操作',
      content: `确定要将 ${booking.name} 的预订状态改为 ${statusTextMap[newStatus] || newStatus} 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.doUpdateStatus(bookingId, newStatus);
        }
      }
    });
  },

  doUpdateStatus: function(bookingId, newStatus) {
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
      
      const statusTextMap = {
        'confirmed': '确认',
        'cancelled': '取消',
        'completed': '完成'
      };
      
      wx.showToast({
        title: `${statusTextMap[newStatus] || '更新'}成功`,
        icon: 'success',
        duration: 2000
      });
      
      setTimeout(() => {
        this.loadAllBookings();
      }, 500);
    })
    .catch(err => {
      wx.hideLoading();
      console.error('更新失败：', err);
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'none'
      });
    });
  },

  initVolunteerOptions: function() {
    const db = wx.cloud.database();
    
    db.collection('volunteers')
      .orderBy('name', 'asc')
      .get()
      .then(res => {
        if (res.data.length > 0) {
          const volunteerOptions = res.data.map(v => 
            `${v.name} (${v.class || v.className})`
          );
          
          this.setData({
            volunteerOptions: volunteerOptions,
            volunteers: res.data
          });
          console.log('使用云数据库志愿者数据，共', res.data.length, '条');
        } else {
          this.useLocalVolunteers();
        }
      })
      .catch(err => {
        console.error('获取云数据库志愿者失败，使用本地数据：', err);
        this.useLocalVolunteers();
      });
  },
  
  useLocalVolunteers: function() {
    const localVolunteers = volunteers.volunteers;
    
    if (localVolunteers && localVolunteers.length > 0) {
      const volunteerOptions = localVolunteers.map(v => 
        `${v.name} (${v.class || v.className})`
      );
      
      this.setData({
        volunteerOptions: volunteerOptions,
        volunteers: localVolunteers
      });
      console.log('使用本地志愿者数据');
      
      wx.showModal({
        title: '提示',
        content: '云数据库中没有志愿者数据，是否将本地数据导入到云数据库？',
        confirmText: '导入',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            this.importVolunteersToCloud();
          }
        }
      });
    }
  },
  
  importVolunteersToCloud: function() {
    const localVolunteers = volunteers.volunteers;
    
    if (!localVolunteers || localVolunteers.length === 0) {
      wx.showToast({
        title: '没有本地数据可导入',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '导入中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    let successCount = 0;
    let failCount = 0;
    
    const promises = localVolunteers.map(v => {
      return db.collection('volunteers').add({
        data: {
          name: v.name,
          class: v.class || v.className,
          phone: v.phone,
          createTime: db.serverDate()
        }
      }).then(() => {
        successCount++;
      }).catch(() => {
        failCount++;
      });
    });
    
    Promise.all(promises).then(() => {
      wx.hideLoading();
      wx.showModal({
        title: '导入完成',
        content: `成功导入 ${successCount} 条，失败 ${failCount} 条`,
        showCancel: false,
        success: () => {
          this.initVolunteerOptions();
        }
      });
    });
  },

  showVolunteerModal: function(e) {
    const bookingId = e.currentTarget.dataset.id;
    const booking = this.data.bookings.find(item => item._id === bookingId);
    
    if (!booking) return;
    
    this.setData({
      showVolunteerModal: true,
      currentBookingId: bookingId,
      volunteerIndex: 0,
      selectedVolunteer: '',
      volunteerClass: '',
      volunteerName: '',
      volunteerPhone: ''
    });
  },

  hideVolunteerModal: function() {
    this.setData({
      showVolunteerModal: false,
      currentBookingId: '',
      volunteerIndex: 0,
      selectedVolunteer: '',
      volunteerClass: '',
      volunteerName: '',
      volunteerPhone: ''
    });
  },

  onVolunteerChange: function(e) {
    const index = parseInt(e.detail.value);
    const volunteer = this.data.volunteers[index];
    const volunteerClass = volunteer.class || volunteer.className;
    
    this.setData({
      volunteerIndex: index,
      selectedVolunteer: `${volunteer.name} (${volunteerClass})`,
      volunteerClass: volunteerClass,
      volunteerName: volunteer.name,
      volunteerPhone: volunteer.phone
    });
  },

  assignVolunteer: function() {
    const { currentBookingId, volunteerClass, volunteerName, volunteerPhone } = this.data;
    
    if (!volunteerClass || !volunteerName || !volunteerPhone) {
      wx.showToast({
        title: '请填写完整的志愿者信息',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '安排中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    
    db.collection('bookings').doc(currentBookingId).update({
      data: {
        volunteerClass: volunteerClass,
        volunteerName: volunteerName,
        volunteerPhone: volunteerPhone,
        status: 'confirmed',
        updateTime: db.serverDate()
      }
    })
    .then(res => {
      wx.hideLoading();
      
      wx.showToast({
        title: '志愿者安排成功',
        icon: 'success'
      });
      this.hideVolunteerModal();
      this.loadAllBookings();
    })
    .catch(err => {
      wx.hideLoading();
      console.error('安排失败：', err);
      wx.showToast({
        title: '安排失败，请重试',
        icon: 'none'
      });
    });
  },

  deleteBooking: function(e) {
    const bookingId = e.currentTarget.dataset.id;
    const booking = this.data.bookings.find(item => item._id === bookingId);
    
    if (!booking) return;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要永久删除 ${booking.name} 的预约吗？\n\n此操作不可恢复！`,
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
        this.loadAllBookings();
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

  copyInfo: function(e) {
    const type = e.currentTarget.dataset.type;
    const value = e.currentTarget.dataset.value;
    
    if (!value) return;
    
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

  callPhone: function(e) {
    const phone = e.currentTarget.dataset.phone;
    
    if (!phone) return;
    
    wx.makePhoneCall({
      phoneNumber: phone
    });
  },

  onRefresh: function() {
    this.loadAllBookings();
  },

  exportData: function() {
    if (this.data.bookings.length === 0) {
      wx.showToast({
        title: '暂无数据可导出',
        icon: 'none'
      });
      return;
    }
    
    const exportData = this.data.bookings.map(item => ({
      姓名: item.name,
      手机号: item.phone,
      预约单位: item.unit,
      活动类型: item.activityType,
      活动内容: item.activityContent,
      预约日期: item.displayDate,
      时段: item.timePeriod,
      开始时间: item.startTime,
      结束时间: item.endTime,
      需要讲解员: item.needGuide ? '是' : '否',
      参观人数: item.visitorCount,
      备注: item.displayNotes,
      状态: this.getStatusText(item.status),
      志愿者班级: item.volunteerClass || '未安排',
      志愿者姓名: item.volunteerName || '未安排',
      志愿者电话: item.volunteerPhone || '未安排',
      提交时间: item.displayCreateTime,
      最后更新时间: item.displayUpdateTime
    }));
    
    const headers = ['姓名', '手机号', '预约单位', '活动类型', '活动内容', '预约日期', '时段', '开始时间', '结束时间', '需要讲解员', '参观人数', '备注', '状态', '志愿者班级', '志愿者姓名', '志愿者电话', '提交时间', '最后更新时间'];
    const csvContent = [
      headers.join(','),
      ...exportData.map(item => 
        headers.map(header => `"${item[header] || ''}"`).join(',')
      )
    ].join('\n');
    
    wx.showModal({
      title: '导出数据',
      content: `共 ${this.data.bookings.length} 条记录，已复制到剪贴板`,
      showCancel: false,
      success: () => {
        wx.setClipboardData({
          data: csvContent,
          success: () => {
            wx.showToast({
              title: '已复制到剪贴板',
              icon: 'success'
            });
          }
        });
      }
    });
  }
});
