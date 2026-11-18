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

Bridge 会自动建立一条 Anycast HTTPS 穿透隧道，并将实时可用端点直接复制到系统剪贴板：

```text
https://xxxx.trycloudflare.com/mcp
```

### 连接至各类 Web AI 客户端

主流 Web 端 AI 平台（Claude Web、ChatGPT Web、Gemini 以及各类 MCP 客户端插件）均支持通过单一 `/mcp` 端点直连：

1. 从 Bridge 终端复制实时 MCP URL（程序启动后已自动同步至剪贴板）。
2. 将此 URL 粘贴至您的 AI 客户端的 MCP 工具或自定义接口设置中。
3. 您的 AI 模型即可立即拥有针对本地项目的沙箱级读写、代码重构、目录搜索及终端测试执行能力。

**全程无需繁琐的传统 JSON 配置文件，也无需配置任何手动路由器端口转发。**

---

## 核心特性

云端的大语言模型通常无法在脱离端口映射或手动复制粘贴的前提下，安全操作物理机中的本地文件。Bridge 通过高效的本地守护进程完美解决了这一痛点：

* **严格目录沙箱 (Directory Jail)：** AI 的所有文件与终端操作被强制限定在指定项目目录内，严防父级目录越权穿越。
* **原生全功能工具套件：** 内置完备的代码级工具（`read`、`write`、`edit`、`str_replace_editor`、`pwsh`、`bash`、`jobs`、`plan_mode`）。
* **零配置 Anycast 隧道：** 底层依托 Cloudflare 提供安全稳定的公网 HTTPS 隧道，自带 SSL 证书校验与剪贴板一键同步。
* **交互式终端仪表盘：** LN4 Volt 等宽极客控制台，支持实时流量数据流与无需重启的项目目录动态热切换。

---

## 安全防护模型

| 防护维度 | 实现机制 |
| :--- | :--- |
| **路径穿越防御 (Path Traversal)** | 采用底层规范化路径校验 (`fs.realpathSync`)，一旦检测到任何指向根目录沙箱外部的操作，立即阻断。 |
| **符号链接越界检查 (Symlinks)** | 深度解析符号链接目标，严禁任何指向项目文件夹外部的读写与重定向。 |
| **本地端口严格隔离** | 本地服务仅监听回环地址 `127.0.0.1`，公网数据流仅经由经过认证的单会话 Anycast 隧道流转。 |
| **实时流量透明审计** | 随时按下 `[L]` 键，即可在终端实时监听所有传入的 JSON-RPC 请求细节与工具调用参数。 |

---

## 终端快捷键指南

| 按键 | 功能说明 |
| :--- | :--- |
| `[C]` | 重新将当前的实时 MCP URL 复制到剪贴板。 |
| `[D]` | 打开终端内置目录导航器，无需重启服务即可快速切换工作目录。 |
| `[L]` | 开启 / 关闭实时数据流量与工具执行日志流。 |
| `[Q]` | 优雅断开穿透隧道、释放占用端口并退出程序。 |

---

## 致谢与社区鸣谢

Bridge 借鉴并汲取了来自 [DeepSeek](https://github.com/deepseek-ai) 开源 harness 社区关于本地守护进程设计与底层工具链的探索实践。我们向持续推动本地大模型工具生态演进的开源开发者们致以诚挚敬意。

---

## 开源协议

本项目基于 **MIT 协议** 开放源代码。详细条款请参阅 `LICENSE` 文件。

<div align="center">
  <sub>维护者：<a href="https://github.com/Manimaran-tech">Manimaran</a></sub>
</div>
