const { SCRIPTS } = require("../../data/scripts");
const { getContinueState, getScriptIndex } = require("../../utils/progress");

const GUIDE_PACKAGE_ROOTS = {
  "forbidden-city": "guides/forbidden-city",
  "great-wall": "guides/great-wall",
  "temple-of-heaven": "guides/temple-of-heaven",
  "summer-palace": "guides/summer-palace",
  tiananmen: "guides/tiananmen",
  "ming-tombs": "guides/ming-tombs"
};

function greetingByHour(hour) {
  if (hour < 5) return "晚上好";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

Page({
  data: {
    statusBarHeight: 44,
    greeting: "早上好",
    scripts: [],
    scriptCount: 6,
    continueTitle: "继续上次练习",
    continueMeta: "",
    progressPercent: 0,
    continueId: ""
  },

  onShow() {
    const sys = wx.getSystemInfoSync();
    const hour = new Date().getHours();
    const list = SCRIPTS.map((item) => ({
      id: item.id,
      no: item.no,
      title: item.title,
      tag: item.tag,
      count: item.sentences.length
    }));
    const state = getContinueState(SCRIPTS);
    const script = SCRIPTS.find((item) => item.id === state.scriptId);
    const index = getScriptIndex(state.scriptId);
    const total = script.sentences.length;
    const current = Math.min(index, total);
    const percent = total ? Math.round((current / total) * 100) : 0;

    this.setData({
      statusBarHeight: (sys.statusBarHeight || 20) + 12,
      greeting: greetingByHour(hour),
      scripts: list,
      scriptCount: SCRIPTS.length,
      continueId: state.scriptId,
      continueTitle: current === 0 ? "开始本次练习" : "继续上次练习",
      continueMeta: script.enTitle + " · " + current + " / " + total,
      progressPercent: Math.max(percent, current > 0 ? 8 : 0)
    });
  },

  onContinue() {
    this.openScript(this.data.continueId);
  },

  onOpenScript(e) {
    this.openScript(e.currentTarget.dataset.id);
  },

  openScript(id) {
    wx.navigateTo({
      url: "/" + GUIDE_PACKAGE_ROOTS[id] + "/pages/practice/practice?id=" + id
    });
  }
});
