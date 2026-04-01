<!-- English Version -->
# Buddy Pet userID Brute-force Search Tool

A multi-threaded brute-force search tool for finding Claude Code companion (buddy) userIDs that generate pets with specific attributes. Uses Worker Threads for parallel searching and optimized cryptographic random number generation.

## Table of Contents

- [English Documentation](#english-documentation)
  - [Features](#features)
  - [System Requirements](#system-requirements)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Attribute Reference](#attribute-reference)
  - [Verification Tool](#verification-tool)
  - [How It Works](#how-it-works)
  - [Performance](#performance)
  - [Using Found userIDs](#using-found-userids)
  - [Troubleshooting](#troubleshooting)
  - [File Structure](#file-structure)
  - [Notes](#notes)
- [中文文档](#中文文档)

---

## English Documentation

### Features

- **Multi-threaded search**: Utilizes all CPU cores for maximum search speed
- **Optimized performance**: High-performance random number generation using Bun's native crypto
- **All attribute conditions**: Supports searching by rarity, species, shiny, eye, hat, and minimum stats
- **Validation tool**: Includes a separate verification tool to confirm found userIDs
- **Cross-platform**: Works on Windows, macOS, and Linux

### System Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, Linux with glibc 2.28+
- **Runtime**: [Bun](https://bun.sh/) (version 1.1.0 or later)
- **Node.js**: Not recommended; use Bun for better performance

### Installation

#### 1. Install Bun

**Windows (PowerShell):**
```powershell
iwr https://bun.sh/install.ps1 -useb | iex
```

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Verify installation:**
```bash
bun --version
```

#### 2. Clone or Download Files

Download or clone this repository to your local machine.

### Quick Start

#### Basic Usage

Run the script with default configuration (searches for legendary shiny pets with DEBUGGING ≥ 100):

```bash
bun find_buddy_userid_multithread.js
```

#### Command Line Options

```bash
bun find_buddy_userid_multithread.js [options]
```

**All Available Options:**

| Option | Description | Example |
|--------|-------------|---------|
| `--rarity <rarity>` | Search for specific rarity | `--rarity legendary` |
| `--species <species>` | Search for specific species | `--species cat` |
| `--shiny [true\|false]` | Search for shiny pets (default: `true`) | `--shiny false` |
| `--eye <symbol>` | Search for specific eye symbol | `--eye ✦` |
| `--hat <hat>` | Search for specific hat | `--hat crown` |
| `--min-stats <conditions>` | Minimum stat requirements | `--min-stats "DEBUGGING:80,WISDOM:70"` |
| `--max-iterations <N>` | Maximum number of attempts | `--max-iterations 1000000` |
| `--threads <N>` | Number of worker threads | `--threads 8` |
| `--help` | Show help message | |

#### Configuration File

You can also edit the `CONFIG` object at the top of `find_buddy_userid_multithread.js`:

```javascript
const CONFIG = {
  rarity: 'legendary',
  species: null,
  shiny: true,
  eye: null,
  hat: null,
  minStats: {DEBUGGING: 100}
};
```

### Attribute Reference

#### Rarities
- `common` (60% chance)
- `uncommon` (25% chance)
- `rare` (10% chance)
- `epic` (4% chance)
- `legendary` (1% chance)

#### Species
`duck`, `goose`, `blob`, `cat`, `dragon`, `octopus`, `owl`, `penguin`, `turtle`, `snail`, `ghost`, `axolotl`, `capybara`, `cactus`, `robot`, `rabbit`, `mushroom`, `chonk`

#### Eye Symbols
`·`, `✦`, `×`, `◉`, `@`, `°`

#### Hats
`none`, `crown`, `tophat`, `propeller`, `halo`, `wizard`, `beanie`, `tinyduck`

**Note:** Common rarity pets always have `hat: 'none'`.

#### Stats
- `DEBUGGING`
- `PATIENCE`
- `CHAOS`
- `WISDOM`
- `SNARK`

Each rarity has a minimum floor value:
- Common: 5
- Uncommon: 15
- Rare: 25
- Epic: 35
- Legendary: 50

### Verification Tool

After finding a userID, verify that it actually generates a pet with your desired attributes:

```bash
bun verify_buddy.js <userID> [conditions]
```

**Example:**
```bash
bun verify_buddy.js 1c63302024b564ac347d8dc2561688659d960e68398188aea7fbe4ff5ebbb81a --rarity legendary --shiny
```

### How It Works

1. **Random userID generation**: Generates cryptographically secure random 64-character hex strings
2. **Deterministic pet generation**: Uses `mulberry32` PRNG seeded with `hash(userID + SALT)` where `SALT = 'friend-2026-401'`
3. **Attribute pipeline**: Generates attributes in exact order as Claude Code source code
4. **Condition checking**: Checks each attribute against search conditions
5. **Validation**: Re-generates pet from found userID to prevent false positives

### Performance

- **Search speed**: ~500,000 - 1,000,000 attempts/second (depending on CPU and conditions)
- **Legendary shiny**: ~30-60 seconds
- **Legendary shiny with specific attributes**: ~2-5 minutes
- **Tips**:
  - More threads = faster (use CPU cores - 1)
  - Fewer conditions = faster
  - Higher stat requirements = slower

### Using Found userIDs

1. Copy the found 64-character hex userID
2. Open `~/.claude.json` (or `%USERPROFILE%\.claude.json` on Windows)
3. Replace the `userID` field value with the new userID
4. **Important**: Delete the entire `companion` field (if it exists)
5. Save the file and restart Claude Code
6. Run `/buddy` command to hatch your new pet

### Troubleshooting

#### "Worker threads not working"
- Ensure you're using **Bun**, not Node.js
- The algorithm uses `Bun.hash()` which is not available in Node.js

#### "Found userID doesn't match conditions"
- Use the verification tool: `bun verify_buddy.js <userID>`
- Ensure you deleted the `companion` field in `.claude.json`

#### "Search is very slow"
- Try reducing stat requirements
- Increase thread count: `--threads 16`
- Remove unnecessary conditions (species, hat, etc.)

### File Structure

- `find_buddy_userid_multithread.js` - Main search script with Worker Threads
- `verify_buddy.js` - UserID verification tool
- `crypto_random.c` - Optional C FFI library source (not recommended)
- `build_crypto.bat` - Windows build script for C library
- `build_crypto.sh` - Linux/macOS build script for C library
- `README.md` - This file

### Notes

- This tool is for educational purposes and reverse engineering
- The algorithm is based on reconstructed Claude Code 2.1.88 source code
- Pet attributes are deterministically generated from userID + salt
- Searching for specific combinations (eye+hat+species) can take a very long time

---

<!-- Chinese Version -->

# Buddy 宠物 userID 暴力搜索工具

一个多线程暴力搜索工具，用于查找能生成具有特定属性的 Claude Code 宠物的 userID。使用 Worker Threads 进行并行搜索，采用优化的加密随机数生成。

## 目录

- [英文文档](#english-documentation)
- [中文文档](#中文文档)
  - [功能特性](#功能特性)
  - [系统要求](#系统要求-1)
  - [安装步骤](#安装步骤)
  - [快速开始](#快速开始-1)
  - [属性参考](#属性参考)
  - [验证工具](#验证工具-1)
  - [工作原理](#工作原理)
  - [性能表现](#性能表现)
  - [如何使用找到的 userID](#如何使用找到的-userid)
  - [故障排除](#故障排除)
  - [文件结构](#文件结构-1)
  - [备注](#备注)

---

## 中文文档

### 功能特性

- **多线程搜索**：充分利用所有 CPU 核心实现最高搜索速度
- **性能优化**：使用 Bun 原生 crypto 进行高性能随机数生成
- **全属性搜索**：支持按稀有度、物种、闪亮、眼睛、帽子和最小属性搜索
- **验证工具**：包含单独的验证工具来确认找到的 userID
- **跨平台支持**：支持 Windows、macOS 和 Linux

### 系统要求

- **操作系统**：Windows 10/11、macOS 10.15+、Linux（glibc 2.28+）
- **运行环境**：[Bun](https://bun.sh/)（版本 1.1.0 或更高）
- **Node.js**：不推荐使用；请使用 Bun 获得更好性能

### 安装步骤

#### 1. 安装 Bun

**Windows (PowerShell)：**
```powershell
iwr https://bun.sh/install.ps1 -useb | iex
```

**macOS/Linux：**
```bash
curl -fsSL https://bun.sh/install | bash
```

**验证安装：**
```bash
bun --version
```

#### 2. 下载或克隆文件

将本项目下载或克隆到本地。

### 快速开始

#### 基础使用

使用默认配置运行脚本（搜索传说级闪亮宠物，DEBUGGING ≥ 100）：

```bash
bun find_buddy_userid_multithread.js
```

#### 命令行选项

```bash
bun find_buddy_userid_multithread.js [选项]
```

**所有可用选项：**

| 选项 | 描述 | 示例 |
|------|------|------|
| `--rarity <稀有度>` | 按稀有度搜索 | `--rarity legendary` |
| `--species <物种>` | 按物种搜索 | `--species cat` |
| `--shiny [true\|false]` | 搜索闪亮宠物（默认：`true`） | `--shiny false` |
| `--eye <符号>` | 按眼睛符号搜索 | `--eye ✦` |
| `--hat <帽子>` | 按帽子搜索 | `--hat crown` |
| `--min-stats <条件>` | 最小属性要求 | `--min-stats "DEBUGGING:80,WISDOM:70"` |
| `--max-iterations <N>` | 最大尝试次数 | `--max-iterations 1000000` |
| `--threads <N>` | Worker 线程数 | `--threads 8` |
| `--help` | 显示帮助信息 | |

#### 配置文件

你也可以编辑 `find_buddy_userid_multithread.js` 顶部的 `CONFIG` 对象：

```javascript
const CONFIG = {
  rarity: 'legendary',
  species: null,
  shiny: true,
  eye: null,
  hat: null,
  minStats: {DEBUGGING: 100}
};
```

### 属性参考

#### 稀有度
- `common` 普通（60% 概率）
- `uncommon` 非凡（25% 概率）
- `rare` 稀有（10% 概率）
- `epic` 史诗（4% 概率）
- `legendary` 传说（1% 概率）

#### 物种
`duck`、`goose`、`blob`、`cat`、`dragon`、`octopus`、`owl`、`penguin`、`turtle`、`snail`、`ghost`、`axolotl`、`capybara`、`cactus`、`robot`、`rabbit`、`mushroom`、`chonk`

#### 眼睛符号
`·`、`✦`、`×`、`◉`、`@`、`°`

#### 帽子
`none`、`crown`、`tophat`、`propeller`、`halo`、`wizard`、`beanie`、`tinyduck`

**注意**：普通稀有度宠物的帽子固定为 `'none'`。

#### 属性
- `DEBUGGING` 调试
- `PATIENCE` 耐心
- `CHAOS` 混沌
- `WISDOM` 智慧
- `SNARK` 讽刺

各稀有度的属性基础值：
- 普通：5
- 非凡：15
- 稀有：25
- 史诗：35
- 传说：50

### 验证工具

找到 userID 后，使用验证工具确认它能生成符合条件的宠物：

```bash
bun verify_buddy.js <userID> [条件]
```

**示例：**
```bash
bun verify_buddy.js 1c63302024b564ac347d8dc2561688659d960e68398188aea7fbe4ff5ebbb81a --rarity legendary --shiny
```

### 工作原理

1. **随机 userID 生成**：生成密码学安全的随机 64 字符 16 进制字符串
2. **确定性宠物生成**：使用 `mulberry32` 伪随机数生成器，种子为 `hash(userID + SALT)`，其中 `SALT = 'friend-2026-401'`
3. **属性生成流水线**：按照 Claude Code 源代码的确切顺序生成属性
4. **条件检查**：逐一检查各属性是否符合搜索条件
5. **验证**：从找到的 userID 重新生成宠物以防止假正例

### 性能表现

- **搜索速度**：每秒约 50-100 万次尝试（取决于 CPU 和条件）
- **传说级闪亮**：约 30-60 秒
- **传说级闪亮特定属性**：约 2-5 分钟
- **性能建议**：
  - 线程数越多越快（建议 CPU 核心数 - 1）
  - 条件越少越快
  - 属性要求越高越慢

### 如何使用找到的 userID

1. 复制找到的 64 字符 16 进制 userID
2. 打开 `~/.claude.json`（Windows 上为 `%USERPROFILE%\.claude.json`）
3. 替换 `userID` 字段的值为新的 userID
4. **重要**：删除整个 `companion` 字段（如果存在）
5. 保存文件并重启 Claude Code
6. 运行 `/buddy` 命令孵化你的新宠物

### 故障排除

#### "Worker threads not working"
- 确保使用 **Bun** 而不是 Node.js
- 算法使用 `Bun.hash()` 在 Node.js 中不可用

#### "Found userID doesn't match conditions"
- 使用验证工具：`bun verify_buddy.js <userID>`
- 确保已删除 `.claude.json` 中的 `companion` 字段

#### "搜索速度很慢"
- 尝试降低属性要求
- 增加线程数：`--threads 16`
- 移除不必要的条件（物种、帽子等）

### 文件结构

- `find_buddy_userid_multithread.js` - 主搜索脚本（使用 Worker Threads）
- `verify_buddy.js` - userID 验证工具
- `crypto_random.c` - 可选 C FFI 库源代码（不推荐）
- `build_crypto.bat` - Windows 构建脚本
- `build_crypto.sh` - Linux/macOS 构建脚本
- `README.md` - 此文件

### 备注

- 本工具仅用于教育和研究目的
- 算法基于反向工程的 Claude Code 2.1.88 源代码
- 宠物属性由 userID + 盐值确定性生成
- 搜索特定组合（眼睛+帽子+物种）可能需要很长时间

---

## 许可证 | License

This project is provided for educational and research purposes only.
本项目仅供教育和研究之用。
