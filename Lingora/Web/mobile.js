'use strict';
const mobileHost = (() => {
  const android = window.LingoraAndroid;
  const apple = window.webkit?.messageHandlers?.lingora;
  let completion = null;
  let current = 0;
  function sendIOS(action, payload = {}) {
    apple.postMessage({action, ...payload});
  }
  window.lingoraSpeechResult = (token, failed) => {
    if (token !== current) return;
    const finished = completion;
    completion = null;
    if (finished) finished(failed);
  };
  return {
    read(key) {
      if (android) return android.readState();
      if (apple) return window.lingoraInitialState || '';
      return localStorage.getItem(key);
    },
    write(key, value) {
      if (android) android.saveState(value);
      else if (apple) { window.lingoraInitialState=value; sendIOS('save', {value}); }
      else localStorage.setItem(key, value);
    },
    stop() {
      current = -1;
      completion = null;
      if (android) android.stopVoice();
      else if (apple) sendIOS('stop');
    },
    speak(language, lines, token, done) {
      current = token;
      completion = done;
      if (android) android.speak(language, JSON.stringify(lines), token);
      else if (apple) sendIOS('speak', {language, lines, token});
      else window.lingoraSpeechResult(token, true);
    }
  };
})();
