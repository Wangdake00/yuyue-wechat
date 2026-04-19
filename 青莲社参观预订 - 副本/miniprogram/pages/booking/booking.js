const schoolUnits = require('../../data/schoolUnits.js');

Page({
  data: {
    name: '',
    phone: '',
    visitorCount: '',
    notes: '',
    
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
    
    selectedDate: '',
    morningStatus: '',
    afternoonStatus: '',
    
    minDate: '',
    maxDate: '',
    
    phoneError: '',
    isFormValid: false,
    
    isLoading: false
  },

  onLoad: function() {
    const today = new Date();
    const minDate = new Date();
    minDate.setDate(today.getDate() + 3);
    
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);
    
    this.setData({
      minDate: this.formatDate(minDate),
      maxDate: this.formatDate(maxDate)
    });
    
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      wx.showToast({
        title: '请升级微信版本',
        icon: 'none'
      });
    }
  },

  formatDate: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  onUnitChange: function(e) {
    const index = e.detail.value;
    this.setData({
      unitIndex: index,
      selectedUnit: this.data.schoolUnits[index]
    });
    this.validateForm();
  },

  onActivityTypeChange: function(e) {
    const index = e.detail.value;
    this.setData({
      activityTypeIndex: index,
      selectedActivityType: this.data.activityTypes[index]
    });
    this.validateForm();
  },

  onOtherActivityInput: function(e) {
    this.setData({
      otherActivity: e.detail.value
    });
    this.validateForm();
  },

  onOtherUnitInput: function(e) {
    this.setData({
      otherUnit: e.detail.value
    });
    this.validateForm();
  },

  onDateChange: function(e) {
    const selectedDate = e.detail.value;
    this.setData({
      selectedDate: selectedDate,
      selectedTimePeriod: '',
      startTime: '',
      endTime: ''
    });
    
    this.checkDateAvailability(selectedDate);
    
    this.validateForm();
  },

  checkDateAvailability: function(date) {
    if (!date) return;
    
    wx.showLoading({
      title: '查询中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    
    db.collection('bookings')
      .where({
        date: date
      })
      .get()
      .then(res => {
        wx.hideLoading();
        
        let morningStatus = 'available';
        let afternoonStatus = 'available';
        
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
        this.setData({
          morningStatus: 'available',
          afternoonStatus: 'available'
        });
      });
  },

  onTimePeriodChange: function(e) {
    const index = e.detail.value;
    const selectedTimePeriod = this.data.timePeriods[index];
    
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

  onStartTimeChange: function(e) {
    this.setData({
      startTime: e.detail.value
    });
    this.validateForm();
  },

  onEndTimeChange: function(e) {
    this.setData({
      endTime: e.detail.value
    });
    this.validateForm();
  },

  onGuideChange: function(e) {
    this.setData({
      needGuide: e.detail.value
    });
  },

  onNameInput: function(e) {
    const name = e.detail.value.trim();
    this.setData({
      name: name
    });
    this.validateForm();
  },

  onPhoneInput: function(e) {
    const phone = e.detail.value.trim();
    let phoneError = '';
    
    if (phone && !this.isValidPhone(phone)) {
      phoneError = '请输入正确的手机号';
    }
    
    this.setData({
      phone: phone,
      phoneError: phoneError
    });
    this.validateForm();
  },

  isValidPhone: function(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  },

  onCountInput: function(e) {
    const count = e.detail.value;
    this.setData({
      visitorCount: count
    });
    this.validateForm();
  },

  onNotesInput: function(e) {
    const notes = e.detail.value;
    this.setData({
      notes: notes
    });
  },

  validateForm: function() {
    const { name, phone, selectedDate, selectedTimePeriod, startTime, endTime, selectedUnit, selectedActivityType, visitorCount, morningStatus, afternoonStatus, otherUnit, otherActivity } = this.data;
    
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
    
    if (selectedTimePeriod === '上午' && morningStatus === 'booked') {
      isValid = false;
    }
    if (selectedTimePeriod === '下午' && afternoonStatus === 'booked') {
      isValid = false;
    }
    
    if (selectedActivityType === '其他' && !otherActivity) {
      isValid = false;
    }
    
    if (selectedUnit === '其他' && !otherUnit) {
      isValid = false;
    }
    
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

  timeToMinutes: function(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },

  submitBooking: function() {
    if (!this.validateForm()) {
      wx.showToast({
        title: '请填写完整且正确的信息',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.isLoading) {
      return;
    }
    
    this.doSubmitBooking();
  },
  
  doSubmitBooking: function() {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showModal({
        title: '请先登录',
        content: '请先到个人中心登录后再预约',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      });
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
    
    const db = wx.cloud.database();
    
    let unitName = this.data.selectedUnit;
    if (this.data.selectedUnit === '其他' && this.data.otherUnit) {
      unitName = this.data.otherUnit;
    }
    
    let activityContent = this.data.selectedActivityType;
    if (this.data.selectedActivityType === '其他') {
      activityContent = this.data.otherActivity;
    }
    
    const bookingData = {
      openid: openid,
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
      status: 'pending',
      createTime: db.serverDate()
    };
    
    console.log('准备提交数据：', bookingData);
    
    db.collection('bookings')
      .add({
        data: bookingData
      })
      .then(res => {
        console.log('提交成功：', res);
        
        wx.hideLoading();
        this.setData({ isLoading: false });
        
        wx.showToast({
          title: '预约提交成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            setTimeout(() => {
              this.resetForm();
              
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
        
        wx.showModal({
          title: '提示',
          content: '提交失败，请重试',
          showCancel: false
        });
      });
  },

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

  onUnload: function() {
    this.resetForm();
  }
});
