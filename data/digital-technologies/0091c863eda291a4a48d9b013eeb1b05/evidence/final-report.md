# SKY130 加法器：LibCharX 到数字电路应用闭环

## 1. 器件 timing model

- 工艺角：TT，1.8 V，25 °C。
- NLDM 网格：3×3；输入 slew（秒）为 `[1e-11, 5.31329e-11, 2.82311e-10]`，输出负载（法拉）为 `[5e-16, 9.56858e-15, 6.84593e-14]`。
- LibCharX 正常运行一次；仿真成功 `538/538`，提取成功 `532/532`，跳过弧 `0`。
- 最终库：`/home/duhaochen/LibCharX/characterization/sky130_adders/results/libcharx_adder_test.lib`；SHA-256 `fe758dc59aff5e948ce9107beec300e219185c98b434f9a614f62ad9eeb035d2`。
- `SUM` 为 XOR/XNOR 类型的非单调输出。本次依照固定代表性静态向量完成一次正常表征，Liberty 中保留该敏化条件下 LibCharX 自动识别的 timing sense；这不是覆盖所有 XOR 奇偶条件的双敏化 sign-off 模型。

| SKY130 单元 | 面积/µm² | timing arcs | 传播延迟范围/ps | 输入电容范围/fF |
|---|---:|---:|---:|---:|
| `sky130_fd_sc_hd__fa_1` | 20.0192 | 6 | 63.149–646.279 | 2.490–4.070 |
| `sky130_fd_sc_hd__fah_1` | 33.7824 | 6 | 66.296–654.590 | 2.159–4.921 |
| `sky130_fd_sc_hd__fahcin_1` | 33.7824 | 6 | 24.294–801.777 | 2.178–4.921 |
| `sky130_fd_sc_hd__fahcon_1` | 33.7824 | 6 | 24.282–875.890 | 2.178–7.081 |
| `sky130_fd_sc_hd__ha_1` | 12.5120 | 4 | 56.438–594.736 | 1.852–2.093 |

## 2. RTL 功能一致性

五个 top 均为 8 位，接口完全相同：`A[7:0]`、`B[7:0]`、`CIN`、`SUM[7:0]`、`COUT`。Yosys SAT 同时证明五个 RTL 结构及五份最终映射网表对全部输入空间均等价于 `{1'b0,A} + {1'b0,B} + CIN`；两份日志均存在 `SAT proof finished - no model found: SUCCESS!`。

## 3. 统一综合与 STA 条件

- Yosys：`Yosys 0.64+72 (git sha1 22ef99218, clang++ 20.1.8 -fPIC -O3)`。
- 所有设计使用相同 Liberty SHA-256、相同读入/层次化/flatten/clean/check/stat/write 流程；网表中不存在库外未映射单元。
- OpenSTA：`3.1.0`。
- 虚拟时钟周期 10.0 ns，输入 slew 0.0531329 ns，输出负载 0.00956858 pF，输入/输出 delay 均为 0 ns。

| 架构 | 单元数 | 面积/µm² | 关键路径/ns | 面积排名 | 时序排名 |
|---|---:|---:|---:|---:|---:|
| Ripple carry（普通逐位进位） | 8 | 160.1536 | 1.714447 | 1 | 4 |
| Kogge–Stone（并行前缀） | 83 | 1226.1760 | 1.628767 | 5 | 3 |
| Carry-select（4+4 分段） | 27 | 593.0688 | 1.025152 | 4 | 2 |
| Carry-skip（两个 4 位分组） | 28 | 520.4992 | 1.972122 | 3 | 5 |
| Alternating-polarity ripple（正/反进位交替） | 8 | 270.2592 | 0.884935 | 2 | 1 |

## 4. 结果解释

- 最小面积：Ripple carry（普通逐位进位），面积 160.1536 µm²。
- 最短关键路径：Alternating-polarity ripple（正/反进位交替），0.884935 ns（A[0] (input port clocked by vclk) → SUM[7] (output port clocked by vclk)）。
- 最小面积×延迟：Alternating-polarity ripple（正/反进位交替），239.1618 µm²·ns。
- 并行前缀结构用更多半加器/全加器换取较浅逻辑深度；carry-select 复制高位计算并用选择器换速度；carry-skip 的收益取决于分组与映射代价；交替极性 ripple 避免每级显式反相，在本单元集合下通常有很好的面积/时序折中。

## 5. 可复现产物

- 五份 RTL：`application/rtl/adder8_*.v`
- 五份门级网表：`application/netlists/*_mapped.v`
- 单元/面积：`application/reports/synthesis_summary.json`
- 完整 STA 路径：`application/reports/*_sta.log`
- 汇总数据：`application/reports/comparison.csv`
