function pad(n) {
  const v = Math.max(0, Math.floor(n) || 0);
  return (v < 10 ? "0" : "") + v;
}

function formatTime(seconds) {
  const s = Math.max(0, seconds || 0);
  return pad(s / 60) + ":" + pad(s % 60);
}

// Audio is packaged with the mini-program, so playback works in DevTools and
// on devices without a runtime download from a third-party TTS endpoint.
function createPlayer(onUpdate) {
  try {
    wx.setInnerAudioOption({ obeyMuteSwitch: false, mixWithOther: true });
  } catch (e) {}

  const audio = wx.createInnerAudioContext();
  audio.obeyMuteSwitch = false;
  audio.autoplay = false;
  let rate = 1;
  let request = null;
  let sequence = 0;
  let isSeeking = false;

  function clipDuration() {
    return request ? Math.max(0, request.end - request.start) : 0;
  }

  function emit(extra) {
    const current = request
      ? Math.min(clipDuration(), Math.max(0, (audio.currentTime || request.start) - request.start))
      : 0;
    onUpdate(Object.assign({ current, duration: clipDuration(), playing: false }, extra));
  }

  function finish() {
    try {
      audio.pause();
    } catch (e) {}
    emit({ playing: false, ended: true, current: clipDuration() });
  }

  function begin(currentSequence) {
    if (!request || currentSequence !== sequence) return;
    isSeeking = true;
    try {
      audio.seek(request.start);
      audio.playbackRate = rate;
      audio.play();
    } catch (e) {
      emit({ error: true, playing: false });
    }
    isSeeking = false;
  }

  audio.onCanplay(() => begin(sequence));
  audio.onTimeUpdate(() => {
    if (!request || isSeeking) return;
    if ((audio.currentTime || 0) >= request.end - 0.025) {
      finish();
    } else {
      emit({ playing: true });
    }
  });
  audio.onPlay(() => emit({ playing: true }));
  audio.onPause(() => emit({ playing: false }));
  audio.onEnded(finish);
  audio.onError(() => emit({ playing: false, error: true }));

  return {
    play(nextRequest, nextRate) {
      if (!nextRequest || !nextRequest.src || nextRequest.end <= nextRequest.start) {
        emit({ playing: false, error: true });
        return;
      }
      request = nextRequest;
      rate = nextRate || 1;
      sequence += 1;
      const currentSequence = sequence;
      try {
        audio.stop();
        audio.src = request.src;
      } catch (e) {
        emit({ playing: false, error: true });
        return;
      }
      // Local files can already be buffered before the event listener runs.
      setTimeout(() => begin(currentSequence), 80);
    },
    replay() {
      if (request) this.play(request, rate);
    },
    pause() {
      try {
        audio.pause();
      } catch (e) {}
    },
    destroy() {
      sequence += 1;
      try {
        audio.stop();
        audio.destroy();
      } catch (e) {}
    }
  };
}

module.exports = { formatTime, createPlayer };
