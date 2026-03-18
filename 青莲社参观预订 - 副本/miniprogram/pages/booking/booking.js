const schoolUnits = require('../../data/schoolUnits.js');

Page({
  data: {
    // 表单数据
    name: '',
    phone: '',
    visitorCount: '',
    notes: '',
    
    // 新增字段
    schoolUnits: schoolUnits.schoolUnits,
    unitIndex: 0,
    selectedUnit: '',
    otherUnit: '',
    
    activityTypes: ['主题党日', '微党课', '座谈会', '主题团日', '其他'],
    activityTypeIndex: 0,
    selectedActivityType: '',
    otherActivity: '',
    
    timePeriods: ['上午', '下午'],
    timePeriodIndex: 0,
    selectedTimePeriod: '',
    
    startTime: '',
    endTime: '',
    startTimeRange: { start: '08:00', end: '12:00' },
    endTimeRange: { start: '08:00', end: '12:00' },
    
    needGuide: false,
    
    // 日期选择
    selectedDate: '',
    morningStatus: '', // 新增：上午状态 available 或 booked
    afternoonStatus: '', // 新增：下午状态 available 或 booked
    
    // 日期范围
    minDate: '',
    maxDate: '',
    
    // 验证状态
    phoneError: '',
    isFormValid: false,
    
    // 加载状态
    isLoading: false
  },

  onLoad: function() {
    // 设置日期范围（至少提前3天到未来30天）
    const today = new Date();
    const minDate = new Date();
    minDate.setDate(today.getDate() + 3);
    
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);
    
    this.setData({
      minDate: this.formatDate(minDate),
      maxDate: this.formatDate(maxDate)
    });
    
    // 初始化云开发（如果未初始化）
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      wx.showToast({
        title: '请升级微信版本',
        icon: 'none'
      });
    }
  },

  // 日期格式化
  formatDate: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 预约单位选择
  onUnitChange: function(e) {
    const index = e.detail.value;
    this.setData({
      unitIndex: index,
      selectedUnit: this.data.schoolUnits[index]
    });
    this.validateForm();
  },

  // 活动类型选择
  onActivityTypeChange: function(e) {
    const index = e.detail.value;
    this.setData({
      activityTypeIndex: index,
      selectedActivityType: this.data.activityTypes[index]
    });
    this.validateForm();
  },

  // 其他活动内容输入
  onOtherActivityInput: function(e) {
    this.setData({
      otherActivity: e.detail.value
    });
    this.validateForm();
  },

  // 其他单位输入
  onOtherUnitInput: function(e) {
    this.setData({
      otherUnit: e.detail.value
    });
    this.validateForm();
  },

  // 日期选择变化
  onDateChange: function(e) {
    const selectedDate = e.detail.value;
    this.setData({
      selectedDate: selectedDate,
      selectedTimePeriod: '', // 清空已选的时段
      startTime: '',
      endTime: ''
    });
    
    // 检查该日期是否已被预约
    this.checkDateAvailability(selectedDate);
    
    this.validateForm();
  },

  // 检查日期可用性
  checkDateAvailability: function(date) {
    if (!date) return;
    
    wx.showLoading({
      title: '查询中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    
    // 查询该日期的所有预约
    db.collection('bookings')
      .where({
        date: date
      })
      .get()
      .then(res => {
        wx.hideLoading();
        
        let morningStatus = 'available';
        let afternoonStatus = 'available';
        
        // 检查该日期是否已有预约
        if (res.data.length > 0) {
          res.data.forEach(booking => {
            if (booking.timePeriod === '上午') {
              morningStatus = 'booked';
            }
            if (booking.timePeriod === '下午') {
              afternoonStatus = 'booked';
            }
          });
        }
        
        this.setData({
          morningStatus: morningStatus,
          afternoonStatus: afternoonStatus
        });
        
        // 如果上午和下午都已被预约，给出提示
        if (morningStatus === 'booked' && afternoonStatus === 'booked') {
          wx.showToast({
            title: '该日期上午和下午都已被预约',
            icon: 'none',
            duration: 2000
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('查询日期状态失败：', err);
        // 查询失败时默认时段可用
        this.setData({
          morningStatus: 'available',
          afternoonStatus: 'available'
        });
      });
  },

  // 时段选择变化
  onTimePeriodChange: function(e) {
    const index = e.detail.value;
    const selectedTimePeriod = this.data.timePeriods[index];
    
    // 检查所选时段是否可用
    if (selectedTimePeriod === '上午' && this.data.morningStatus === 'booked') {
      wx.showToast({
        title: '上午时段已被预约，请选择下午',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (selectedTimePeriod === '下午' && this.data.afternoonStatus === 'booked') {
      wx.showToast({
        title: '下午时段已被预约，请选择上午',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 根据时段设置时间范围
    let startTimeRange, endTimeRange;
    if (selectedTimePeriod === '上午') {
      startTimeRange = { start: '08:00', end: '11:00' };
      endTimeRange = { start: '09:00', end: '12:00' };
    } else {
      startTimeRange = { start: '14:00', end: '16:00' };
      endTimeRange = { start: '15:00', end: '18:00' };
    }
    
    this.setData({
      timePeriodIndex: index,
      selectedTimePeriod: selectedTimePeriod,
      startTime: '',
      endTime: '',
      startTimeRange: startTimeRange,
      endTimeRange: endTimeRange
    });
    
    this.validateForm();
  },

  // 开始时间选择
  onStartTimeChange: function(e) {
    this.setData({
      startTime: e.detail.value
    });
    this.validateForm();
  },

  // 结束时间选择
  onEndTimeChange: function(e) {
    this.setData({
      endTime: e.detail.value
    });
    this.validateForm();
  },

  // 是否需要讲解员
  onGuideChange: function(e) {
    this.setData({
      needGuide: e.detail.value
    });
  },

  // 姓名输入
  onNameInput: function(e) {
    const name = e.detail.value.trim();
    this.setData({
      name: name
    });
    this.validateForm();
  },

  // 手机号输入
  onPhoneInput: function(e) {
    const phone = e.detail.value.trim();
    let phoneError = '';
    
    // 实时验证
    if (phone && !this.isValidPhone(phone)) {
      phoneError = '请输入正确的手机号';
    }
    
    this.setData({
      phone: phone,
      phoneError: phoneError
    });
    this.validateForm();
  },

  // 手机号验证
  isValidPhone: function(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  },

  // 参观人数输入
  onCountInput: function(e) {
    const count = e.detail.value;
    this.setData({
      visitorCount: count
    });
    this.validateForm();
  },

  // 备注输入
  onNotesInput: function(e) {
    const notes = e.detail.value;
    this.setData({
      notes: notes
    });
  },

  // 表单验证
  validateForm: function() {
    const { name, phone, selectedDate, selectedTimePeriod, startTime, endTime, selectedUnit, selectedActivityType, visitorCount, morningStatus, afternoonStatus, otherUnit, otherActivity } = this.data;
    
    // 检查必填字段
    let isValid = name && 
                  phone && 
                  this.isValidPhone(phone) && 
                  selectedDate && 
                  selectedTimePeriod && 
                  startTime && 
                  endTime && 
                  selectedUnit && 
                  selectedActivityType && 
                  visitorCount && 
                  parseInt(visitorCount) > 0;
    
    // 检查选择的时段是否可用
    if (selectedTimePeriod === '上午' && morningStatus === 'booked') {
      isValid = false;
    }
    if (selectedTimePeriod === '下午' && afternoonStatus === 'booked') {
      isValid = false;
    }
    
    // 如果选择了"其他"活动类型，需要填写其他活动内容
    if (selectedActivityType === '其他' && !otherActivity) {
      isValid = false;
    }
    
    // 如果选择了"其他"单位，需要填写其他单位名称
    if (selectedUnit === '其他' && !otherUnit) {
      isValid = false;
    }
    
    // 验证结束时间必须晚于开始时间
    if (startTime && endTime) {
      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = this.timeToMinutes(endTime);
      if (endMinutes <= startMinutes) {
        isValid = false;
      }
    }
    
    this.setData({
      isFormValid: isValid
    });
    
    return isValid;
  },

  // 时间转换为分钟数
  timeToMinutes: function(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },

  // 提交预订
  submitBooking: function() {
    // 再次验证表单
    if (!this.validateForm()) {
      wx.showToast({
        title: '请填写完整且正确的信息',
        icon: 'none'
      });
      return;
    }
    
    // 防止重复提交
    if (this.data.isLoading) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    // 显示加载中
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    
    // 确定单位名称
    let unitName = this.data.selectedUnit;
    if (this.data.selectedUnit === '其他' && this.data.otherUnit) {
      unitName = this.data.otherUnit;
    }
    
    // 确定活动内容
    let activityContent = this.data.selectedActivityType;
    if (this.data.selectedActivityType === '其他') {
      activityContent = this.data.otherActivity;
    }
    
    // 创建预订数据，状态设为待纪委办受理
    const bookingData = {
      unit: unitName,
      activityType: this.data.selectedActivityType,
      activityContent: activityContent,
      date: this.data.selectedDate,
      timePeriod: this.data.selectedTimePeriod,
      startTime: this.data.startTime,
      endTime: this.data.endTime,
      needGuide: this.data.needGuide,
      name: this.data.name,
      phone: this.data.phone,
      visitorCount: parseInt(this.data.visitorCount),
      notes: this.data.notes || '',
      status: 'pending_discipline',
      createTime: db.serverDate()
    };
    
    console.log('准备提交数据：', bookingData);
    
    // 调用云数据库提交预约
    db.collection('bookings')
      .add({
        data: bookingData
      })
      .then(res => {
        console.log('提交成功：', res);
        
        wx.hideLoading();
        this.setData({ isLoading: false });
        
        // 显示成功提示
        wx.showToast({
          title: '预约提交成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            // 延迟重置表单
            setTimeout(() => {
              this.resetForm();
              
              // 跳转到我的页面
              wx.switchTab({
                url: '/pages/profile/profile'
              });
            }, 1500);
          }
        });
      })
      .catch(err => {
        console.error('提交失败：', err);
        wx.hideLoading();
        this.setData({ isLoading: false });
        
        // 显示错误提示
        wx.showModal({
          title: '提示',
          content: '提交失败，请重试',
          showCancel: false
        });
      });
  },

  // 重置表单
  resetForm: function() {
    this.setData({
      name: '',
      phone: '',
      visitorCount: '',
      notes: '',
      selectedDate: '',
      selectedTimePeriod: '',
      startTime: '',
      endTime: '',
      selectedUnit: '',
      selectedActivityType: '',
      otherActivity: '',
      otherUnit: '',
      unitIndex: 0,
      activityTypeIndex: 0,
      timePeriodIndex: 0,
      needGuide: false,
      phoneError: '',
      isFormValid: false
    });
  },

  // 页面卸载时重置状态
  onUnload: function() {
    this.resetForm();
  }
});
