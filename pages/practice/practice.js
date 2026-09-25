const { getScript } = require("../../data/scripts");
const AUDIO_MANIFEST = require("../../data/audio-manifest");
const { createPlayer, formatTime } = require("../../utils/tts");
const { gradeDictation } = require("../../utils/grade");
const { getScriptIndex, markContinue, addStreak } = require("../../utils/progress");

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    id: "",
    title: "",
    enTitle: "",
    sentence: "",
    index: 0,
    displayIndex: 1,
    total: 0,
    draft: "",
    accent: "baidu",
    accentLabel: "百度语音",
    rate: 1,
    playing: false,
    statusText: "READY · 00:00 / 00:00"
  },

  onLoad(query) {
    const sys = wx.getSystemInfoSync();
    const menu = wx.getMenuButtonBoundingClientRect();
    const id = query.id || "forbidden-city";
    const script = getScript(id);
    let index = Number(query.index);
    if (Number.isNaN(index)) {
      index = getScriptIndex(id);
    }
    if (index >= script.sentences.length) index = 0;

    this.player = createPlayer((state) => this.onAudio(state));
    this.packageRoot = this.route.replace(/\/pages\/practice\/practice$/, "");
    this.setData({
      statusBarHeight: sys.statusBarHeight,
      navBarHeight: (menu.top - sys.statusBarHeight) * 2 + menu.height,
      id: script.id,
      title: script.title,
      enTitle: script.enTitle.toUpperCase(),
      total: script.sentences.length
    });
    this.loadSentence(index, true);
  },

  onUnload() {
    if (this.player) this.player.destroy();
  },

  loadSentence(index, autoplay) {
    const script = getScript(this.data.id);
    const sentence = script.sentences[index];
    markContinue(script.id, index);
    this.setData({
      index,
      displayIndex: index + 1,
      sentence,
      draft: "",
      playing: false,
      statusText: "READY · 00:00 / 00:00"
    });
    if (autoplay) {
      setTimeout(() => this.playCurrent(), 240);
    }
  },

  onAudio(state) {
    if (state.error) {
      this.setData({
        playing: false,
        statusText: "AUDIO UNAVAILABLE"
      });
      wx.showToast({ title: "音频加载失败，请点播放重试", icon: "none" });
      return;
    }
    const now = formatTime(state.current);
    const total = formatTime(state.duration);
    this.setData({
      playing: !!state.playing,
      statusText: (state.playing ? "NOW PLAYING" : "PAUSED") + " · " + now + " / " + total
    });
  },

  getCurrentAudio() {
    const guide = AUDIO_MANIFEST[this.data.id];
    const timing = guide && guide.timings[this.data.index];
    if (!guide || !timing) return null;
    return { src: guide.file, start: timing[0], end: timing[1] };
  },

  playCurrent() {
    this.player.play(this.getCurrentAudio(), this.data.rate);
  },

  onTogglePlay() {
    if (this.data.playing) {
      this.player.pause();
      return;
    }
    this.playCurrent();
  },

  onReplay() {
    this.playCurrent();
  },

  onInput(e) {
    this.setData({ draft: e.detail.value });
  },

  onRate(e) {
    const rate = Number(e.currentTarget.dataset.rate);
    this.setData({ rate });
    this.playCurrent();
  },

  onToggleAccent() {
    wx.showToast({ title: "本地 MP3 已固定为百度英文语音", icon: "none" });
  },

  onBack() {
    wx.navigateBack({
      fail: () => {
        wx.reLaunch({ url: "/pages/index/index" });
      }
    });
  },

  onNext() {
    const { sentence, draft, id, index, accent, rate } = this.data;
    const { accuracy } = gradeDictation(sentence, draft);
    const streak = addStreak(id);
    markContinue(id, index + 1);
    wx.setStorageSync("bj_last_result", {
      id,
      index,
      accuracy,
      accent,
      rate,
      audio: this.getCurrentAudio(),
      packageRoot: this.packageRoot,
      sentence,
      input: draft,
      streak
    });
    wx.redirectTo({
      url: "/" + this.packageRoot + "/pages/result/result"
    });
  }
});
