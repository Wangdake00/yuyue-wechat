// 云数据库初始化脚本
// 在微信开发者工具控制台运行此脚本初始化数据库

const db = wx.cloud.database();

// 初始化志愿者数据
const volunteers = [
  { name: '张三', className: '药学2201班', phone: '13800138001' },
  { name: '李四', className: '药学2202班', phone: '13800138002' },
  { name: '王五', className: '中药学2201班', phone: '13800138003' },
  { name: '赵六', className: '中药学2202班', phone: '13800138004' },
  { name: '孙七', className: '制药工程2201班', phone: '13800138005' },
  { name: '周八', className: '制药工程2202班', phone: '13800138006' },
  { name: '吴九', className: '临床药学2201班', phone: '13800138007' },
  { name: '郑十', className: '临床药学2202班', phone: '13800138008' }
];

// 初始化数据库集合
async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 检查并创建 volunteers 集合
    const volunteersRes = await db.collection('volunteers').get();
    console.log('volunteers 集合已存在，文档数：', volunteersRes.data.length);
    
    if (volunteersRes.data.length === 0) {
      console.log('正在导入志愿者数据...');
      for (const volunteer of volunteers) {
        await db.collection('volunteers').add({
          data: volunteer
        });
      }
      console.log('志愿者数据导入完成');
    }
    
    // 检查 bookings 集合
    const bookingsRes = await db.collection('bookings').get();
    console.log('bookings 集合已存在，文档数：', bookingsRes.data.length);
    
    console.log('数据库初始化完成！');
    return true;
  } catch (error) {
    console.error('数据库初始化失败：', error);
    return false;
  }
}

// 导出初始化函数
module.exports = {
  initDatabase
};

// 如果在控制台直接运行，执行初始化
if (typeof window !== 'undefined' && window.wx) {
  initDatabase().then(success => {
    if (success) {
      console.log('数据库初始化成功！');
    } else {
      console.log('数据库初始化失败！');
    }
  });
}
