# Security & Failure Boundary Audit

审计日期：2026-08-14
审计角色：独立 Reviewer 2（未参与实现）
审计方法：只读代码检查与既有测试执行；未创建或执行攻击载荷。除本报告外未修改产品代码。

## 结论

最终复验结论：**没有未解决的 Critical 或 High，安全与失效边界验收通过。** 初审及第一次复验发现的 SEC-01 至 SEC-06 和三个 Medium 均已修复，并由代码复核与回归测试确认。

跨 chunk 日志脱敏和 rename/数据库崩溃窗口修复已独立复核。最终完整后端单元/模块测试为 **11 files / 53 tests passed**，完整集成测试为 **6 files / 16 tests passed**；安全 focused 集合为 **6 files / 42 tests passed**。

## 覆盖矩阵

| 边界 | 代码结论 | 测试证据 | 状态 |
|---|---|---|---|
| 上传路径、重复路径、symlink/特殊文件 | 统一相对路径规范化；拒绝绝对路径、`..`、空段；落盘使用 `wx`；冻结时拒绝 symlink/特殊文件 | `api-upload.test.ts`、`failure-security.test.ts`、`jobs-storage.test.ts` | 通过 |
| 文件数、单文件、总量、用户配额 | Fastify multipart 与流式累计双层限制；用户配额在 adopt 前检查 | 单文件与 sweep 上限有集成覆盖；总字节/文件数主要由代码审查确认 | 通过，有覆盖改进项 |
| 会话、权限、CSRF、Origin | Argon2id；可撤销随机会话；所有登录后的状态变更均带 CSRF；生产 Origin 校验；owner/admin 采用 404 隐藏 | `database-auth.test.ts`、`api-upload.test.ts`、`failure-security.test.ts` | 通过 |
| 跨用户 job/result/artifact 隔离 | job、私有 result、私有 artifact 均按 owner/admin 校验；发布后才允许匿名读取 | `failure-security.test.ts`、`api-closed-loop.test.ts` | 通过 |
| 工具配置 allowlist | 服务端目录固定 tool/module/adapter/version probe/env 名；生产禁止 fake fixture；子进程固定 `shell:false` | `failure-security.test.ts`、`process.test.ts` | 通过 |
| 日志敏感值保护 | stdout/stderr 先经有状态流式 redactor，再同时写盘和发事件；支持 secret 跨 chunk | `process.test.ts` 普通 token 与 split-token 两种用例 | 通过 |
| timeout/cancel/进程组 | detached process group，TERM 后 KILL；pre-aborted 在 spawn 前拒绝；timeout/cancel 结构化落库；无 shell | `process.test.ts`、`failure-security.test.ts` | 通过 |
| worker 重启恢复 | worker 构造时将遗留 running 标为 interrupted；queued job 可继续；可 retry | `jobs-storage.test.ts`、`queue-recovery.test.ts` | 通过 |
| 模块队列隔离 | Benchmark/Digital/PPA 独立 claim 与 concurrency 队列；长 Benchmark 不阻塞另两模块 | `jobs-storage.test.ts`、`queue-recovery.test.ts` | 通过 |
| 半结果不发布 | 非零退出、partial parser 失败均无 result、无 published directory | `failure-security.test.ts` | 通过 |
| 原子发布与崩溃恢复 | staging 完成后 rename；数据库 result/artifact/job 在单事务内提交；rename 后同步异常立即清理；启动清理 staging 与无 DB 行的 orphan final | `worker-publication.test.ts`、`jobs-storage.test.ts` | 通过 |
| 发布/撤回/删除可见性 | lifecycle 与 artifact visibility 在同一 DB 事务更新；私有、公开、删除查询边界正确 | `api-closed-loop.test.ts` 覆盖 private→published→deleted | 通过；unpublished 可补直接回归 |

## 初审 Critical / High 发现（均已修复）

### SEC-01 — Critical：大于 16 MiB 的 Benchmark SPICE 输入绕过危险指令检查

`server/modules/benchmark/validation.ts` 的 `readInputText()` 在文件大于 `MAX_VALIDATION_TEXT_BYTES` 时直接返回 `null`，读取异常也返回 `null`；调用方只在返回非 null 时执行 `isUnsafeSpiceText()` 和完整 include 检查。默认单文件上传上限远高于 16 MiB，因此 active SPICE 模型可在 preflight 中跳过 `.control`、`shell/system/source`、绝对/父目录 include 检查，随后被真实 SPICE/Benchmark 工具处理。

建议：对所有 active SPICE 文件做有上限内存的完整流式逐行扫描，并在任何无法完成检查的场景 fail closed；同时在执行前复核冻结文件 SHA-256。增加跨 16 MiB 边界但不执行工具的拒绝回归。

### SEC-02 — Critical：Digital 仿真只检查 testbench，未检查同时执行的 RTL

`server/modules/digital/inputs.ts` 与 runtime `security.ts` 只对 `mapping.testbench` 检查 `$system`/DPI；但 `server/modules/digital/planner.ts` 的 simulation compile 会将 `mapping.rtl` 和 testbench 一起编译，再由 VVP 执行。危险仿真原语位于 RTL 时不受当前检查约束。

建议：对所有参与仿真的 RTL、testbench 和 include 文件执行同一 fail-closed 策略；更稳妥的是将 HDL 仿真放在额外 OS/container sandbox 中。增加“危险原语位于 RTL”且只验证 preflight 拒绝的回归。

### SEC-03 — High：上传层只检查前约 2 MiB 的 Verilog include

`server/app/storage/upload.ts` 只累计前约 2 MiB 文本用于 `includeTargets()`。Digital preflight/runtime 依赖 manifest 中的 `unresolvedIncludes`，没有完整重扫 active HDL include。位于该窗口之后的绝对路径、父目录或未上传 include 不会进入 manifest；交给 Yosys/Icarus 时可能越界读取服务账户可读文件。

建议：在 Digital preflight 与执行前对全部 active HDL 做流式 include 扫描和 uploaded-tree 解析，不应把上传阶段的有限预览当作最终安全判定。

## 初审 Medium / Low 发现与改进项

- **Medium — 预取消竞态（已修复）**：`SafeProcessRunner` 在 spawn 前复查 aborted，并由 JobRunner 统一映射 cancelled。
- **Medium — 匿名 capability 暴露技术文件绝对路径（已修复）**：公开 technology 的 Liberty/LEF 路径均脱敏为空/null。
- **Medium — Benchmark 冻结输入执行前缺少哈希复核（已修复）**：Benchmark internal validate step 复核 regular file、containment、size 和 SHA-256。
- **Low — 自动化边界覆盖**：应补 max-files、max-total-bytes、private→published→unpublished→published，以及预 aborted signal 的直接回归。

## 已独立核验的两项重点修复

1. **跨 chunk 日志值保护**：`StreamingRedactor` 使用 `StringDecoder` 并保留最长 secret 的可能前缀后缀，只有完成分类的文本才会写入 stdout/stderr 文件及事件回调。普通 token 和拆成两个进程输出 chunk 的 token 均只留下 `[REDACTED]`。
2. **rename/DB 崩溃窗口**：发布代码在 rename 后、DB 尚未提交时发生同步错误会删除 final directory；若进程在该窗口直接崩溃，worker 启动会以 DB result ID 集合为准，删除 staging 和 orphan final，同时保留有 DB 记录的结果。

## 测试记录

```text
npx vitest run test/backend/process.test.ts test/backend/jobs-storage.test.ts test/backend/worker-publication.test.ts
Test Files  3 passed (3)
Tests       9 passed (9)

npm test
Test Files  11 passed (11)
Tests       44 passed (44)

npm run test:integration
Test Files  6 passed (6)
Tests       16 passed (16)
```

初审放行状态：**不通过；当时仍有 Critical/High。**

## 修复后复验 1

复验日期：2026-08-14

### 原发现修复状态

| 原发现 | 独立复验结果 |
|---|---|
| SEC-01 Benchmark >16 MiB fail-open | 已修复：active model 超过 16 MiB 或无法安全读取时 preflight 明确拒绝 |
| SEC-02 Digital 只检查 testbench | 已修复：共享 HDL 检查覆盖 RTL、gate netlist、testbench、include，且 runtime 重检 |
| SEC-03 晚于上传预览窗口的 include | 部分修复：active HDL 会完整读取，任意位置的直接 include 可被发现；递归依赖闭包仍有新问题 SEC-05 |
| SafeProcess 预取消竞态 | 已修复：spawn 前两次检查，并在 listener 注册后再次处理 aborted；JobRunner 映射为 cancelled |
| capability 暴露技术路径 | 已修复：公开 technology 的 Liberty/LEF 路径返回空数组/null |
| Benchmark runtime 缺少完整性复核 | 已修复：validate internal step 检查 regular file、containment、size、SHA-256 |

### 新发现

#### SEC-04 — Critical：Benchmark include 依赖内容未递归做 SPICE 安全扫描

Benchmark 只对 role 为 `primary-model`/`base-model` 的文件调用 `isUnsafeSpiceText()`。主模型引用一个已上传的子模型时，`unresolvedIncludes()` 只确认路径存在，不会扫描子模型内容。真实 SPICE 会继续加载该文件，因此危险控制指令可藏在 include 依赖中。

要求：以 active model 为根构建递归 include 闭包，对每个可达文件执行同样的大小、路径、危险指令和嵌套 include 检查；循环 include 需要显式 visited 集合。测试只需断言 preflight 拒绝，不应启动 simulator。

#### SEC-05 — Critical：HDL include target 只要求“已上传”，不要求“已扫描”

共享 `validateHdlSource()` 使用所有 manifest path 作为 `availablePaths`，但 Digital/PPA 只读取映射为 active HDL 的文件。一个 active RTL 可以 include 已上传但 unassigned/ignored 的文本；target 会被判定 resolved，其内容却不进入扫描。若 target 中存在外部原语，编译器仍可能展开并执行。

要求：从 RTL/gate/testbench roots 递归解析 include 闭包并扫描每个可达 target，或者至少只允许 include target 属于经过扫描的专用 include 集合；扩展名不能作为安全边界。

#### SEC-06 — High：HDL 宿主文件 I/O system task 未禁止

当前共享检查只拒绝 `$system` 和 DPI，未拒绝 `$fopen`、`$readmemh/$readmemb`、`$writememh/$writememb`、`$dumpfile` 等宿主文件读写原语。Yosys/Icarus/VVP 处理这些原语时可能读取或写入 workspace 外服务账户可访问的文件。

要求：对不在强 OS/container sandbox 内的 HDL 工具采用明确 allowlist/fail-closed；至少拒绝所有宿主文件 I/O system tasks。更稳妥的是把仿真器放入只读输入、独立 uid、无网络、受限挂载的 sandbox。

### 复验测试

```text
npx vitest run \
  test/backend/process.test.ts \
  test/modules/benchmark/adapters.test.ts \
  test/modules/benchmark/parser-execution.test.ts \
  test/modules/digital/digital-adapter.test.ts \
  test/modules/ppa/ppa-adapter.test.ts \
  test/integration/failure-security.test.ts

Test Files  6 passed (6)
Tests       45 passed (45)
```

复验 1 放行状态：**不通过；仍有 2 Critical、1 High。**

## 最终复验

复验日期：2026-08-14

### SEC-04/05/06 修复验证

| 发现 | 最终实现 | 复验结论 |
|---|---|---|
| SEC-04 Benchmark include 依赖未扫描 | 从 primary/base roots 构建 SPICE/Spectre include 闭包；以 visited 集合终止循环；所有可达依赖执行同一大小、扩展名、危险指令与嵌套 include 检查；`.scs` 无点 `include/inc/lib` 被识别，`ahdl_include` fail closed | 已修复 |
| SEC-05 HDL include target 只要求已上传 | Digital/PPA 从实际执行 roots 出发递归读取全部上传依赖；unassigned/ignored target 也进入扫描；完整文件任意位置的 `` `include`` 由注释感知全局 tokenizer 识别；路径必须留在上传树内 | 已修复 |
| SEC-06 HDL 宿主文件 I/O | 共享检查拒绝 `$system`、DPI、`$fopen/$fclose/$fread/$fwrite/$fdisplay/$fmonitor`、`$readmem*/$writemem*`、`$dumpfile/$dumpvars` | 已修复 |

递归遍历对 dependency 执行同一 16 MiB fail-closed 限制，并用 visited 集合处理循环。Digital runtime 重跑同一递归检查；PPA/Benchmark 对全部 manifest 文件做 size/SHA-256/regular-file/containment 校验，保证 preflight 审核的闭包在执行前未改变。`sourceSecurity.ts` 已通过 `.gitignore` 反向规则显式解除忽略，可正常纳入本次提交。

### 最终测试记录

```text
npx vitest run \
  test/backend/process.test.ts \
  test/modules/benchmark/validation.test.ts \
  test/modules/benchmark/adapters.test.ts \
  test/modules/benchmark/parser-execution.test.ts \
  test/modules/digital/digital-adapter.test.ts \
  test/modules/ppa/ppa-adapter.test.ts

Test Files  6 passed (6)
Tests       42 passed (42)

npm test
Test Files  11 passed (11)
Tests       53 passed (53)

npm run test:integration
Test Files  6 passed (6)
Tests       16 passed (16)

npm run typecheck
passed

npm run lint
passed
```

剩余 Low 覆盖建议：补充 max-files、max-total-bytes、private→published→unpublished→published，以及块注释后行内 HDL include、Spectre include/`ahdl_include` 的直接单元断言。对应实现已静态复核，本项不构成 Critical/High 阻断。

最终放行状态：**通过；无未解决的 Critical/High。**
