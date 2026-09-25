const KEY = "bj_dictation_progress";

function loadProgress() {
  try {
    return wx.getStorageSync(KEY) || {};
  } catch (e) {
    return {};
  }
}

function saveProgress(data) {
  wx.setStorageSync(KEY, data);
}

function getContinueState(scripts) {
  const all = loadProgress();
  if (all.lastScriptId) {
    const script = scripts.find((item) => item.id === all.lastScriptId);
    if (script) {
      const done = (all[script.id] && all[script.id].index) || 0;
      return {
        scriptId: script.id,
        enTitle: script.enTitle,
        index: Math.min(done, script.sentences.length),
        total: script.sentences.length
      };
    }
  }
  const first = scripts[0];
  return {
    scriptId: first.id,
    enTitle: first.enTitle,
    index: 0,
    total: first.sentences.length,
    fresh: true
  };
}

function markContinue(scriptId, index) {
  const all = loadProgress();
  all.lastScriptId = scriptId;
  all[scriptId] = all[scriptId] || { index: 0, streak: 0 };
  all[scriptId].index = index;
  saveProgress(all);
}

function addStreak(scriptId) {
  const all = loadProgress();
  all.lastScriptId = scriptId;
  all[scriptId] = all[scriptId] || { index: 0, streak: 0 };
  all[scriptId].streak = (all[scriptId].streak || 0) + 1;
  saveProgress(all);
  return all[scriptId].streak;
}

function getStreak(scriptId) {
  const all = loadProgress();
  return (all[scriptId] && all[scriptId].streak) || 0;
}

function getScriptIndex(scriptId) {
  const all = loadProgress();
  return (all[scriptId] && all[scriptId].index) || 0;
}

module.exports = {
  loadProgress,
  getContinueState,
  markContinue,
  addStreak,
  getStreak,
  getScriptIndex
};
