# 装修垃圾清运预约与消纳结算平台

## 原始需求

> 请实现装修垃圾清运预约与消纳结算平台，Vue3 预约端给业主、物业、清运公司、司机和消纳场使用，Express 后端保存装修备案、楼栋、电梯、垃圾袋数、旧家具、车辆、称重、进场照片、消纳票据和费用结算。业主预约清运时间、楼栋位置和垃圾类型；物业审核装修备案、放行路线和电梯使用；清运公司派车并安排司机；司机上门装车、拍照、过磅和卸货；消纳场回传磅单和票据。这个产品要把装修现场、小区放行、车辆运输和消纳结算串起来，建筑垃圾、旧家具、危险废弃物不能混在一个清运结果里。

## 技术栈

- 前端：Vue 3 + TypeScript + Vite + Tailwind CSS
- 后端：Express + better-sqlite3
- 认证：JWT (jsonwebtoken)
- 文件上传：multer
- 图标：lucide-vue-next
- 工具：clsx + tailwind-merge

## 启动方式

### 前置要求

- Node.js 18+
- npm
- Docker 和 Docker Compose（如使用 Docker 启动）

### Docker 一键启动（推荐）

```bash
docker compose up --build
```

后台运行：

```bash
docker compose up --build -d
```

停止服务：

```bash
docker compose down
```

访问地址：http://localhost:3001

### 手动启动

#### 1. 安装依赖

```bash
npm install
```

#### 2. 启动开发服务

```bash
npm run dev
```

访问地址：http://localhost:5173（前端），后端 API 运行在 http://localhost:3001

#### 3. 生产构建

```bash
npm run build
npx tsx api/server.ts
```

访问地址：http://localhost:3001

## 演示账号

系统内置以下演示账号，密码均为 `123456`：

| 角色 | 手机号 | 姓名 | 说明 |
|------|--------|------|------|
| 业主 | 13800000001 | 张三 | 可新建备案、预约清运 |
| 物业 | 13800000002 | 李经理 | 可审核备案、审核预约 |
| 清运公司 | 13800000003 | 王总 | 可派车调度 |
| 司机 | 13800000004 | 赵师傅 | 可执行装车、过磅、运输、卸货 |
| 消纳场 | 13800000005 | 陈场长 | 可确认消纳、回传磅单票据、结算 |

## 业务流程

```
业主提交装修备案 → 物业审核备案（放行路线、电梯时段）
  → 业主预约清运（选择垃圾类型：建筑垃圾/旧家具/危险废弃物，不可混合）
  → 物业审核预约（放行路线、电梯使用）
    → 清运公司派车、安排司机
      → 司机上门装车 → 拍照 → 过磅（按垃圾类型分别称重）→ 运输 → 卸货
        → 消纳场确认接收 → 上传磅单 → 上传票据 → 按垃圾类型结算费用
```

**核心约束**：建筑垃圾、旧家具、危险废弃物三种垃圾类型不能混在一个清运结果里，每次预约只能选择一种类型，称重和结算均按类型独立记录。

## 功能模块

| 角色 | 功能 |
|------|------|
| 业主 | 工作台、装修备案、清运预约、结算对账、统计分析 |
| 物业 | 工作台、装修备案（审核）、清运预约（审核）、统计分析 |
| 清运公司 | 工作台、清运调度、结算对账、统计分析 |
| 司机 | 工作台、清运执行（装车→过磅→运输→卸货） |
| 消纳场 | 工作台、消纳接收（磅单→票据→结算）、结算对账、统计分析 |

## 目录结构

```
src/
  components/
    AppLayout.vue       # 主布局（侧边栏+顶部栏）
  composables/
    useApi.ts           # API 请求封装（JWT 认证 + 文件上传）
    useAuth.ts          # 用户认证状态管理
    useTheme.ts         # 主题切换
  pages/
    LoginPage.vue       # 登录页（5角色选择+自动填入演示账号）
    DashboardPage.vue   # 工作台（按角色展示不同数据）
    FilingsPage.vue     # 装修备案列表
    FilingDetailPage.vue # 备案详情（物业审核）
    NewFilingPage.vue   # 新建备案（楼栋/电梯下拉联动）
    AppointmentsPage.vue # 清运预约列表
    AppointmentDetailPage.vue # 预约详情（物业审核放行路线）
    NewAppointmentPage.vue   # 新建预约（单选垃圾类型）
    DispatchesPage.vue  # 清运调度列表
    DispatchDetailPage.vue   # 调度详情（派车+创建执行记录）
    ExecutionsPage.vue  # 清运执行列表
    ExecutionDetailPage.vue  # 执行详情（装车→过磅→运输→卸货进度）
    DisposalsPage.vue   # 消纳接收列表
    DisposalDetailPage.vue   # 消纳详情（磅单→票据→确认→结算）
    SettlementsPage.vue # 结算对账列表
    SettlementDetailPage.vue # 结算详情
    StatisticsPage.vue  # 统计分析（概览+趋势+结算）
  router/
    index.ts            # 路由配置（含认证守卫）
  lib/
    utils.ts            # 工具函数
api/
  server.ts            # 后端入口
  app.ts               # Express 应用
  database.ts          # 数据库初始化（含种子数据）
  middleware/
    auth.ts             # JWT 认证中间件 + 角色权限
    upload.ts           # 文件上传中间件（multer）
  routes/
    auth.ts             # 认证路由（注册/登录/个人信息）
    filings.ts          # 装修备案（业主提交/物业审核）
    appointments.ts     # 清运预约（业主预约/物业审核）
    dispatches.ts       # 清运调度（清运公司派车）
    executions.ts       # 清运执行（司机装车/过磅/卸货）
    disposals.ts        # 消纳接收（确认/磅单/票据/结算）
    settlements.ts      # 结算对账
    statistics.ts       # 统计（概览/趋势）
    upload.ts           # 文件上传
    base.ts             # 基础数据（楼栋/电梯/车辆/司机）
```

## 数据模型

- **companies** - 公司（物业/清运/消纳）
- **users** - 用户（业主/物业/清运公司/司机/消纳场）
- **buildings** - 楼栋
- **elevators** - 电梯
- **filings** - 装修备案
- **appointments** - 清运预约
- **vehicles** - 车辆
- **dispatches** - 调度
- **executions** - 执行记录
- **execution_weights** - 称重明细（按垃圾类型）
- **disposals** - 消纳记录
- **settlements** - 结算记录（按垃圾类型）
