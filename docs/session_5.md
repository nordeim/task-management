我将认真从中断处继续执行计划。让我先检查工作区状态、工作日志与浏览器会话：
本地仓库与远端同步于 `246739a`，无未提交改动（中断的会话处于检查阶段）；开发服务器运行于 3000 端口，ref/clone 两个浏览器守护进程均存活。上一个会话（内部 session 7）已完成 10 项差距清单并将日期/所有者汇总实验做到一半被截断——参照物上仍留有 owner 残留（"1 people"）。我需要完成探针、还原参照物、汇总清单，然后按 TDD 实施全部修复。
参照物任务上的 owner 是上个会话 API 赋值时把用户 ID 多打了一个 6（`66aa952...` vs 真实 `6aa952...`）——渲染的是"未知用户回退"（24px 纯蓝头像 + 原始 ID 文本）。让我捕获行内 owner 单元格的完整结构（hover-fade 包装 > flex gap-2 > 蓝色头像 + text-[#323338] text-sm 标签），再通过 API 还原为 null。
捕获空态 affordance：Owner = 用户图标 w-4 h-4 + "Assign"、Date = 日历图标 + "Set date"（text-[#676879]、hover bg-[#E1E5F3]、px-2 py-1 -mx-2 -my-1、gap-2）——date-cell 已对齐，owner-cell 未对齐。
从参照物前端 bundle 解码团队系统：硬编码 useState 模拟数据（JD/JS/MJ/SW，含 id/avatar/online/role）；头部行为位置配色（blue/green/purple-500）+ framer 悬停缩放；弹出层为 id%3 配色、w-80、"Team (4)" + Invite 按钮（outline h-8、UserPlus w-3 h-3 mr-1、hover:border-purple-500）、成员行 p-2 rounded-lg hover:bg-gray-50（角色 text-xs text-gray-500 + Mail/MessageSquare h-6 w-6 ghost 按钮）；在线点 w-2.5（头部）/w-2（弹出层）bg-green-400 border(1px)；溢出芯片 bg-gray-400 "+N"。
用户菜单完整 HTML：纯文本 "My Account" 标签（px-2 py-1.5 text-sm font-semibold）+ 分隔线 + 三个条目（Your Profile/Settings/Sign out）全部 `<a href=/Board>` 标准色、无图标、无红色。
移动端菜单不是 Sheet——是头部下方的内联折叠面板（md:hidden border-t）：导航链接（text-base、同一激活规则）、search-mobile 输入（border-gray-300、focus ring #0073EA）、用户区（40px 渐变头像、"User Name"/"user@example.com" 占位文本、铃铛按钮）、底部三链接（text-gray-700 hover:bg-gray-50）；汉堡按钮 h-10 w-10 ghost hover:bg-[#E1E5F3] rounded-lg，图标 Menu↔X 切换，面板条件渲染。
导航激活态两种状态均已确认（桌面 + 移动）；头部头像 = bg-gradient-to-r from-[#0073EA] to-[#00C875] w-8 h-8、text-white font-bold text-xs。
行操作区 zone8 = radix 下拉触发器（h-6 w-6 悬停显现 hover:bg-[#E1E5F3]）内含 Trash2 w-3 h-3 text-[#676879]；菜单 = 单一 "Delete Task" 标准色条目。
任务行轨道完整类名：zone0 把手（cursor-grab opacity-0 group-hover:opacity-100 p-1 bg-white group-hover:bg-[#F5F6F8]）、zone1/间隔/zone8 bg-white group-hover:bg-[#F5F6F8] + 操作区 border-l。
复选框精确 HTML：rounded-sm border-primary shadow、选中 bg-primary #171717；参照物 token 全量转储：--primary 0 0% 9%、--ring 0 0% 3.9%、--foreground 0 0% 3.9%、--accent 0 0% 96.1%——全部是 shadcn 默认值。
系统性继承文本差异确认：参照物 Integrate/Automate 按钮标签 rgb(10,10,10) vs 克隆 rgb(50,51,56)；参照物日历月内数字 #0a0a0a。克隆把 shadcn token 定制成蓝色系——显式类的地方正确，但所有继承原语（复选框、按钮标签、悬停色调、焦点环）都在漏色。
日历：35 格确认；星期行 grid-cols-7 text-[#676879] mb-2 + py-2 border-b 单元格；月外格 = bg-[#F9FAFB] text-gray-400 实色；今日格 = 裸 span + mt-1 space-y-1 overflow-y-auto max-h-[70px] 事件容器，无加号按钮。
看板标题编辑输入框捕获：flex rounded-md border border-input bg-transparent px-3 py-1 shadow-sm text-xl font-bold h-8 w-64。
受控实验（API 设置 owner+日期后截图再还原并验证干净）捕获汇总单元格：所有者 = Users 图标 w-3 h-3 + "1 people"；日期 = 日历图标 w-3 h-3 + "Sep 25"（min≠max 时 "Sep 18 - Sep 25"）；均为 flex items-center gap-1 text-xs text-gray-600。
参照物 Sort 弹出层选中指示 = arrow-up w-4 h-4 rgb(0,115,234)——硬编码蓝色，验证了 token 策略。参照物 Person 筛选按钮是死 UI。
编写 docs/remediation-plan-session7.md（18 项已验证差距 + 偏差 + TDD 接缝 + 验证计划）。
TDD：为 6 个新接缝（isNavActive、calendarCells、summaryDateLabel、summaryOwnerLabel、teamAvatarPalette、memberPopoverPalette）先写 18 个失败测试 → RED；在 domain.ts 实现 → GREEN（87/87）。
UserDTO 增加 role + online；schema.prisma + 种子（demo=Owner/在线、Jane/John=Editor/在线、Mike=Viewer/离线）+ 幂等 upsert 更新；prisma db push；所有 API select 更新。
token 重排：--primary/--foreground/--card-foreground/--popover-foreground/--accent/--secondary/--ring 对齐 shadcn 参照值——⚠ Tailwind v4 原样透传 var() 值，裸 "0 0% 9%" 会让颜色失效，必须包成 hsl()（踩坑后修复）；--muted-foreground #676879；--border/--input 0 0% 89.8%。
蓝色语义清扫：27 处 text/border/ring-primary → 显式 #0073EA（并修复了正则产生的 \# 转义伪影）。
app-header.tsx 重写：基于路径名的导航激活（桌面 + 移动）、桌面右簇 md 以下隐藏（h-10 w-10 ghost 按钮）、32px 渐变头像、"My Account" 菜单、右侧汉堡 + 内联折叠面板、logo 文本始终可见 text-xl font-bold text-[#323338]。
board-view.tsx：团队头像行（3 个位置配色头像 + "+N" bg-gray-400 溢出、逐头像弹出触发、bg-green-400 1px 边框在线点）、TeamMembersPopover 组件、标题编辑输入框按参照物规格。
board-table.tsx：类驱动轨道（group-hover 着色）、把手轨道区域级透明度、复选框去掉绿色覆盖（近黑 #171717）、Trash2 触发器 + 标准色 Delete Task、加任务行全透明区 + flex-1 标题区、汇总聚合、表头操作轨 border-l + px-3 py-3。
owner-cell.tsx：空态 = Assign affordance；赋值态 = hover:opacity-80 包装 + 24px bg-[#0073EA] 头像 + 深色名称。
board-calendar.tsx：calendarCells 接缝（动态周数）、35 格、裸数字 span、月外实色、星期行、移除今日加号按钮和死 prop。
board-kanban.tsx：参照物列结构（w-80 flex-shrink-0 rounded-2xl p-2 shadow-lg + slate 渐变底、px-4 py-3 mb-2 表头区、状态色 Plus、min-h-[200px] max-h-[calc(100vh-300px)] 滚动区）、裸 flex gap-6 p-2 pb-8 容器（去掉边框卡包装 + lg:grid）、Ellipsis 图标（3 点）替换 MoreHorizontal、虚线边框空列提示（着色圆盘 + 两行文本）、表头卡片去掉 flex-wrap。
prisma db push 后运行中的开发服务器持有过期 Prisma Client 导致 500——重启（.next 清理）后恢复；会话内两次发现进程被收割，用子壳 setsid 保持存活。
浏览器 DOM 探针逐项验证：/Boards 激活 + 负例（/、/boards、/Board?id= 无激活）、团队行（blue/green/purple + 点 + "+1"）、复选框 rgb(23,23,23)、垃圾桶图标、汇总聚合（"3 people"、"Sep 14 - Sep 25"）、owner 单元格、日历 35 格 + 今日结构、用户菜单、移动面板（无误激活）。
VLM 判定：dashboard MATCH、board-table MATCH、board-kanban MATCH（修复后）、analytics MATCH、login MATCH、404 MATCH、mobile-panel MATCH；boards/calendar/timeline/unassigned = 仅数据差异 + 已被像素分析推翻的幻觉（两边日历网格线均存在）。验证中额外发现并修复：logo 文本可见性、看板容器/列结构、Ellipsis 图标、--border/--input 对齐。
功能回归：复选框切换跨重载持久（已还原）、垃圾桶菜单真实删除任务（用一次性任务测试）、登出 → /login?from_url → 登录后返回原 URL。
文档对齐：PAD v1.6（新修订块 + token 表 + §10 偏差 + 关键文件表 + ER 图 role/online）、CLAUDE.md 陈旧的"单一路由"条目与反模式修正 + Tailwind v4 token 说明、README 测试计数 69→87。
所有门禁绿（lint 0、tsc 0、87/87）。原子提交后通过 SSH 包装脚本推送到 main。
