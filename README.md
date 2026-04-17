# Lcgl 理财管家

一款简洁好用的个人财务管理桌面应用。

## 项目简介

Lcgl（理财管家）帮助你轻松管理个人资产和负债。无论是追踪银行账户、投资组合，还是分析理财收益，都能在一个应用里完成。所有数据保存在本地，隐私安全有保障。

## 功能概览

- **财务仪表盘** — 一目了然看总资产、负债和收益趋势
- **账户管理** — 记录存款、信用卡、房贷等各种资产和负债
- **投资组合** — 追踪股票、基金、债券等持仓和成本
- **收益分析** — 分析投资表现，对比历史业绩
- **智能提醒** — 还款日提醒、账户变动通知
- **数据导入导出** — 支持 JSON 格式导入导出，安全备份
- **财务规划** — 设定理财目标，智能再平衡建议
- **自定义仪表盘** — 自由搭配小组件，打造个人专属视图

## 安装部署

### 环境要求

| 平台        | 要求                                           |
| ----------- | ---------------------------------------------- |
| **macOS**   | macOS 10.15+，Xcode 命令行工具                 |
| **Windows** | Windows 10/11 (64-bit)，WebView2 Runtime       |
| **Linux**   | Ubuntu 22.04+ / Fedora 38+，需要 WebKitGTK 4.1 |

> ⚠️ **ARM64 服务器说明**：部分 Linux 发行版（如基于 Ubuntu 20.04 的 ARM 架构系统）可能只有 WebKitGTK 4.0，不支持 Tauri 2.x。请使用 **Ubuntu 22.04+ / Fedora 38+ / macOS / Windows** 进行构建。

**Ubuntu 22.04+ 安装依赖：**

```bash
sudo apt-get update
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

### 安装步骤

```bash
# 1. 克隆项目
git clone <仓库地址>
cd Lcgl

# 2. 安装依赖
npm install

# 3. 首次构建（只需一次）
npm run tauri build
```

> **注意**：如果构建失败，请确认系统已安装上述依赖。SQLite 随应用自动安装，无需单独部署。

## 启动方式

| 场景     | 命令                  | 说明                     |
| -------- | --------------------- | ------------------------ |
| 首次使用 | `npm run tauri build` | 构建安装包，只需执行一次 |
| 之后使用 | 双击可执行文件        | 直接运行，无需终端       |

- **macOS/Linux**: `src-tauri/target/release/lcgl`
- **Windows**: `src-tauri/target/release/lcgl.exe`
- **安装包**: `src-tauri/target/release/bundle/`

## 开发模式

**必须使用 Tauri 开发模式：**

```bash
npm run tauri dev    # 启动 Tauri 开发服务器（包含完整前后端）
```

> ⚠️ **不要使用 `npm run dev`** — 这是纯前端模式，不包含 Tauri 后端，调用 API 会报错。

如果需要在无 GTK 环境下开发前端 UI，可以使用：

```bash
npm run dev          # 仅 Vite 前端服务器（无 Tauri 后端）
```

访问 http://localhost:1420 可预览界面，但功能受限。

---

有问题或建议？欢迎提交 Issue。
