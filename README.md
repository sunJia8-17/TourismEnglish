# TourismEnglish — 北京英文导游词听写训练（小程序）

微信小程序项目：北京六大景点（故宫、长城、天坛、颐和园、天安门、明十三陵）的英文导游词听写练习，含音频播放、逐句听写、评分与进度记录。

- **仓库地址**：https://github.com/sunJia8-17/TourismEnglish.git
- **当前主分支**：`main`
- **AppID**：`wx9860c935cbfff90e`（开发工具导入时使用）

## 项目结构速览

```
TourismEnglish/
├── app.js / app.json / app.wxss    # 小程序入口与全局配置
├── pages/                          # 主包页面（index / practice / result）
├── guides/                         # 6 个景点分包（每个含 practice + result 页面）
├── data/                           # 导游词脚本（scripts.js）与音频清单（audio-manifest.js）
├── utils/                          # grade.js（评分）、progress.js（进度）、tts.js（语音）
├── scripts/                        # Node 脚本：音频生成与分包拆分（非小程序运行时代码）
├── project.config.json             # 项目配置（appid、编译选项）
└── project.private.config.json     # 本地私有配置（因人而异，建议不入库）
```

---

# Git 使用说明

## 一、首次克隆（新电脑 / 新同事）

```bash
# 1. 克隆仓库
git clone https://github.com/sunJia8-17/TourismEnglish.git

# 2. 用微信开发者工具「导入项目」，选择该目录
#    AppID 使用 wx9860c935cbfff90e，会自动读取 project.config.json
```

> 提示：如果 GitHub 访问较慢，可配置 SSH 后改用 SSH 地址克隆，或使用镜像加速。

## 二、日常开发流程（最常用的 5 条命令）

```bash
git pull                      # 1. 开始工作前，拉取最新代码
git add .                     # 2. 暂存改动（. 表示全部）
git commit -m "feat: 完成天坛分包听写页"   # 3. 提交
git pull                      # 4. 推送前再拉一次，避免冲突
git push                      # 5. 推送到远程
```

## 三、分支管理（推荐约定）

单人开发可直接用 `main`；多人协作时按以下方式开分支：

```bash
git checkout -b feature/ming-tombs-practice   # 新建功能分支
# ...开发、add、commit...
git push -u origin feature/ming-tombs-practice  # 首次推送并关联远程
```

| 分支类型 | 命名规范 | 示例 |
|---|---|---|
| 主分支 | `main` | 始终保持可运行 |
| 功能开发 | `feature/xxx` | `feature/audio-speed` |
| 修 Bug | `fix/xxx` | `fix/progress-percent` |
| 紧急修复 | `hotfix/xxx` | `hotfix/crash-on-result` |

功能完成后在 GitHub 上发 Pull Request 合并回 `main`，或本地合并：

```bash
git checkout main
git pull
git merge feature/ming-tombs-practice
git push
git branch -d feature/ming-tombs-practice   # 删除本地分支
```

## 四、提交信息规范

格式：`类型: 简短描述`（中文描述即可）

| 类型 | 用途 |
|---|---|
| `feat` | 新功能（如新增景点分包、倍速播放） |
| `fix` | 修复 Bug |
| `style` | 样式调整（wxss、wxml 布局） |
| `refactor` | 重构（不改功能的代码调整） |
| `chore` | 配置、脚本、文档等杂项 |
| `docs` | 文档变更 |

示例：

```
feat: 颐和园分包新增练习结果评分动画
fix: 修复继续练习进度百分比越界
chore: 更新音频清单 manifest
```

## 五、本项目特有的 Git 注意事项

1. **音频文件（.mp3）较大**：`guides/` 分包内含音频，提交前确认是有意更新的音频文件，避免误提交大量二进制变更。可以用下面命令查看体积：
   ```bash
   git count-objects -vH        # 查看仓库体积
   ```
2. **`project.private.config.json` 不建议入库**：这是开发者工具的本地私有配置，每人不同。建议加入 `.gitignore`（见下节）。
3. **小红书参考图 / 原型图**：根目录的设计参考图（`客户说小程序UI界面*.jpg`、`旅英启动页.svg` 等）如无需版本管理，可移入 `docs/` 或忽略。
4. **分包结构不要随意移动**：`app.json` 中注册了 6 个分包路径（`guides/forbidden-city` 等），重命名目录会连带改配置，提交时务必说明。

## 六、建议的 .gitignore

项目当前没有 `.gitignore`，建议创建一个，内容如下：

```gitignore
# 微信开发者工具私有配置（因人而异）
project.private.config.json

# 依赖与构建产物（如有）
node_modules/
dist/

# 系统与编辑器文件
.DS_Store
Thumbs.db
*.swp

# 本地调试文件
*.log
```

> 注意：不要忽略 `project.config.json`（含 AppID 和编译配置，团队需要共享）。

## 七、常见问题处理

```bash
# 撤销工作区未提交的改动（危险：不可恢复）
git checkout -- 文件名

# 撤销最近一次 commit，但保留代码改动
git reset --soft HEAD~1

# 合并冲突：编辑冲突文件后
git add 冲突文件
git commit

# 查看某次提交改了什么
git show fcbed84

# 查看简洁的历史记录
git log --oneline --graph -10
```

## 八、版本发布（小程序上传体验版前）

```bash
# 1. 确保代码干净且是最新
git pull && git status

# 2. 打版本标签
git tag -a v1.0.0 -m "首个体验版：六大景点听写"
git push origin v1.0.0

# 3. 在微信开发者工具中「上传」代码，版本号与 tag 对应填写
```
