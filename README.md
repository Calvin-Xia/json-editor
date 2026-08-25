# JSON/JSON5 Editor

一个用于可视化编辑 JSON/JSON5 文件的 Windows 桌面应用程序，支持**无损往返编辑**（保留注释、尾随逗号、引号风格）。

## 功能特性

- 📁 **树形导航** - 可视化 JSON 结构，支持展开/折叠
- ✏️ **表单编辑** - 直观的表单界面编辑节点值；Object 新增/删除字段、Array 增/删/上移/下移
- 🔍 **搜索功能** - 支持按键名和值搜索（不区分大小写）
- ↩️ **撤销/重做** - 基于 zundo 的完整撤销/重做（含新建 future 栈自动清空）
- 💾 **保存预览** - 保存前显示路径级变更 + 文本差异
- 📋 **剪贴板粘贴** - 直接粘贴 JSON 内容（焦点在输入框时跳过以避免冲突）
- 🕐 **版本历史** - 每次保存自动快照，最多保留 20 个版本，支持预览/回滚
- 🕘 **最近文件** - Toolbar 下拉打开，跨会话可持久
- 📂 **拖拽打开** - 支持 .json / .json5 文件拖拽
- 🎨 **Raw 预览** - 只读的原始 JSON 内容预览
- 📑 **导出片段** - 选中节点一键复制到剪贴板

## 技术栈

- **运行时**: Electron ^28.0.0
- **UI**: React ^18.2.0, TypeScript ^5.3.0 (strict mode)
- **构建**: Vite ^5.0.0
- **状态管理**: Zustand ^4.4.0
- **解析器**: @croct/json5-parser ^0.2.2 (保留注释)
- **测试**: Vitest ^4.0.18
- **打包**: electron-builder ^24.9.0 (NSIS for Windows)

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 开发模式

启动 Vite 开发服务器 + Electron：

```bash
npm run electron:dev
```

仅启动 Vite 开发服务器（浏览器模式）：

```bash
npm run dev
```

### 构建

构建生产版本：

```bash
npm run build
```

构建并打包为 Windows 安装程序：

```bash
npm run electron:build
```

### 测试

运行所有测试：

```bash
npm run test
```

监听模式运行测试：

```bash
npm run test:watch
```

### 代码质量

类型检查：

```bash
npm run typecheck
```

代码检查：

```bash
npm run lint
```

## 项目结构

```
json-editor/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 应用入口：窗口、菜单、IPC 注册
│   ├── preload.ts               # contextBridge：暴露 electronAPI
│   └── ipc/
│       ├── index.ts             # registerIpcHandlers()
│       └── fileHandlers.ts      # 文件 I/O：打开/保存/自动保存/版本/最近
│
├── src/                         # 渲染进程 (React)
│   ├── types/                   # TypeScript 类型定义
│   │   ├── treeModel.ts         # TreeNode, TreeState, PathSegment
│   │   ├── document.ts          # Document, ParseError, ParseStatus
│   │   └── ipc.ts               # ElectronAPI 接口 + Window 声明
│   ├── store/                   # Zustand 状态管理（仅两个 store）
│   │   ├── documentStore.ts     # 文档状态 + undo/redo（zundo）+ IPC 调用
│   │   └── treeStore.ts         # 树状态：展开/折叠/搜索/选择
│   ├── core/                    # 业务逻辑（框架无关，纯函数）
│   │   ├── parser/              # JSON5 解析/序列化/AST 操作
│   │   ├── treeModel/           # 树转换、路径工具、状态操作
│   │   ├── diff/                # 路径级 + 文本级 diff
│   │   └── validation/          # 空键/重复键检测
│   ├── hooks/                   # React Hooks
│   │   ├── useIPC.ts            # 菜单事件监听（无 IPC 时优雅降级）
│   │   ├── useFileOperations.ts # 文件操作 Hook
│   │   ├── useAutosave.ts       # 5s debounce 自动保存 + 恢复
│   │   └── useClipboardPaste.ts # 全局粘贴处理
│   ├── components/              # React UI 组件
│   │   ├── TreeView/            # 树形导航 + 搜索
│   │   ├── FormEditor/          # 节点信息 + 增删改（object/array/primitive）
│   │   ├── Toolbar/             # 打开/最近/保存/另存为/撤销/重做/版本/设置
│   │   ├── StatusBar/           # 文件路径、编码、修改、解析状态
│   │   ├── RawPreview/          # 只读原始 JSON 预览
│   │   ├── DiffPreview/         # 保存前路径变更 + 文本 diff
│   │   ├── VersionHistory/      # 版本列表、预览、回滚
│   │   ├── RecoveryDialog/      # 崩溃恢复对话框
│   │   ├── DropZone/            # 拖拽打开文件
│   │   └── ParseError/          # 解析错误显示
│   └── styles/                  # CSS 自定义属性 + 全局样式
│
├── scripts/
│   └── lint.mjs                 # 零依赖自定义 linter
│
├── tests/                       # Vitest 测试 (node 环境)
├── JSON-JSON5编辑器PRD.md        # 产品需求文档（中文）
└── package.json
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run electron:dev` | 启动 Electron + Vite 开发模式 |
| `npm run build` | 构建生产版本 |
| `npm run electron:build` | 构建并打包 Electron 应用 |
| `npm run test` | 运行所有测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | 运行 scripts/lint.mjs（零依赖自定义 linter：禁用 any、`src/` 中禁用 console.log） |

## 开发指南

### 代码风格

- **导入**: 使用相对路径，`import type` 分离类型导入
- **组件**: 函数式 `React.FC`，默认导出，提前返回处理加载/错误状态
- **状态管理**: Zustand stores，接口定义在 `create` 调用上方
- **错误处理**: stores 中使用 try/catch + `String(error)`
- **命名**: 组件 PascalCase，hooks camelCase + `use` 前缀，函数 camelCase

### 测试

- **框架**: Vitest（全局启用，但建议显式导入）
- **位置**: `tests/` 目录
- **命名**: `{feature}.test.ts`
- **环境**: node（当前无 DOM 测试）

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../src/core/module';

describe('Feature Name', () => {
  it('should do something specific', () => {
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });
});
```

### Electron IPC

- **安全**: `contextIsolation: true`，`nodeIntegration: false`
- **Preload**: 通过 `contextBridge` 暴露 `window.electronAPI`
- **通道**: `namespace:action` 格式（如 `file:open`、`menu:save`）
- **类型安全**: `ElectronAPI` 接口在 `src/types/ipc.ts`

### 路径系统

- JSON Pointer 风格路径：`/a/b/0/c`（斜杠分隔，整数表示数组索引）
- 特殊字符转义：`~0` 表示 `~`，`~1` 表示 `/`（RFC 6901）
- `TreeNodeCache` 支持 O(1) 路径查找

## 语言

- **UI 文本**: 简体中文 - 所有用户界面文字必须使用中文
- **代码**: 英文 - 变量名、函数名、注释使用英文
- **错误信息**: 中文（如 `'保存失败'`）

## 许可证

MIT License

## 作者

Calvin-Xia
