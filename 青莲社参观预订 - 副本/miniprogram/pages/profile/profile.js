Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    hasPhoneNumber: false,
    phoneNumber: '',
    canIUseGetUserProfile: false,
    showPhoneInput: false,
    showPhoneModal: false,
    tempPhoneNumber: '',
    hasAgreed: true
  },

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
    
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  // 从本地存储加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const phoneNumber = wx.getStorageSync('phoneNumber');
      
      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true
        });
      }
      
      if (phoneNumber) {
        this.setData({
          hasPhoneNumber: true,
          phoneNumber: phoneNumber,
          showPhoneInput: false
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  // 获取用户信息
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        const userInfo = res.userInfo;
        
        try {
          wx.setStorageSync('userInfo', userInfo);
          
          this.setData({
            userInfo: userInfo,
            hasUserInfo: true,
            showPhoneInput: true
          });
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
          
          // 询问是否需要输入手机号
          setTimeout(() => {
            this.showPhoneInputAfterLogin();
          }, 1000);
          
        } catch (error) {
          console.error('保存用户信息失败:', error);
          wx.showToast({
            title: '保存信息失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.log('用户拒绝授权', err);
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        });
      }
    });
  },

  // 旧版微信登录兼容
  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      const userInfo = e.detail.userInfo;
      
      try {
        wx.setStorageSync('userInfo', userInfo);
        
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true,
          showPhoneInput: true
        });
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 询问是否需要输入手机号
        setTimeout(() => {
          this.showPhoneInputAfterLogin();
        }, 1000);
        
      } catch (error) {
        console.error('保存用户信息失败:', error);
        wx.showToast({
          title: '保存信息失败',
          icon: 'none'
        });
      }
    } else {
      wx.showToast({
        title: '授权失败',
        icon: 'none'
      });
    }
  },

  // 登录后显示手机号输入提示
  showPhoneInputAfterLogin() {
    // 先检查是否已有手机号
    if (this.data.hasPhoneNumber) {
      return;
    }
    
    wx.showModal({
      title: '绑定手机号',
      content: '需要手机号才能查看和管理您的预约\n是否现在绑定手机号？',
      confirmText: '立即绑定',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          this.showPhoneOptions();
        }
      }
    });
  },

  // 显示手机号绑定选项
  showPhoneOptions() {
    wx.showActionSheet({
      itemList: ['微信一键绑定', '手动输入手机号'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 微信一键绑定 - 通过按钮触发
          // 这个需要在 wxml 中点击按钮触发
        } else if (res.tapIndex === 1) {
          this.showCustomPhoneInput();
        }
      }
    });
  },

  // 获取用户手机号（新方式 - 微信一键绑定）
  getUserPhoneNumber(e) {
    console.log('获取手机号回调:', e);
    
    if (e.detail.code) {
      // 这里可以调用后端接口，通过 code 换取手机号
      wx.showLoading({
        title: '获取中...'
      });
      
      // 模拟获取手机号（实际开发中需要调用后端接口）
      setTimeout(() => {
        wx.hideLoading();
        
        // 模拟获取到的手机号
        const phoneNumber = '138****0000'; // 这里应该是从后端获取的真实手机号
        
        this.savePhoneNumber(phoneNumber);
        
        wx.showToast({
          title: '手机号绑定成功',
          icon: 'success'
        });
        
      }, 1000);
    } else {
      wx.showToast({
        title: '获取手机号失败',
        icon: 'none'
      });
      
      // 如果微信一键绑定失败，显示手动输入选项
      setTimeout(() => {
        wx.showModal({
          title: '提示',
          content: '微信一键绑定失败，是否手动输入手机号？',
          confirmText: '手动输入',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.showCustomPhoneInput();
            }
          }
        });
      }, 500);
    }
  },

  // 显示自定义手机号输入弹窗
  showCustomPhoneInput() {
    this.setData({
      showPhoneModal: true,
      tempPhoneNumber: ''
    });
  },

  // 关闭手机号输入弹窗
  closePhoneModal() {
    this.setData({
      showPhoneModal: false,
      tempPhoneNumber: ''
    });
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      tempPhoneNumber: e.detail.value
    });
  },

  // 清空手机号输入
  clearPhoneInput() {
    this.setData({
      tempPhoneNumber: ''
    });
  },

  // 确认输入手机号
  confirmPhoneInput() {
    const phone = this.data.tempPhoneNumber.trim();
    
    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }
    
    if (this.validatePhone(phone)) {
      this.savePhoneNumber(phone);
      this.closePhoneModal();
    } else {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
    }
  },

  // 验证手机号格式
  validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  },

  // 保存手机号
  savePhoneNumber(phone) {
    try {
      wx.setStorageSync('phoneNumber', phone);
      
      this.setData({
        hasPhoneNumber: true,
        phoneNumber: phone,
        showPhoneInput: false
      });
      
      wx.showToast({
        title: '手机号绑定成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('保存手机号失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  // 防止弹窗背景滚动
  preventTouchMove() {
    return;
  },

  // 协议勾选变化
  onAgreementChange(e) {
    this.setData({
      hasAgreed: e.detail.value.includes('agree')
    });
  },

  // 显示用户协议
  showAgreement: function() {
    wx.showModal({
      title: '青莲社预约系统用户协议',
      content: '# 参观须知\n\n' +
               '1. 请提前10分钟到达接待处\n' +
               '2. 参观期间请保持安静，勿打扰他人\n' + 
               '3. 请爱护社团内设施和展品\n' +
               '4. 如需取消预订，请提前24小时通知\n' +
               '5. 团队参观请提前3天预约\n\n' +
               '# 用户使用条款\n\n' +
               '1. 请提供真实有效的个人信息\n' +
               '2. 妥善保管您的账号和密码\n' +
               '3. 不得利用本系统从事任何违法活动\n' +
               '4. 如有问题，请及时联系管理员',
      confirmText: '我知道了',
      cancelText: '关闭',
      showCancel: true,
      success: (res) => {
        if (res.confirm) {
          // 用户点击了"我知道了"
        }
      }
    });
  },

  // 显示隐私政策
  showPrivacy: function() {
    wx.showModal({
      title: '隐私政策',
      content: '青莲社预约系统非常重视您的隐私保护。\n\n' +
               '一、信息收集范围\n' +
               '• 微信昵称和头像\n' +
               '• 手机号码\n' +
               '• 预约相关信息\n\n' +
               '二、信息使用\n' +
               '• 仅用于预约管理和确认\n' +
               '• 必要时联系用户\n' +
               '• 不用于其他商业用途\n\n' +
               '三、信息保护\n' +
               '• 我们会采取合理的安全措施\n' +
               '• 未经您同意，不会向第三方提供\n\n' +
               '四、联系方式\n' +
               '如有疑问，请联系管理员。',
      confirmText: '我同意',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            hasAgreed: true
          });
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.performLogout();
        }
      }
    });
  },

  // 执行退出登录
  performLogout() {
    try {
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('phoneNumber');
      
      this.setData({
        userInfo: null,
        hasUserInfo: false,
        hasPhoneNumber: false,
        phoneNumber: '',
        showPhoneInput: false
      });
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('退出登录失败:', error);
      wx.showToast({
        title: '退出失败',
        icon: 'none'
      });
    }
  },

  // 跳转到我的预约
  goToMyBookings() {
    const phoneNumber = wx.getStorageSync('phoneNumber');
    
    if (phoneNumber) {
      wx.navigateTo({
        url: '/pages/my-bookings/my-bookings'
      });
    } else {
      this.showPhoneInputForBooking();
    }
  },

  // 预约需要手机号的提示
  showPhoneInputForBooking() {
    wx.showModal({
      title: '需要绑定手机号',
      content: '需要绑定手机号才能查看预约记录',
      confirmText: '立即绑定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.showPhoneOptions();
        }
      }
    });
  },

  // 跳转到管理后台
  goToAdmin() {
    wx.showModal({
      title: '管理后台',
      content: '',
      editable: true,
      placeholderText: '请输入管理员密码',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const password = res.content;
          const validPasswords = ['123456', 'admin123', 'admin'];
          if (validPasswords.includes(password)) {
            wx.navigateTo({
              url: '/pages/admin/admin'
            });
          } else if (password === '') {
            wx.showToast({
              title: '请输入密码',
              icon: 'none'
            });
          } else {
            wx.showToast({
              title: '密码错误',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 编辑手机号
  editPhoneNumber() {
    this.setData({
      tempPhoneNumber: this.data.phoneNumber
    });
    this.showCustomPhoneInput();
  }
});