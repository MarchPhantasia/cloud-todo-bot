# CloudTodo Bot 使用指南

CloudTodo Bot 是一个功能强大的待办事项管理机器人，基于 Telegram 平台，支持丰富的任务管理功能。

## 🚀 主要功能

### 1. 基础任务管理
- 添加任务
- 查看任务列表
- 标记任务完成
- 删除任务
- 编辑任务
- 设置任务优先级
- 设置截止日期
- 添加任务标签

### 2. 高级功能
- 任务搜索
- 任务排序
- 数据导出
- 任务统计
- 批量清理
- 个性化设置

## 📝 命令详解

### 任务管理命令

#### `/add [任务内容]` - 添加新任务
- 支持直接添加截止日期，使用"截止"、"due"、"by"或"until"关键词
- 示例：
  ```
  /add 完成项目报告 截止 下周五
  /add 买牛奶 截止 明天上午10点
  /add 健身 截止 每周三晚上8点
  ```

#### `/list [过滤器]` - 显示任务列表
- 默认显示所有任务
- 支持多种过滤选项：
  ```
  /list today - 显示今日任务
  /list week - 显示本周任务
  /list overdue - 显示逾期任务
  /list completed - 显示已完成任务
  /list pending - 显示待处理任务
  /list tag:标签名 - 按标签筛选
  ```
- 列表会显示：
  - 任务状态（✅完成、⬜待办、⏰逾期）
  - 任务内容
  - 优先级（🔴最高到⚪最低）
  - 截止日期（相对时间）
  - 标签
- 任务自动按以下顺序排序：
  1. 完成状态（未完成优先）
  2. 优先级（高优先级在前）
  3. 截止日期（近期在前）
  4. 创建时间

#### `/done [编号]` - 标记任务完成/未完成
- 示例：`/done 1`
- 再次使用可取消完成状态

#### `/del [编号]` - 删除任务
- 示例：`/del 1`

#### `/edit [编号] [新内容]` - 编辑任务
- 示例：`/edit 1 修改后的任务内容`

#### `/prio [编号] [1-5]` - 设置优先级
- 1：🔴 最高
- 2：🟠 高
- 3：🟡 中
- 4：🟢 低
- 5：⚪ 最低
- 示例：`/prio 1 1`

#### `/due [编号] [时间]` - 设置截止日期
- 支持多种时间格式：
  ```
  /due 1 明天
  /due 2 下周五
  /due 3 3月1日
  /due 4 2024-03-01
  /due 5 后天下午3点
  ```

#### `/tag [编号] [标签]` - 设置标签
- 支持多个标签，用空格或逗号分隔
- 示例：
  ```
  /tag 1 工作 重要
  /tag 2 个人,购物
  ```

### 高级功能命令

#### `/search [关键词]` - 搜索任务
- 搜索任务内容和标签
- 示例：`/search 项目`

#### `/sort [类型]` - 排序任务
- 支持的排序类型：
  - `priority`: 按优先级排序
  - `due`: 按截止日期排序
  - `created`: 按创建时间排序
- 示例：`/sort priority`

#### `/clear [类型]` - 批量清理任务
- 支持的清理类型：
  - `all`: 清除所有任务
  - `completed`: 清除已完成任务
  - `overdue`: 清除已逾期任务
- 示例：`/clear completed`

#### `/stats` - 查看任务统计
- 显示总任务数
- 已完成任务数及完成率
- 待处理任务数
- 逾期任务数

#### `/export` - 导出任务数据
- 导出所有任务和设置为JSON文件

#### `/settings [设置项] [值]` - 个性化设置
- 可配置项：
  - `timezone`: 时区设置
  - `reminderTime`: 提醒时间
  - `language`: 界面语言
  - `defaultPriority`: 默认优先级
  - `defaultTags`: 默认标签
  - `notificationEnabled`: 是否启用通知
- 示例：
  ```
  /settings timezone Asia/Shanghai
  /settings reminderTime 09:00
  /settings defaultPriority 3
  ```

### 时间格式支持

支持多种灵活的时间表达方式：

1. 相对时间：
   - 今天、明天、后天
   - X天后
   - 下周

2. 星期描述：
   - 周一、周二...周日
   - 星期一、星期二...星期日
   - 本周X、下周X

3. 具体日期：
   - X月X日
   - YYYY-MM-DD
   - MM-DD

4. 时间点：
   - 上午X点
   - 下午X点
   - XX:XX

## 🎯 使用技巧

1. **优先级管理**
   - 使用优先级功能对任务进行分类
   - 高优先级任务会在列表中置顶显示

2. **标签组织**
   - 使用标签对任务进行分类
   - 可以通过标签快速筛选相关任务

3. **截止日期设置**
   - 为重要任务设置合理的截止日期
   - 使用灵活的时间表达方式

4. **定期整理**
   - 使用 `/clear completed` 清理已完成任务
   - 使用 `/stats` 查看任务完成情况

## 🔧 配置建议

1. **时区设置**
   ```
   /settings timezone Asia/Shanghai
   ```

2. **默认优先级**
   ```
   /settings defaultPriority 3
   ```

3. **提醒时间**
   ```
   /settings reminderTime 09:00
   ```

## 📌 注意事项

1. **任务编号与排序**
   - 任务编号是基于当前显示的列表顺序，而非存储顺序
   - 每次使用 `/list` 命令后，系统会记录当前显示的编号映射
   - 修改优先级或截止日期后，建议重新使用 `/list` 查看最新编号
   - 所有操作都基于最近一次 `/list` 显示的编号

2. **数据导出**
   - 导出数据建议定期进行，以防数据丢失
   - 导出的JSON文件可用于备份和迁移

3. **时间设置**
   - 设置截止日期时，如果没有指定具体时间，将默认为当天结束时间（23:59:59）
   - 时间解析基于您设置的时区

## 🆘 常见问题

1. **任务显示顺序异常**
   - 使用 `/sort` 命令重新排序
   - 检查任务优先级设置

2. **时间设置无效**
   - 确认时间格式是否正确
   - 检查时区设置是否正确

3. **找不到特定任务**
   - 使用 `/search` 命令搜索
   - 检查任务是否已被清理

## 🛠️ 部署指南

### 前置要求

- Cloudflare 账号
- Telegram 账号
- 一个科学工具（仅设置阶段需要，用于访问 Worker 默认域名）
- 一个Cloudflare KV 数据库，命名为 `TODO_STORE`
### 1. 获取 Telegram UID

您需要知道自己的 Telegram 用户 ID (UID)，这是一串数字，用于将消息转发给您。

您可以通过以下方式获取：
- 向 [@userinfobot](https://t.me/userinfobot) 发送任意消息，它会告诉您自己的 UID

请记下您的数字 ID（例如：`123456789`）。

### 2. 创建 Telegram Bot

1. 在 Telegram 中搜索并打开 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 命令
3. 按照提示设置您的机器人名称和用户名（用户名必须以 `bot` 结尾）
4. 成功后，BotFather 会发给您一个 Bot API Token（格式类似：`000000000:ABCDEFGhijklmnopqrstuvwxyz`）
5. 请安全保存这个 Bot API Token

### 3. 部署机器人

#### 方法一：使用 Wrangler CLI

1. 确保安装了 Node.js 和 npm
2. 克隆本仓库：
   ```bash
   git clone https://github.com/your-username/cloud-todo-bot.git
   cd cloud-todo-bot
   ```
3. 安装依赖：
   ```bash
   npm install -g wrangler
   ```
4. 填写 toml 配置文件,先去面板创建一个KV数据库
   ```bash
   kv_namespaces = [
      { binding = "TODO_STORE", id = "YOUR_KV_DATABASE_ID" }
   ]
   ```
5. 部署 Worker：
   ```bash
   wrangler deploy
   ```

#### 方法二：通过 Cloudflare Dashboard 手动部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 导航到 **Workers & Pages** 页面
3. 点击 **Create Worker**
4. 删除默认代码，粘贴本项目的 `src/worker.js` 代码
5. 点击 **Save and Deploy**
6. 在 Worker 设置中添加环境变量：
   - `PREFIX`（例如：`todo`）
   - `SECRET_TOKEN`（必须包含大小写字母和数字，长度至少16位）
   - 在`settings` -> `绑定` 中添加 `KV 命名空间`，使用命名的`TODO_STORE`

### 3.1 (可选) 绑定自定义域名 🌐

为您的 Worker 绑定自定义域名可以避免使用科学工具访问，更加便捷！

1. 在 Cloudflare 仪表板中添加您的域名
2. 在 Workers & Pages 部分，选择您的 worker
3. 点击 **Triggers**，然后点击 **Add Custom Domain**
4. 按照说明将您的域名绑定到 Worker

绑定后，您可以使用类似 `https://your-domain.com/YOUR_PREFIX/install/...` 的地址来注册/卸载机器人，无需科学工具。

### 4. 注册您的 Telegram Bot

部署 Worker 后，您将获得一个 URL，形如：
- GitHub 集成：`https://your-project-name.username.workers.dev`
- Wrangler/Dashboard：`https://your-worker-name.your-subdomain.workers.dev`

现在您需要注册您的 Bot：

> ⚠️ 由于 Cloudflare Workers 默认域名在中国大陆访问受限，此步骤可能需要科学上网。如果您已绑定自定义域名，可以直接使用您的域名进行访问。

1. 在浏览器中访问以下 URL 来注册您的 Bot（替换相应参数）：

```
https://your-worker-url/YOUR_PREFIX/install/YOUR_TELEGRAM_UID/BOT_API_TOKEN
```

例如：
```
https://cloud-todo-bot.username.workers.dev/todo/install/123456789/000000000:ABCDEFGhijklmnopqrstuvwxyz
```

2. 如果看到成功消息，说明您的 Bot 已经注册成功

> 📝 一个 Worker 实例可以注册多个不同的 Bot！只需重复上述注册步骤，使用不同的 Bot API Token 即可。

## 🔒 安全说明

- 请妥善保管您的 Bot API Token 和安全令牌（Secret Token），这些信息关系到您服务的安全性。
- **请勿随意更改已设置的 Secret Token！** 更改后，所有已注册的机器人将无法正常工作，因为无法匹配原来的令牌。如需更改，所有机器人都需要重新注册。
- 在初始设置时选择一个安全且便于记忆的 Secret Token
- 避免使用简单或常见的前缀名称
- 不要将敏感信息分享给他人

## ⚠️ 使用限制

Cloudflare Worker 免费套餐有每日 10 万请求的限制。

对于个人使用的待办事项机器人来说，这个限制通常足够宽松。除非您的任务管理极其频繁，否则不太可能达到这个限制。

如果您预计使用量较大，可以考虑升级到 Cloudflare 的付费计划。

## 🔍 常见故障排除

- **消息未转发**: 确保 Bot 已正确注册，并检查 Worker 日志
- **无法访问注册 URL**: 确认您是否使用了科学上网工具，或者考虑绑定自定义域名解决访问问题
- **回复消息失败**: 检查您是否正确使用 Telegram 的回复功能
- **注册失败**: 确保您的 `SECRET_TOKEN` 符合要求（包含大小写字母和数字，长度至少16位）
- **任务命令无法识别**: 确认命令格式是否正确，检查是否遗漏了必要参数

## 🔄 更新日志

### v1.0.0
- 基础任务管理功能
- 高级搜索和排序
- 个性化设置支持
- 数据导出功能