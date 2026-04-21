# 大马课程预约系统

一个现代极简、高级精致的 H5 网页应用，用于教练排期与家长自助选课。

## 功能特性

### 家长端
- 🔐 手机号快速登录（首次自动注册）
- 📅 可视化日历约课
- 🎯 多时段选择、重复预约
- 📊 课程统计与历史记录
- 👤 个人信息管理

### 教练端
- 📆 日历式排期管理
- 📍 上课地址管理
- 📈 预约率/上课率统计图表
- 👥 学员管理与课时统计
- 🔧 个性化登录页设置

## 技术栈

- **前端**: Vue 3 + Vite + TailwindCSS + Vant UI + ECharts
- **后端**: Node.js + Express + better-sqlite3
- **认证**: JWT

## 快速开始

### 1. 安装依赖

```bash
cd dama-booking
npm run install:all
```

### 2. 启动开发服务器

```bash
# 同时启动前端和后端
npm run dev
```

或者分别启动:

```bash
# 后端 (http://localhost:3000)
cd backend && npm run dev

# 前端 (http://localhost:5173)
cd frontend && npm run dev
```

### 3. 访问系统

- 家长端: http://localhost:5173/#/login
- 教练端: http://localhost:5173/#/coach-login
- Root管理: 登录页右上角点击 "root"

## 默认账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 教练1 | dama | dama123456 |
| 教练2 | jia | dama123456 |
| Root | - | cyberci |
| 家长 | 手机号 | 123456 (首次登录后) |

## 项目结构

```
dama-booking/
├── frontend/          # Vue3 前端
│   ├── src/
│   │   ├── views/     # 页面视图
│   │   ├── components/# 组件
│   │   ├── stores/    # Pinia 状态管理
│   │   ├── api/       # API 接口
│   │   └── utils/     # 工具函数
│   └── package.json
├── backend/           # Node.js 后端
│   ├── server.js      # 主服务
│   ├── db.js          # 数据库
│   └── package.json
└── package.json
```

## 核心功能说明

### 约课流程
1. 家长登录后进入约课页面
2. 选择教练（大马/贾教练）
3. 在日历中选择日期
4. 选择可用时段（可多选）
5. 确认预约信息并提交

### 排期管理
1. 教练登录后进入课时设置
2. 选择本月/下月计划
3. 批量选择日期并设置时段
4. 支持快速复制上月计划

### 数据统计
- 预约率 = 实际预约天数 / 开放课时天数
- 上课率 = 已确认上课时数 / 已预约总时数

## 注意事项

- 系统保留最近 1 年的业务数据
- 教练只能调整本周和下周的预约
- 历史排期有预约记录时不可删除
- 统计数据每日 00:01 自动更新

## License

MIT
