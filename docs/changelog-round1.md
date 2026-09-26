# 优化改动总结（第一轮）

> 对照项目首次分析，本轮完成的核心改动记录。
> 日期：2026-09-26

## 一、音频链路重构（核心改动）

| 项目 | 之前 | 现在 |
|---|---|---|
| 音频来源 | 百度翻译网页版非公开接口 | 腾讯云官方 TTS API |
| 音色 | 低码率百度女声（电话音质） | WeJack 英文男声（神经网络合成，16kHz） |
| 音频文件 | 每篇 1 个 MP3 | 每篇 1~2 个 MP3（自动按 ≤1.5MB 分卷，永不超过微信 2MB 分包限制） |
| manifest 格式 | `{ file, timings: [[start, end]] }` | `{ files: [...], timings: [[start, end, 卷号]] }` |

### 新增文件

- `scripts/generate-tencent-audio.js` — 腾讯云生成脚本
  - 支持参数：`--voice`（音色）/ `--speed`（语速 -2~6）/ `--volume`（音量 -10~10）
  - 可选音色：WeWinny（女声 24kHz，大模型音色）、WeJames（男声 24kHz，大模型音色）、WeJack（男声 16kHz，精品音色，默认）
  - 内置：超长句自动分段合成、失败重试（4 次）、1.5MB 自动分卷
- `scripts/sync-guide-pages.js` — 模板一键分发到 6 个分包
  - 以后改 UI 只改 `scripts/guide-pages-template/`，然后跑 `node scripts/sync-guide-pages.js`
- `scripts/package.json` — 构建依赖（腾讯云 SDK `tencentcloud-sdk-nodejs-tts`）

### 删除文件

- `scripts/generate-baidu-audio.js` — 旧百度生成脚本（已被取代）

### 音频重新生成流程（以后需要时）

```powershell
# 密钥（当前窗口有效，关闭失效）
$env:TENCENT_SECRET_ID = "xxx"
$env:TENCENT_SECRET_KEY = "xxx"

cd f:\TencentDeveloper\TourismEnglish
node scripts/generate-tencent-audio.js --voice=WeJack   # 或 WeWinny / WeJames
node scripts/split-audio-packages.js                     # 分发到 6 个分包
```

## 二、播放器修复（utils/tts.js）

- **修复双重播放 bug**：`onCanplay` 事件和 80ms 兜底定时器会同时触发 seek+play，导致两个声音叠加播放（二次进入页面时尤其明显）、首播出现电流声。新增 `started` 标志保证每句只播一次
- **`destroy()` 加固**：退出页面时依次 `pause → stop → destroy`，每步单独容错，防止旧音频残留

## 三、Bug 修复

| 问题 | 处理 |
|---|---|
| 结果页空数据崩溃（`getScript(undefined)` 抛错） | ✅ 加判空，无效数据自动跳回首页 |
| 假口音按钮（点击无实际切换） | ⚠️ 按需求保留 UI 原样，仅把 toast 文案改为如实的"本地音频已固定为腾讯云英文语音（男声）" |
| `nextIndex` off-by-one 疑似 bug | ✅ 复查确认原逻辑正确，无需修改 |
| `wx.getSystemInfoSync()` 已废弃 | ✅ 模板中替换为 `wx.getWindowInfo()`（已随同步分发到 6 个分包） |

## 四、工程化改进

- `project.config.json` 打包忽略：`scripts/`、`audio-build/`、设计稿图片、README 等不再打进小程序包（主包瘦身）
- 页面生成流程规范化：**改模板 → `node scripts/sync-guide-pages.js`**，替代原来手工维护 6 份副本

## 五、踩坑记录（备查）

1. **Edge TTS 免费接口已被微软封禁**：所有请求头/版本号/签名组合均返回 403，放弃该方案
2. **腾讯云 API 参数已改版**：`Voice`（字符串）→ `VoiceType`（数字 ID）、`Language` → `PrimaryLanguage`；单次合成上限为 500 半角字符。以本地 SDK 的类型定义（`node_modules/.../tts_models.d.ts`）为准，不要凭记忆写
3. **PowerShell 5.1 的 `Set-Content` 默认 ANSI 编码**：批量替换时把 6 个分包页面的中文搞成乱码导致白屏。教训：**批量文本操作一律走 Node 脚本（UTF-8 安全）**
4. **腾讯云国内站调用需关闭境外代理**：开着梯子调用会报错误码 6001

## 六、费用与依赖现状

- 腾讯云免费资源包（基础/精品音色 800 万字符）承担全部生成，本轮消耗约 4 万字符（0.5%）
- 小程序运行时**零网络依赖**：音频全部本地打包，离线可用
- API 密钥只存在于终端环境变量，未写入任何文件、未提交 git

## 七、待办（下一步）

1. **跟读评测**（等管理员在 mp.weixin.qq.com 添加"同声传译"插件）：
   - `app.json` 声明插件
   - 新建 `utils/speech.js`（录音 + 语音识别封装，预留升级腾讯云逐音素评测的接口）
   - practice 页加"听写 / 跟读"模式切换
   - 结果页逐词对比标红（识别偏差 ≈ 发音不准的词）
2. **可选**：换 WeWinny（24kHz 女声，需在控制台领取"大模型音色"免费资源包，额度 10 万字符）重新生成对比音色
3. **可选**：以后想真正支持美音/英音切换，需双套音频打包，分包体积翻倍，需重新评估分卷策略
