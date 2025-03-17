// CloudTodo Bot Worker

const CONFIG = {
    prefix: 'todo',
    secretToken: '', // 请更改为安全的令牌
    defaultSettings: {
        timezone: 'Asia/Shanghai',
        reminderTime: '09:00',
        language: 'zh-CN',
        defaultPriority: 3,
        defaultTags: [],
        notificationEnabled: true
    },
    priorities: {
        1: '🔴 最高',
        2: '🟠 高',
        3: '🟡 中',
        4: '🟢 低',
        5: '⚪ 最低'
    },
    // 添加任务索引映射存储
    taskIndexMap: {}
};

// KV绑定名称
// 在Cloudflare Worker设置中需要创建名为TODO_STORE的KV命名空间
// const TODO_STORE = TODO_STORE; // 这会自动绑定

// 命令正则表达式
const COMMANDS = {
    ADD: /^\/add(?:\s+(.+))?$/i,
    LIST: /^\/list(?:\s+(.+))?$/i,
    DONE: /^\/done(?:\s+(\d+))$/i,
    DELETE: /^\/del(?:\s+(\d+))$/i,
    EDIT: /^\/edit(?:\s+(\d+)\s+(.+))$/i,
    PRIO: /^\/prio(?:\s+(\d+)\s+([1-5]))$/i,
    DUE: /^\/due(?:\s+(\d+)\s+(.+))$/i,
    TAG: /^\/tag(?:\s+(\d+)\s+(.+))$/i,
    HELP: /^\/help$/i,
    START: /^\/start$/i,
    STATS: /^\/stats$/i,
    SETTINGS: /^\/settings(?:\s+(\w+)(?:\s+(.+))?)?$/i,
    SEARCH: /^\/search\s+(.+)$/i,
    REMIND: /^\/remind(?:\s+(\d+)\s+(.+))$/i,
    CLEAR: /^\/clear(?:\s+(all|completed|overdue))?$/i,
    EXPORT: /^\/export$/i,
    SORT: /^\/sort(?:\s+(priority|due|created))?$/i
};

// 路由模式
const INSTALL_PATTERN = new RegExp(`^/${CONFIG.prefix}/install/([^/]+)/([^/]+)$`);
const WEBHOOK_PATTERN = new RegExp(`^/${CONFIG.prefix}/webhook/([^/]+)/([^/]+)$`);

// 数据操作函数
async function getUserTasks(userId) {
    const data = await TODO_STORE.get(`user:${userId}`);
    return data ? JSON.parse(data) : { tasks: [], settings: { timezone: "UTC" } };
}

async function saveUserTasks(userId, userData) {
    await TODO_STORE.put(`user:${userId}`, JSON.stringify(userData));
}

// 命令处理函数
async function handleCommand(command, message, botToken) {
    const userId = message.from.id.toString();
    const chatId = message.chat.id;
    let responseText = '';
    
    // 获取用户数据
    const userData = await getUserTasks(userId);
    
    try {
        // 处理添加任务命令
        if (COMMANDS.ADD.test(command)) {
            const match = command.match(COMMANDS.ADD);
            if (!match[1]) {
                responseText = "请提供任务内容，例如：/add 完成报告 截止周五";
            } else {
                const content = match[1].trim();
                const taskId = Date.now().toString();
                
                // 解析日期（简单示例）
                let dueDate = null;
                const dueDateMatch = content.match(/(截止|due|by|until)\s+(.+?)$/i);
                if (dueDateMatch) {
                    dueDate = parseDateFromText(dueDateMatch[2]);
                }
                
                // 创建新任务
                const newTask = {
                    id: taskId,
                    content: dueDateMatch ? content.replace(dueDateMatch[0], '').trim() : content,
                    completed: false,
                    priority: 3, // 默认中等优先级
                    created: new Date().toISOString(),
                    dueDate: dueDate ? dueDate.toISOString() : null,
                    tags: []
                };
                
                userData.tasks.push(newTask);
                await saveUserTasks(userId, userData);
                
                responseText = `✅ 已添加任务：${newTask.content}`;
                if (dueDate) {
                    responseText += `\n📅 截止日期：${formatDate(dueDate)}`;
                }
            }
        }
        
        // 处理列表命令
        else if (COMMANDS.LIST.test(command)) {
            const match = command.match(COMMANDS.LIST);
            const filter = match[1]?.trim().toLowerCase();
            
            if (userData.tasks.length === 0) {
                responseText = "📋 您的待办列表是空的";
            } else {
                let tasks = [...userData.tasks];
                
                // 应用过滤器
                if (filter) {
                    if (filter === 'today') {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        
                        tasks = tasks.filter(t => {
                            if (!t.dueDate) return false;
                            const dueDate = new Date(t.dueDate);
                            return dueDate >= today && dueDate < tomorrow;
                        });
                    } else if (filter === 'week') {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const nextWeek = new Date(today);
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        
                        tasks = tasks.filter(t => {
                            if (!t.dueDate) return false;
                            const dueDate = new Date(t.dueDate);
                            return dueDate >= today && dueDate < nextWeek;
                        });
                    } else if (filter === 'overdue') {
                        const now = new Date();
                        tasks = tasks.filter(t => 
                            !t.completed && t.dueDate && new Date(t.dueDate) < now
                        );
                    } else if (filter === 'completed') {
                        tasks = tasks.filter(t => t.completed);
                    } else if (filter === 'pending') {
                        tasks = tasks.filter(t => !t.completed);
                    } else if (filter.startsWith('tag:')) {
                        const tag = filter.slice(4);
                        tasks = tasks.filter(t => 
                            t.tags.some(taskTag => taskTag.toLowerCase().includes(tag))
                        );
                    }
                }
                
                // 按优先级和截止日期排序
                tasks.sort((a, b) => {
                    // 首先按完成状态排序
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    // 然后按优先级
                    if (a.priority !== b.priority) {
                        return a.priority - b.priority;
                    }
                    // 最后按截止日期
                    if (a.dueDate && b.dueDate) {
                        return new Date(a.dueDate) - new Date(b.dueDate);
                    }
                    // 有截止日期的排在前面
                    if (a.dueDate) return -1;
                    if (b.dueDate) return 1;
                    // 最后按创建时间
                    return new Date(a.created) - new Date(b.created);
                });
                
                // 生成列表标题
                let title = "📋 待办列表";
                if (filter) {
                    const filterTitles = {
                        'today': '今日任务',
                        'week': '本周任务',
                        'overdue': '逾期任务',
                        'completed': '已完成任务',
                        'pending': '待处理任务'
                    };
                    title += ` - ${filterTitles[filter] || filter}`;
                }
                
                responseText = `${title}\n\n`;
                
                // 添加任务统计
                const stats = {
                    total: tasks.length,
                    completed: tasks.filter(t => t.completed).length,
                    overdue: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length
                };
                
                responseText += `📊 统计：共 ${stats.total} 个任务`;
                if (stats.completed > 0) responseText += `，已完成 ${stats.completed} 个`;
                if (stats.overdue > 0) responseText += `，逾期 ${stats.overdue} 个`;
                responseText += '\n\n';
                
                // 显示任务列表并创建索引映射
                if (tasks.length === 0) {
                    responseText += "没有符合条件的任务";
                } else {
                    // 创建一个新的索引映射
                    const indexMap = {};
                    
                    tasks.forEach((task, displayIndex) => {
                        // 找到任务在原始数组中的索引
                        const originalIndex = userData.tasks.findIndex(t => t.id === task.id);
                        // 存储显示索引到原始索引的映射
                        indexMap[displayIndex + 1] = originalIndex;
                        
                        responseText += formatTask(task, displayIndex);
                    });
                    
                    // 保存索引映射到用户数据中
                    userData.indexMap = indexMap;
                    await saveUserTasks(userId, userData);
                    
                    // 添加过滤器提示
                    responseText += "\n💡 过滤选项：\n" +
                        "/list today - 显示今日任务\n" +
                        "/list week - 显示本周任务\n" +
                        "/list overdue - 显示逾期任务\n" +
                        "/list completed - 显示已完成任务\n" +
                        "/list pending - 显示待处理任务\n" +
                        "/list tag:标签名 - 按标签筛选";
                }
            }
        }
        
        // 处理完成任务命令
        else if (COMMANDS.DONE.test(command)) {
            const match = command.match(COMMANDS.DONE);
            const displayIndex = parseInt(match[1]);
            
            // 使用索引映射获取实际索引
            const actualIndex = userData.indexMap ? userData.indexMap[displayIndex] : displayIndex - 1;
            
            if (actualIndex !== undefined && actualIndex >= 0 && actualIndex < userData.tasks.length) {
                userData.tasks[actualIndex].completed = !userData.tasks[actualIndex].completed;
                const status = userData.tasks[actualIndex].completed ? "已完成" : "标记为未完成";
                await saveUserTasks(userId, userData);
                responseText = `✅ 任务 "${userData.tasks[actualIndex].content}" ${status}`;
            } else {
                responseText = "❌ 任务编号无效，请先使用 /list 查看最新任务列表";
            }
        }
        
        // 处理删除任务命令
        else if (COMMANDS.DELETE.test(command)) {
            const match = command.match(COMMANDS.DELETE);
            const displayIndex = parseInt(match[1]);
            
            // 使用索引映射获取实际索引
            const actualIndex = userData.indexMap ? userData.indexMap[displayIndex] : displayIndex - 1;
            
            if (actualIndex !== undefined && actualIndex >= 0 && actualIndex < userData.tasks.length) {
                const deletedTask = userData.tasks.splice(actualIndex, 1)[0];
                // 删除后索引映射需要更新，最简单的方法是清除它
                userData.indexMap = {};
                await saveUserTasks(userId, userData);
                responseText = `🗑️ 已删除任务：${deletedTask.content}\n提示：任务编号可能已变更，请使用 /list 查看最新列表`;
            } else {
                responseText = "❌ 任务编号无效，请先使用 /list 查看最新任务列表";
            }
        }
        
        // 处理编辑任务命令
        else if (COMMANDS.EDIT.test(command)) {
            const match = command.match(COMMANDS.EDIT);
            const displayIndex = parseInt(match[1]);
            const newContent = match[2].trim();
            
            // 使用索引映射获取实际索引
            const actualIndex = userData.indexMap ? userData.indexMap[displayIndex] : displayIndex - 1;
            
            if (actualIndex !== undefined && actualIndex >= 0 && actualIndex < userData.tasks.length) {
                userData.tasks[actualIndex].content = newContent;
                await saveUserTasks(userId, userData);
                responseText = `✏️ 已更新任务内容：${newContent}`;
            } else {
                responseText = "❌ 任务编号无效，请先使用 /list 查看最新任务列表";
            }
        }
        
        // 处理优先级设置命令
        else if (COMMANDS.PRIO.test(command)) {
            const match = command.match(COMMANDS.PRIO);
            const displayIndex = parseInt(match[1]);
            const priority = parseInt(match[2]);
            
            // 使用索引映射获取实际索引
            const actualIndex = userData.indexMap ? userData.indexMap[displayIndex] : displayIndex - 1;
            
            if (actualIndex !== undefined && actualIndex >= 0 && actualIndex < userData.tasks.length) {
                userData.tasks[actualIndex].priority = priority;
                await saveUserTasks(userId, userData);
                responseText = `⭐ 任务 "${userData.tasks[actualIndex].content}" 优先级已设为 ${getPriorityIcon(priority)}\n提示：优先级变更可能导致任务顺序变化，请使用 /list 查看最新列表`;
            } else {
                responseText = "❌ 任务编号无效，请先使用 /list 查看最新任务列表";
            }
        }
        
        // 处理截止日期设置命令
        else if (COMMANDS.DUE.test(command)) {
            const match = command.match(COMMANDS.DUE);
            const displayIndex = parseInt(match[1]);
            const dateText = match[2].trim();
            
            // 使用索引映射获取实际索引
            const actualIndex = userData.indexMap ? userData.indexMap[displayIndex] : displayIndex - 1;
            
            if (actualIndex !== undefined && actualIndex >= 0 && actualIndex < userData.tasks.length) {
                const parsedDate = parseDateFromText(dateText);
                if (parsedDate) {
                    userData.tasks[actualIndex].dueDate = parsedDate.toISOString();
                    await saveUserTasks(userId, userData);
                    responseText = `📅 任务 "${userData.tasks[actualIndex].content}" 截止日期已设为 ${formatDate(parsedDate)}\n提示：截止日期变更可能导致任务顺序变化，请使用 /list 查看最新列表`;
                } else {
                    responseText = "❌ 无法识别日期格式，请尝试其他表达方式";
                }
            } else {
                responseText = "❌ 任务编号无效，请先使用 /list 查看最新任务列表";
            }
        }
        
        // 处理标签设置命令
        else if (COMMANDS.TAG.test(command)) {
            const match = command.match(COMMANDS.TAG);
            const displayIndex = parseInt(match[1]);
            const tagText = match[2].trim();
            
            // 使用索引映射获取实际索引
            const actualIndex = userData.indexMap ? userData.indexMap[displayIndex] : displayIndex - 1;
            
            if (actualIndex !== undefined && actualIndex >= 0 && actualIndex < userData.tasks.length) {
                // 解析标签（支持多个标签，以逗号或空格分隔）
                const tags = tagText.split(/[,\s]+/).filter(t => t.length > 0);
                
                if (tags.length > 0) {
                    userData.tasks[actualIndex].tags = tags;
                    await saveUserTasks(userId, userData);
                    responseText = `🏷️ 任务 "${userData.tasks[actualIndex].content}" 已添加标签：${tags.join(', ')}`;
                } else {
                    // 清空标签
                    userData.tasks[actualIndex].tags = [];
                    await saveUserTasks(userId, userData);
                    responseText = `🏷️ 已清除任务 "${userData.tasks[actualIndex].content}" 的所有标签`;
                }
            } else {
                responseText = "❌ 任务编号无效，请先使用 /list 查看最新任务列表";
            }
        }
        
        // 处理帮助命令
        else if (COMMANDS.HELP.test(command) || COMMANDS.START.test(command)) {
            responseText = "🤖 **CloudTodo Bot 使用指南**\n\n" +
                "📝 **基础任务管理**\n" +
                "/add [内容] - 添加新任务（例如：/add 完成报告 截止 明天下午3点）\n" +
                "/list - 显示任务列表\n" +
                "/done [编号] - 标记任务完成/取消完成\n" +
                "/del [编号] - 删除任务\n" +
                "/edit [编号] [新内容] - 编辑任务\n" +
                "/prio [编号] [1-5] - 设置优先级（1最高-5最低）\n" +
                "/due [编号] [时间] - 设置截止日期\n" +
                "/tag [编号] [标签] - 设置标签\n\n" +
                "🔍 **高级功能**\n" +
                "/search [关键词] - 搜索任务\n" +
                "/sort [类型] - 排序（priority/due/created）\n" +
                "/clear [类型] - 清理任务（all/completed/overdue）\n" +
                "/stats - 查看统计信息\n" +
                "/export - 导出任务数据\n\n" +
                "⚙️ **设置**\n" +
                "/settings timezone [时区] - 设置时区\n" +
                "/settings reminderTime [时间] - 设置提醒时间\n" +
                "/settings defaultPriority [1-5] - 设置默认优先级\n" +
                "/settings notificationEnabled [true/false] - 开关通知\n\n" +
                "💡 **使用提示**\n" +
                "• 添加任务时可直接设置截止日期：'截止'、'due'、'by'、'until'\n" +
                "• 支持多种时间格式：今天、明天、后天、下周五、3月1日等\n" +
                "• 标签可用空格或逗号分隔\n" +
                "• 使用 /list 查看最新任务编号\n";
        }
        
        // 处理统计命令
        else if (COMMANDS.STATS.test(command)) {
            const total = userData.tasks.length;
            const completed = userData.tasks.filter(t => t.completed).length;
            const pending = total - completed;
            
            // 计算逾期任务
            const now = new Date();
            const overdue = userData.tasks.filter(t => 
                !t.completed && t.dueDate && new Date(t.dueDate) < now
            ).length;
            
            const completionRate = total ? Math.round((completed / total) * 100) : 0;
            
            responseText = "📊 **任务统计**\n\n" +
                `总任务数：${total}\n` +
                `已完成：${completed} (${completionRate}%)\n` +
                `待处理：${pending}\n` +
                `逾期：${overdue}`;
        }
        
        // 处理设置命令
        else if (COMMANDS.SETTINGS.test(command)) {
            const match = command.match(COMMANDS.SETTINGS);
            const setting = match[1]?.trim();
            const value = match[2]?.trim();
            
            if (setting && value) {
                if (setting === 'timezone') {
                    userData.settings.timezone = value;
                } else if (setting === 'reminderTime') {
                    userData.settings.reminderTime = value;
                } else if (setting === 'language') {
                    userData.settings.language = value;
                } else if (setting === 'defaultPriority') {
                    userData.settings.defaultPriority = parseInt(value);
                } else if (setting === 'defaultTags') {
                    userData.settings.defaultTags = value.split(/[,\s]+/).filter(t => t.length > 0);
                } else if (setting === 'notificationEnabled') {
                    userData.settings.notificationEnabled = value === 'true';
                }
                await saveUserTasks(userId, userData);
                responseText = `✅ 设置 "${setting}" 已更新为 ${value}`;
            } else {
                responseText = "❌ 设置格式无效，请使用 /settings <setting> <value>";
            }
        }
        
        // 处理搜索命令
        else if (COMMANDS.SEARCH.test(command)) {
            const match = command.match(COMMANDS.SEARCH);
            const query = match[1].trim();
            
            const results = userData.tasks.filter(t => 
                t.content.toLowerCase().includes(query.toLowerCase()) ||
                t.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            );
            
            if (results.length === 0) {
                responseText = "🔍 没有找到匹配的任务";
            } else {
                responseText = "🔍 搜索结果：\n\n";
                results.forEach((task, index) => {
                    const status = task.completed ? "✅" : "⬜";
                    const priority = "⭐".repeat(task.priority);
                    const dueInfo = task.dueDate ? `\n   📅 ${formatDate(new Date(task.dueDate))}` : '';
                    const tags = task.tags.length > 0 ? `\n   🏷️ ${task.tags.join(', ')}` : '';
                    
                    responseText += `${index + 1}. ${status} ${task.content} ${priority}${dueInfo}${tags}\n\n`;
                });
            }
        }
        
        // 处理提醒命令
        else if (COMMANDS.REMIND.test(command)) {
            const match = command.match(COMMANDS.REMIND);
            const displayIndex = parseInt(match[1]);
            const reminderText = match[2].trim();
            
            // 使用索引映射获取实际索引
            const actualIndex = userData.indexMap ? userData.indexMap[displayIndex] : displayIndex - 1;
            
            if (actualIndex !== undefined && actualIndex >= 0 && actualIndex < userData.tasks.length) {
                const task = userData.tasks[actualIndex];
                
                // 解析提醒时间
                let reminderTime = null;
                const timeMatch = reminderText.match(/(\d+)\s*(分钟|小时|天)前/);
                if (timeMatch) {
                    const [_, amount, unit] = timeMatch;
                    const dueDate = new Date(task.dueDate);
                    
                    if (unit === '分钟') {
                        reminderTime = new Date(dueDate.getTime() - amount * 60000);
                    } else if (unit === '小时') {
                        reminderTime = new Date(dueDate.getTime() - amount * 3600000);
                    } else if (unit === '天') {
                        reminderTime = new Date(dueDate.getTime() - amount * 86400000);
                    }
                    
                    // 更新任务的提醒设置
                    task.reminder = {
                        time: reminderTime.toISOString(),
                        message: reminderText.replace(timeMatch[0], '').trim() || `提醒：${task.content} 即将到期`,
                        sent: false
                    };
                    
                    await saveUserTasks(userId, userData);
                    responseText = `⏰ 已为任务 "${task.content}" 设置提醒：\n` +
                        `将在 ${formatDate(reminderTime)} 提醒`;
                } else {
                    responseText = "❌ 提醒时间格式无效，请使用\"X分钟前\"、\"X小时前\"或\"X天前\"的格式";
                }
            } else {
                responseText = "❌ 任务编号无效，请先使用 /list 查看最新任务列表";
            }
        }
        
        // 处理清除命令
        else if (COMMANDS.CLEAR.test(command)) {
            const match = command.match(COMMANDS.CLEAR);
            const type = match[1]?.trim();
            
            if (type === 'all') {
                userData.tasks = [];
                await saveUserTasks(userId, userData);
                responseText = "✅ 已清除所有任务和提醒";
            } else if (type === 'completed') {
                userData.tasks = userData.tasks.filter(t => !t.completed);
                await saveUserTasks(userId, userData);
                responseText = "✅ 已清除所有已完成任务";
            } else if (type === 'overdue') {
                const now = new Date();
                userData.tasks = userData.tasks.filter(t => !t.completed && (!t.dueDate || new Date(t.dueDate) > now));
                await saveUserTasks(userId, userData);
                responseText = "✅ 已清除所有未逾期任务";
            } else {
                responseText = "❌ 清除类型无效，请使用 /clear <all|completed|overdue>";
            }
        }
        
        // 处理导出命令
        else if (COMMANDS.EXPORT.test(command)) {
            const exportedData = {
                tasks: userData.tasks,
                settings: userData.settings
            };
            const json = JSON.stringify(exportedData);
            const blob = new Blob([json], {type: 'application/json'});
            const fileName = `CloudTodo_${userId}_${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')}.json`;
            
            const response = new Response(blob, {
                headers: {
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                    'Content-Type': 'application/json'
                }
            });
            return response;
        }
        
        // 处理排序命令
        else if (COMMANDS.SORT.test(command)) {
            const match = command.match(COMMANDS.SORT);
            const type = match[1]?.trim();
            
            if (type === 'priority') {
                userData.tasks.sort((a, b) => a.priority - b.priority);
            } else if (type === 'due') {
                userData.tasks.sort((a, b) => 
                    (a.dueDate && b.dueDate ? new Date(a.dueDate) - new Date(b.dueDate) : 0)
                );
            } else if (type === 'created') {
                userData.tasks.sort((a, b) => new Date(a.created) - new Date(b.created));
            }
            await saveUserTasks(userId, userData);
            responseText = "✅ 任务已按指定顺序排序";
        }
        
        // 未知命令
        else {
            responseText = "❓ 未识别的命令，请使用 /help 查看帮助";
        }
    } catch (error) {
        console.error("命令处理错误:", error);
        responseText = "❌ 处理命令时出错，请稍后再试";
    }
    
    // 发送响应
    return await postToTelegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown'
    });
}

// 改进的日期解析函数
function parseDateFromText(text) {
    // 支持更多中文日期格式
    const patterns = {
        today: /今天|today/i,
        tomorrow: /明天|tomorrow/i,
        dayAfterTomorrow: /后天/,
        nextWeek: /下周|next week/i,
        weekday: /周([一二三四五六日天])|星期([一二三四五六日天])/i,
        specificDate: /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})|(\d{1,2}[-\/]\d{1,2})/,
        relativeDay: /(\d+)天后/,
        monthDay: /(\d{1,2})月(\d{1,2})日?/,
        timeOfDay: /(\d{1,2})[:\s](\d{2})/
    };

    let targetDate = new Date();
    let hasTime = false;
    
    // 提取时间部分
    const timeMatch = text.match(patterns.timeOfDay);
    if (timeMatch) {
        const [_, hours, minutes] = timeMatch;
        targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        hasTime = true;
    }

    // 处理日期部分
    if (patterns.today.test(text)) {
        // 保持当前日期
    } else if (patterns.tomorrow.test(text)) {
        targetDate.setDate(targetDate.getDate() + 1);
    } else if (patterns.dayAfterTomorrow.test(text)) {
        targetDate.setDate(targetDate.getDate() + 2);
    } else if (patterns.nextWeek.test(text)) {
        targetDate.setDate(targetDate.getDate() + 7);
    } else if (patterns.weekday.test(text)) {
        const match = text.match(patterns.weekday);
        const dayChar = match[1] || match[2];
        const dayMap = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0};
        const targetDay = dayMap[dayChar];
        
        let daysToAdd = targetDay - targetDate.getDay();
        if (daysToAdd <= 0) daysToAdd += 7;
        targetDate.setDate(targetDate.getDate() + daysToAdd);
    } else if (patterns.relativeDay.test(text)) {
        const match = text.match(patterns.relativeDay);
        const days = parseInt(match[1]);
        targetDate.setDate(targetDate.getDate() + days);
    } else if (patterns.monthDay.test(text)) {
        const match = text.match(patterns.monthDay);
        const [_, month, day] = match;
        targetDate.setMonth(parseInt(month) - 1, parseInt(day));
        
        // 如果设置的日期已经过去，则设为明年
        if (targetDate < new Date()) {
            targetDate.setFullYear(targetDate.getFullYear() + 1);
        }
    } else if (patterns.specificDate.test(text)) {
        const match = text.match(patterns.specificDate);
        const dateStr = match[0];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
            targetDate = parsedDate;
        }
    }

    // 如果没有指定时间，默认设置为当天结束
    if (!hasTime) {
        targetDate.setHours(23, 59, 59, 999);
    }

    return targetDate;
}

// 改进的日期格式化函数
function formatDate(date, format = 'full') {
    const options = {
        full: {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },
        date: {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        },
        time: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },
        relative: {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        }
    };

    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

    // 相对时间描述
    if (format === 'relative') {
        if (daysDiff === 0) return '今天';
        if (daysDiff === 1) return '明天';
        if (daysDiff === 2) return '后天';
        if (daysDiff > 2 && daysDiff < 7) return `本周${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`;
        if (daysDiff >= 7 && daysDiff < 14) return `下周${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`;
    }

    return date.toLocaleString('zh-CN', options[format] || options.full);
}

// 任务优先级处理函数
function getPriorityIcon(priority) {
    return CONFIG.priorities[priority] || CONFIG.priorities[3];
}

// 任务状态处理函数
function getTaskStatus(task) {
    if (task.completed) return '✅';
    if (task.dueDate && new Date(task.dueDate) < new Date()) return '⏰';
    return '⬜';
}

// 格式化任务显示
function formatTask(task, index) {
    const status = getTaskStatus(task);
    const priority = getPriorityIcon(task.priority);
    const dueInfo = task.dueDate ? `\n   📅 ${formatDate(new Date(task.dueDate), 'relative')}` : '';
    const tags = task.tags.length > 0 ? `\n   🏷️ ${task.tags.join(', ')}` : '';
    
    return `${index + 1}. ${status} ${task.content} ${priority}${dueInfo}${tags}\n`;
}

// API调用函数
async function postToTelegramApi(token, method, body) {
    return fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
}

// 添加提醒检查函数
async function checkReminders(userId, userData, botToken) {
    const now = new Date();
    let hasChanges = false;
    
    for (const task of userData.tasks) {
        if (task.reminder && !task.reminder.sent && new Date(task.reminder.time) <= now) {
            // 发送提醒
            await postToTelegramApi(botToken, 'sendMessage', {
                chat_id: userId,
                text: `🔔 **提醒**\n${task.reminder.message}\n\n` +
                    `任务：${task.content}\n` +
                    `截止时间：${formatDate(new Date(task.dueDate))}`,
                parse_mode: 'Markdown'
            });
            
            // 标记提醒已发送
            task.reminder.sent = true;
            hasChanges = true;
        }
    }
    
    if (hasChanges) {
        await saveUserTasks(userId, userData);
    }
}

// Webhook处理
async function handleWebhook(request, ownerUid, botToken) {
    // 验证密钥
    if (CONFIG.secretToken !== request.headers.get('X-Telegram-Bot-Api-Secret-Token')) {
        return new Response('Unauthorized', {status: 401});
    }

    const update = await request.json();
    if (!update.message) {
        return new Response('OK');
    }

    const message = update.message;
    
    // 忽略非文本消息
    if (!message.text) {
        return new Response('OK');
    }
    
    // 获取用户数据并检查提醒
    const userId = message.from.id.toString();
    const userData = await getUserTasks(userId);
    await checkReminders(userId, userData, botToken);
    
    // 处理命令
    await handleCommand(message.text, message, botToken);
    return new Response('OK');
}

// 安装webhook
async function handleInstall(request, ownerUid, botToken) {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    const webhookUrl = `${baseUrl}/${CONFIG.prefix}/webhook/${ownerUid}/${botToken}`;

    try {
        const response = await postToTelegramApi(botToken, 'setWebhook', {
            url: webhookUrl,
            allowed_updates: ['message'],
            secret_token: CONFIG.secretToken
        });

        const result = await response.json();
        if (result.ok) {
            return new Response(JSON.stringify({
                success: true, 
                message: 'CloudTodo Bot已成功安装!',
                usage: '使用 /help 查看使用说明'
            }), {
                status: 200, 
                headers: {'Content-Type': 'application/json'}
            });
        }

        return new Response(JSON.stringify({
            success: false, 
            message: `安装失败: ${result.description}`
        }), {
            status: 400, 
            headers: {'Content-Type': 'application/json'}
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false, 
            message: `安装错误: ${error.message}`
        }), {
            status: 500, 
            headers: {'Content-Type': 'application/json'}
        });
    }
}

// 主路由
export default {
    async fetch(request, env, ctx) {
        // 绑定KV命名空间
        // 这里我们模拟将env.TODO_STORE绑定到全局变量
        globalThis.TODO_STORE = env.TODO_STORE;
        
        const url = new URL(request.url);
        const path = url.pathname;

        let match;
        if (match = path.match(INSTALL_PATTERN)) {
            return handleInstall(request, match[1], match[2]);
        }

        if (match = path.match(WEBHOOK_PATTERN)) {
            return handleWebhook(request, match[1], match[2]);
        }

        return new Response('Not Found', {status: 404});
    }
};