# Built with CodeBuddy · 用 CodeBuddy 开发

Screenshots of our CodeBuddy conversation on 16 Oct 2026 (Craft mode), in which CodeBuddy built task card T1 from
`CODEBUDDY.md`: the reviewer-facing pill card and version diff (`src/card.ts`, the `card` and `diff` commands in
`src/cli.ts`, and `test/card.test.ts`). The conversation is in Chinese.

我们 2026 年 10 月 16 日和 CodeBuddy 的对话截图（Craft 模式）：CodeBuddy 按 `CODEBUDDY.md` 里的任务单 T1，做出了给审批人看的胶囊卡片和版本对比（`src/card.ts`、`src/cli.ts` 里的 `card` 和 `diff` 两个命令、`test/card.test.ts`）。对话是中文的。

| | English | 中文 |
|---|---|---|
| [01](01-codebuddy-reads-the-task-card-and-builds.png) | CodeBuddy reads the project (the task card, the schemas, two real pill versions, the existing tests), writes `src/card.ts` (+212 lines), wires the two commands into the CLI, and writes the tests against real pill structure. | CodeBuddy 读项目（任务单、数据格式、两个真实胶囊版本、已有测试），写出 `src/card.ts`（+212 行），把两个命令接进命令行，并按真实胶囊结构写测试。 |
| [02](02-codebuddy-runs-tests-and-checks-protected-files.png) | It runs the tests (12 passing, 4 new) and the type check, runs both commands on real versions 1.3.0 → 1.4.0, confirms that no protected file (pills, proposals, runs, ledger, recordings) changed and that `verify` passes, fixes a doubled "(role-played)" label it noticed in its own output, and raises one question for us: the diff called the older version's approval "removed". | 它跑测试（12 项通过，新增 4 项）和类型检查，用真实版本 1.3.0 → 1.4.0 跑两个命令，确认受保护的文件（胶囊、提议、运行记录、审计链、模型录音）一个没动、`verify` 通过；它发现自己输出里「(role-played)」重复了一次并改掉；最后提出一个要我们定的问题：版本对比把旧版本的批准写成了「被移除」。 |
| [03](03-codebuddy-shows-the-generated-pill-card.png) | It shows the generated card for version 1.4.0: scope, each rule with when / then / why / escalate, and the quoted review sentences behind it. | 它展示生成的 1.4.0 卡片：适用范围，每条规则的 when / then / why / escalate，以及规则背后引用的复盘原句。 |

**What happened next.** We answered CodeBuddy's question by listing each version's approvals side by side
("Approval of 1.3.0", "Approval of 1.4.0") instead of "removed", and added a test for it (`test/card.test.ts`, last case).

**之后。** 对 CodeBuddy 提出的问题，我们的处理是把两个版本各自的批准并列写出（「Approval of 1.3.0」「Approval of 1.4.0」），不再写「被移除」，并在 `test/card.test.ts` 末尾加了对应测试。
