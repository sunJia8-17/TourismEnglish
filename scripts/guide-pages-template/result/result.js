const { getScript } = require("../../../data/scripts");
const { createPlayer } = require("../../../utils/tts");

Page({
  data: {
    statusBarHeight: 44,
    sentence: "",
    accuracy: 0,
    accentText: "美式语音",
    rate: 1,
    streak: 0,
    nextIndex: 13,
    finished: false,
    hint: "点击“下一句”继续本篇训练"
  },

  onLoad() {
    const sys = wx.getWindowInfo();
    const result = wx.getStorageSync("bj_last_result") || {};
    const script = getScript(result.id);
    if (!script || !script.sentences || !script.sentences.length) {
      // Opened without a valid result (e.g. shared link) - go home instead of crashing.
      wx.reLaunch({ url: "/pages/index/index" });
      return;
    }
    const nextIndex = (result.index || 0) + 2;
    const finished = nextIndex > script.sentences.length;
    this.result = result;
    this.packageRoot = result.packageRoot || this.route.replace(/\/pages\/result\/result$/, "");
    this.player = createPlayer(() => {});
    this.setData({
      statusBarHeight: (sys.statusBarHeight || 20) + 8,
      sentence: result.sentence || "",
      accuracy: result.accuracy || 0,
      accentText: "美式语音",
      rate: result.rate || 1,
      streak: result.streak || 0,
      nextIndex,
      finished,
      hint: finished
        ? "本篇导游词已听写完成"
        : "点击“下一句”继续本篇训练"
    });
  },

  onUnload() {
    if (this.player) this.player.destroy();
  },

  onReplay() {
    const r = this.result || {};
    this.player.play(r.audio, r.rate || 1);
  },

  onNext() {
    const r = this.result || {};
    wx.redirectTo({
      url:
        "/" + this.packageRoot + "/pages/practice/practice?id=" +
        r.id +
        "&index=" +
        ((r.index || 0) + 1)
    });
  },

  onExit() {
    wx.reLaunch({ url: "/pages/index/index" });
  }
});
