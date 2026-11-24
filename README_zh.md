<div align="center">

<img src="./images/bridge_logo.png" alt="Bridge Logo" width="520" />

# Bridge

**通用本地至 Web 端 AI 编程连接框架**

[![npm version](https://img.shields.io/badge/npm-v1.0.10-D2FF00.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@markmayandi/bridge)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg?style=flat-square)](https://github.com/Manimaran-tech/bridge)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

<p align="center">
  <a href="./README.md">English</a> | <b>简体中文</b>
</p>

<p align="center">
  通过模型上下文协议 (Model Context Protocol, MCP)，秒级将您的本地代码库与开发环境安全直连至 Claude Web、ChatGPT、Gemini 和 DeepSeek。
</p>

<p align="center">
  <img src="./images/bridge-demo.gif" alt="Bridge 演示：安装、运行 bridge、选择项目文件夹、获取 MCP URL" width="820" />
  <br />
  <sub>安装 → 运行 <code>bridge</code> → 选择项目 → 复制 MCP URL（<a href="./images/bridge-demo.mp4">MP4 版本</a>）</sub>
</p>

---

</div>

## 快速开始

### 1. 免安装即开即用（推荐）

通过 `npx` 直接运行，无需预先安装任何依赖：

```bash
npx @markmayandi/bridge
```

### 2. 全局安装

全局安装后，可在任意终端路径随时调用 `bridge` 命令：

```bash
npm install -g @markmayandi/bridge
```

进入任意项目根目录并启动：

```bash
bridge .
```

### 3. 从源码克隆运行

如需检查源码、深度定制或参与贡献：

```bash
git clone https://github.com/Manimaran-tech/bridge.git
cd bridge
node bridge.js
```

也可以直接传入指定的项目工作目录：

```bash
node bridge.js /path/to/project
```

---

## 通用 MCP 连接

Bridge 会自动建立一条 Anycast HTTPS 穿透隧道，生成高强度安全认证令牌，并将带有认证信息的端点直接复制到系统剪贴板：

```text
https://xxxx.trycloudflare.com/mcp?token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 身份验证与安全防护体系

Bridge 具备原生的零信任安全架构：
- **Bearer Token 身份认证**：所有 HTTP/SSE 端点（`/mcp`、`/call`、`/api/set-directory`、`/api/status`、`/openapi.json`）均必须携带认证令牌（支持 `Authorization: Bearer <token>` 请求头或 `?token=<token>` 参数），未授权请求将被拒绝并返回 `401 Unauthorized`。
- **动态令牌自动签发**：启动时，Bridge 会自动生成一个 24 字节高熵十六进制安全令牌，并自动拼装至剪贴板链接中。
- **自定义令牌支持**：可通过 `--token <secret>` 参数或 `BRIDGE_TOKEN` 环境变量指定自定义认证令牌。
- **本地回环地址锁定**：本地 MCP 服务独占绑定 `127.0.0.1`，杜绝局域网旁路窃听与未授权访问。
- **终端命令执行禁用**：可通过 `--disable-shell` 参数运行，严格禁止任何外部终端命令执行，仅保留沙箱文件操作。

### 可选：固定 MCP URL (Cloudflare 命名隧道)

默认情况下 Bridge 使用零配置的临时 quick tunnel。如需固定域名，可创建一个命名 Cloudflare 隧道，并将令牌交给 Bridge：

1. 打开 **Cloudflare Zero Trust → Networks → Tunnels**，创建命名隧道并复制其令牌。
2. 为该隧道添加 **Public Hostname**，指向 `http://localhost:3000`。
3. 运行一次性交互式配置：

```bash
bridge setup
# 使用 npx 时：npx @markmayandi/bridge setup
# Tunnel token:（隐藏输入）
# Public URL: https://mcp.example.com
```

4. 正常启动 Bridge：

```bash
bridge .
# 使用 npx 时：npx @markmayandi/bridge .
```

固定地址即为 `https://mcp.example.com/mcp?token=<token>`。令牌仅保存在 Bridge 专用的 `~/.bridge/config.json` 中（权限 `0600`），Bridge 不会读取或修改 cloudflared 自身的 `~/.cloudflared` 配置。未保存令牌时，Bridge 会继续使用零配置临时隧道；如需切回临时隧道，随时删除 `~/.bridge/config.json` 即可。

### 连接至各类 Web AI 客户端

主流 Web 端 AI 平台（Claude Web、ChatGPT Web、Gemini 以及各类 MCP 客户端插件）均支持通过已认证的 `/mcp` 端点直连：

1. 从 Bridge 终端复制实时 MCP URL（程序启动后已自动同步至剪贴板，包含安全 Token）。
2. 将此 URL 粘贴至您的 AI 客户端的 MCP 工具或自定义接口设置中。
3. 您的 AI 模型即可立即拥有针对本地项目的沙箱级读写、代码重构、目录搜索及终端测试执行能力。

**全程无需繁琐的传统 JSON 配置文件，也无需配置任何手动路由器端口转发。**

> **Gemini：请使用 Task（任务），而不是 Chat（聊天）。** 在 Gemini 中请通过 **Task** 而非普通 **Chat** 开始使用 Bridge，多步骤的编码工作在 Task 中运行更稳定。

---

## 核心特性

云端的大语言模型通常无法在脱离端口映射或手动复制粘贴的前提下，安全操作物理机中的本地文件。Bridge 通过高效的本地守护进程完美解决了这一痛点：

* **严格目录沙箱 (Directory Jail)：** AI 的所有文件与终端操作被强制限定在指定项目目录内，严防父级目录越权穿越。
* **原生全功能工具套件：** 内置完备的代码级工具（`read`、`write`、`edit`、`str_replace_editor`、`pwsh`、`bash`、`jobs`、`plan_mode`）。
* **零配置 Anycast 隧道：** 底层依托 Cloudflare 提供安全稳定的公网 HTTPS 隧道，自带 SSL 证书校验与剪贴板一键同步。如需固定 URL，可运行一次 `bridge setup` 使用命名隧道。
* **交互式终端仪表盘：** LN4 Volt 等宽极客控制台，支持实时流量数据流与无需重启的项目目录动态热切换。适配任意终端尺寸，调整窗口大小或最大化时（包括加载界面）都会干净地重绘。
* **Overview 总览面板：** 查看 AI 的全部改动（Diff 与撤销）、核验磁盘文件、查看或停止正在运行的命令。按 `[S]` 或点击右上角的 `≡` 按钮打开。
* **隧道连接动画：** 隧道建立期间，双通道连线展示经由 Cloudflare 边缘节点发出的请求与返回的响应，并以清单形式显示每个启动阶段。
* **多个 Bridge 并行：** 可为不同项目同时运行多个 Bridge。新启动的 Bridge 绝不会停止另一个正在运行的 Bridge 的服务，而是自动选择下一个空闲端口。

---

## 安全防护模型

| 防护维度 | 实现机制 |
| :--- | :--- |
| **身份认证与授权 (Authentication)** | 所有 HTTP 与 SSE 端点均强制启用 Bearer 令牌认证（支持 `Authorization: Bearer <token>` 与 `?token=<token>`），未授权请求直接返回 `401 Unauthorized`。 |
| **路径穿越防御 (Path Traversal)** | 采用底层规范化路径校验 (`fs.realpathSync`)，一旦检测到任何指向根目录沙箱外部的操作，立即阻断。 |
| **符号链接越界检查 (Symlinks)** | 深度解析符号链接目标，严禁任何指向项目文件夹外部的读写与重定向。 |
| **本地端口严格隔离** | 本地服务仅监听回环地址 `127.0.0.1`，公网数据流仅经由经过认证的单会话 Anycast 隧道流转。 |
| **命令执行管控与禁用** | 终端工具套件 (`pwsh`、`bash`、`execute_command`) 受严格策略保护，并可通过 `--disable-shell` 完全禁用远程命令执行。 |
| **实时流量透明审计** | 随时按下 `[L]` 键，即可在终端实时监听所有传入的 JSON-RPC 请求细节与工具调用参数。 |

---

## 终端快捷键指南

| 按键 | 功能说明 |
| :--- | :--- |
| `[C]` | 重新将带有身份认证 Token 的 MCP URL 复制到剪贴板。 |
| `[T]` | 单独复制 Bearer 身份认证令牌 (Token) 到剪贴板。 |
| `[D]` | 打开终端内置目录导航器，无需重启服务即可快速切换工作目录。 |
| `[L]` | 开启 / 关闭实时数据流量与工具执行日志流。 |
| `[S]` | 打开 Overview 总览面板（`[R]` 变更审阅、`[F]` 文件核验、`[T]` 终端管理、`[H]` 帮助）。也可以点击右上角的 `≡` 按钮。 |
| `[Q]` | 优雅断开穿透隧道、释放占用端口并退出程序。 |

### Overview 总览面板

在主仪表盘按 `[S]` 或点击右上角的 `≡` 按钮，可打开实时更新的 **Overview** 菜单（点击菜单项即可打开，点击其他位置关闭；仪表盘中选择文字请按住 `Shift` 拖动），查看本次会话的 `+新增 / −删除` 行数统计、文件变更数及正在运行的进程数：

* **`[R]` Review（变更审阅）：** 查看 AI 在当前会话中创建、修改或删除的所有文件及统一 Diff；支持 `(edited outside)` 外部修改提示、按 `[U]` 撤销上次变更（基于回滚快照）以及按 `[O]` 在默认编辑器中打开。
* **`[F]` Files（文件核验）：** 通过 `fs.statSync` 实时确认文件是否真正存在于磁盘（`✔` 存在、`✘` 缺失、`🗑` 已移入回收站）；按 `[A]` 切换仅看 AI 改动文件或完整项目目录树，按 `Enter` 直接查看 Diff。
* **`[T]` Terminals（终端与后台任务）：** 查看正在运行和已结束的命令及后台任务，按 `[X]` 停止进程树，或按 `Enter` 以 Chrome 风格标签页全屏接管输出（`Ctrl+←/→` 切换标签、`Ctrl+W` 关闭、`Ctrl+X` 停止、`Ctrl+]` 脱离、`Ctrl+T` 返回列表）。接管视图底部提供本地行编辑与多行粘贴支持（`Enter` 发送当前行、`Backspace` 本地退格、`←/→` 移动光标、`Ctrl+U` 清空当前行、`Ctrl+D` 先发送缓冲文本再发送 EOF、`Esc` 立即透传）。
* **`[H]` Help（帮助）：** 内置可滚动的快捷键速查、图标说明、审批模式、安全边界与日志路径参考。

在任意总览视图中，权限审批横幅（`[Y]`/`[N]`）始终保持置顶；在终端接管视图下需短暂停顿输入后再按 `[Y]`/`[N]`/`[Esc]` 响应，防止误触。

---

## 致谢与社区鸣谢

Bridge 借鉴并汲取了来自 [DeepSeek](https://github.com/deepseek-ai) 开源 harness 社区关于本地守护进程设计与底层工具链的探索实践。我们向持续推动本地大模型工具生态演进的开源开发者们致以诚挚敬意。

---

## 开源协议

本项目基于 **MIT 协议** 开放源代码。详细条款请参阅 `LICENSE` 文件。

<div align="center">
  <sub>维护者：<a href="https://github.com/Manimaran-tech">Manimaran</a></sub>
</div>
