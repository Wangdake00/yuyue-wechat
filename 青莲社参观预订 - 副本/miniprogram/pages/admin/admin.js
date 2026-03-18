const volunteers = require('../../data/volunteers.js');

Page({
  data: {
    bookings: [],
    isLoading: false,
    totalCount: 0,
    filterStatus: 'all',
    searchKeyword: '',
    
    // 志愿者安排弹窗
    showVolunteerModal: false,
    currentBookingId: '',
    volunteerOptions: [],
    volunteerIndex: 0,
    selectedVolunteer: '',
    volunteerClass: '',
    volunteerName: '',
    volunteerPhone: '',
    
    // 订阅消息相关
    appid: ''	, // 小程序AppID
    secret: '', // 小程序密钥
    token: '', // 访问令牌
    userOpenid: '', // 用户OpenID
    mobanID: 'Zcv2dCzC0KPI3UcnNqVDgbOjcsfdzZ5xofC1Ovz3d0A' // 模板ID
  },

  onLoad: function() {
    this.initVolunteerOptions();
    this.loadAllBookings();
    // 初始化订阅消息相关信息
    this.getcode();
  },

  onShow: function() {
    this.loadAllBookings();
  },

  // 加载所有预订数据
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

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value.trim()
    });
  },

  // 执行搜索
  onSearch: function() {
    this.loadAllBookings();
  },

  // 状态筛选
  onStatusFilter: function(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      filterStatus: status
    }, () => {
      this.loadAllBookings();
    });
  },

  // 获取状态文本
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

  // 获取状态颜色
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

  // 格式化日期
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

  // 格式化日期时间
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

  // 更新预订状态
  updateBookingStatus: function(e) {
    const bookingId = e.currentTarget.dataset.id;
    const newStatus = e.currentTarget.dataset.status;
    const booking = this.data.bookings.find(item => item._id === bookingId);
    
    if (!booking) return;
    
    const statusTextMap = {
      'pending_director': '受理并转主任审批',
      'pending_guide': '审批通过',
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

  // 执行状态更新
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
        'pending_director': '受理',
        'pending_guide': '审批通过',
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

  // 初始化志愿者选项
  initVolunteerOptions: function() {
    // 优先使用本地志愿者数据
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
    } else {
      // 本地数据不存在时，从云数据库获取
      const db = wx.cloud.database();
      
      db.collection('volunteers')
        .orderBy('name', 'asc')
        .get()
        .then(res => {
          const volunteerOptions = res.data.map(v => 
            `${v.name} (${v.class || v.className})`
          );
          
          this.setData({
            volunteerOptions: volunteerOptions,
            volunteers: res.data
          });
          console.log('使用云数据库志愿者数据');
        })
        .catch(err => {
          console.error('获取志愿者列表失败：', err);
        });
    }
  },

  // 显示志愿者安排弹窗
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

  // 隐藏志愿者安排弹窗
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

  // 志愿者选择变化
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

  // 安排志愿者
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
        status: 'pending_confirm',
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

  // 发送预约成功信息
  sendNotification: function(e) {
    const bookingId = e.currentTarget.dataset.id;
    const booking = this.data.bookings.find(item => item._id === bookingId);
    
    if (!booking) return;
    
    // 构建预约成功信息
    const message = `【预约成功通知】\n\n` +
      `预约单位：${booking.unit}\n` +
      `活动内容：${booking.activityContent || booking.activityType}\n` +
      `预约时间：${booking.displayDate} ${booking.timePeriod} ${booking.startTime}-${booking.endTime}\n` +
      `参观人数：${booking.visitorCount}人\n` +
      `需要讲解员：${booking.needGuide ? '是' : '否'}\n\n` +
      `志愿者信息：\n` +
      `班级：${booking.volunteerClass || '未安排'}\n` +
      `姓名：${booking.volunteerName || '未安排'}\n` +
      `联系电话：${booking.volunteerPhone || '未安排'}\n\n` +
      `请按时参加活动，如有问题请联系纪委办公室。`;
    
    wx.showModal({
      title: '发送预约成功信息',
      content: message,
      confirmText: '发送订阅消息',
      cancelText: '复制文本',
      success: (res) => {
        if (res.confirm) {
          // 发送订阅消息
          this.sendSubscribeMessage(booking);
        } else if (res.cancel) {
          // 复制到剪贴板
          wx.setClipboardData({
            data: message,
            success: () => {
              wx.showToast({
                title: '已复制到剪贴板',
                icon: 'success'
              });
              
              // 提示用户通过微信发送
              setTimeout(() => {
                wx.showModal({
                  title: '提示',
                  content: '信息已复制到剪贴板，请通过微信或其他方式发送给预约人',
                  showCancel: false
                });
              }, 1500);
            }
          });
        }
      }
    });
  },
  
  // 发送订阅消息
  sendSubscribeMessage: function(booking) {
    wx.showLoading({
      title: '发送中...',
      mask: true
    });
    
    // 构建消息数据
    const templateId = 'Zcv2dCzC0KPI3UcnNqVDgbOjcsfdzZ5xofC1Ovz3d0A';
    const data = {
      phrase9: {
        value: '已同意'
      },
      phrase14: {
        value: '预约成功'
      },
      time22: {
        value: `${booking.displayDate} ${booking.startTime}`
      },
      name1: {
        value: booking.name
      }
    };
    
    // 发送订阅消息
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        if (res[templateId] === 'accept') {
          wx.cloud.callFunction({
            name: 'sendSubscribeMessage',
            data: {
              templateId: templateId,
              data: data,
              page: 'pages/my-bookings/my-bookings'
            },
            success: (res) => {
              wx.hideLoading();
              wx.showToast({
                title: '订阅消息发送成功',
                icon: 'success'
              });
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('发送订阅消息失败：', err);
              wx.showToast({
                title: '发送失败，请重试',
                icon: 'none'
              });
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '用户拒绝订阅消息',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('请求订阅消息失败：', err);
        wx.showToast({
          title: '请求订阅失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 删除预订
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

  // 执行删除
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

  // 复制信息
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

  // 拨打电话
  callPhone: function(e) {
    const phone = e.currentTarget.dataset.phone;
    
    if (!phone) return;
    
    wx.makePhoneCall({
      phoneNumber: phone
    });
  },

  // 刷新数据
  onRefresh: function() {
    this.loadAllBookings();
  },

  // 导出数据
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
  },
  
  // 获取access_token
  gettoken() {
    var appid = this.data.appid;
    var secret = this.data.secret;
    
    if (!appid || !secret) {
      console.error('请填写小程序AppID和密钥');
      return;
    }
    
    wx.request({
      url: 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + appid + '&secret=' + secret,
      method: 'GET',
      data: {},
      header: {},
      success: res => {
        if (res.data.access_token) {
          var token = res.data.access_token;
          this.setData({
            token: token
          });
          console.log('获取token成功:', token);
        } else {
          console.error('获取token失败:', res.data);
        }
      },
      fail: err => {
        console.error('请求token失败:', err);
      }
    });
  },
  
  // 获取code
  getcode() {
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('获取code成功:', res.code);
          this.getopenid(res.code);
        } else {
          console.error('获取code失败:', res.errMsg);
        }
      },
      fail: err => {
        console.error('登录失败:', err);
      }
    });
  },
  
  // 获取openid
  getopenid(code) {
    var appid = this.data.appid;
    var secret = this.data.secret;
    
    if (!appid || !secret) {
      console.error('请填写小程序AppID和密钥');
      return;
    }
    
    wx.request({
      url: 'https://api.weixin.qq.com/sns/jscode2session?appid=' + appid + '&secret=' + secret + '&js_code=' + code + '&grant_type=authorization_code',
      method: 'GET',
      header: {},
      success: res => {
        if (res.data.openid) {
          console.log('获取openid成功:', res.data.openid);
          this.setData({
            userOpenid: res.data.openid
          });
        } else {
          console.error('获取openid失败:', res.data);
        }
      },
      fail: err => {
        console.error('请求openid失败:', err);
      }
    });
  },
  
  // 发送消息
  send(booking) {
    var token = this.data.token;
    var userOpenid = this.data.userOpenid;
    var mobanID = this.data.mobanID;
    
    if (!token) {
      console.error('请先获取token');
      this.gettoken();
      return;
    }
    
    if (!userOpenid) {
      console.error('请先获取openid');
      this.getcode();
      return;
    }
    
    // 构建消息数据
    const data = {
      phrase9: {
        value: '已同意'
      },
      phrase14: {
        value: '预约成功'
      },
      time22: {
        value: `${booking.displayDate} ${booking.startTime}`
      },
      name1: {
        value: booking.name
      }
    };
    
    wx.request({
      url: 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=' + token,
      method: 'POST',
      data: {
        "touser": userOpenid,
        "template_id": mobanID,
        "page": "pages/my-bookings/my-bookings",
        "data": data
      },
      header: {
        'content-type': 'application/json'
      },
      success: res => {
        console.log('发送消息返回:', res.data);
        if (res.data.errcode === 0) {
          wx.hideLoading();
          wx.showToast({
            title: '订阅消息发送成功',
            icon: 'success'
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '发送失败: ' + res.data.errmsg,
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('发送消息失败:', err);
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 调用订阅
  handleSubscribe(booking) {
    var mobanID = this.data.mobanID;
    
    wx.requestSubscribeMessage({
      tmplIds: [mobanID],
      success: (res) => {
        if (res[mobanID] === 'accept') {
          console.log('用户同意订阅该模板');
          this.send(booking);
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '用户拒绝订阅消息',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('授权调用失败', err);
        wx.showToast({
          title: '请求订阅失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 发送订阅消息
  sendSubscribeMessage: function(booking) {
    wx.showLoading({
      title: '发送中...',
      mask: true
    });
    
    // 检查是否有AppID和密钥
    if (!this.data.appid || !this.data.secret) {
      wx.hideLoading();
      wx.showModal({
        title: '提示',
        content: '请在代码中填写小程序AppID和密钥',
        showCancel: false
      });
      return;
    }
    
    // 检查是否有token和openid
    if (!this.data.token) {
      this.gettoken();
    }
    
    if (!this.data.userOpenid) {
      this.getcode();
    }
    
    // 调用订阅
    this.handleSubscribe(booking);
  }
});
