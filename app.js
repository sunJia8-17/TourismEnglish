App({
  onLaunch() {
    try {
      wx.setInnerAudioOption({
        obeyMuteSwitch: false,
        mixWithOther: true
      });
    } catch (e) {}
    const logs = wx.getStorageSync("logs") || [];
    logs.unshift(Date.now());
    wx.setStorageSync("logs", logs.slice(0, 20));
  }
});
