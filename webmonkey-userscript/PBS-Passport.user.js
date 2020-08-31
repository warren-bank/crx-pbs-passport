// ==UserScript==
// @name         PBS Passport
// @description  Watch videos without a PBS Passport.
// @version      1.0.0
// @match        https://*.pbs.org/*
// @icon         https://www.pbs.org/static/images/favicons/favicon-32x32.png
// @run-at       document-end
// @homepage     https://github.com/warren-bank/crx-pbs-passport/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-pbs-passport/issues
// @downloadURL  https://github.com/warren-bank/crx-pbs-passport/raw/webmonkey-userscript/es5/webmonkey-userscript/PBS-Passport.user.js
// @updateURL    https://github.com/warren-bank/crx-pbs-passport/raw/webmonkey-userscript/es5/webmonkey-userscript/PBS-Passport.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

if ((unsafeWindow.location.hostname.toLowerCase() === 'www.pbs.org') && (unsafeWindow.location.pathname.toLowerCase().indexOf('/video/') === 0)) {
  try {
    var iframe = document.querySelector('iframe[src^="https://player.pbs.org/"]')

    if (iframe)
      unsafeWindow.location = iframe.getAttribute('src')
  }
  catch(e) {}
}
else if (unsafeWindow.location.hostname.toLowerCase() === 'player.pbs.org') {
  try {
    var vb = unsafeWindow.videoBridge
    if (!vb) throw ''

    var vid = vb.encodings
    if (!vid || !vid.length) throw ''

    var HLS = (vid.length > 0) ? (vid[0] + '#video.m3u8') : null
    var MP4 = (vid.length > 1) ? (vid[1] + '#video.mp4' ) : null

    vid = HLS || MP4
    if (!vid) throw ''

    var type = (HLS) ? 'application/x-mpegurl' : 'video/mp4'

    var txt = vb.cc
    var VTT = (txt && txt.WebVTT) ? (txt.WebVTT + '#text.vtt') : null
    var SRT = (txt && txt.SRT)    ? (txt.SRT    + '#text.srt') : null

    txt = VTT || SRT

    var extras = []
    extras.push('referUrl')
    extras.push(unsafeWindow.location.href)
    if (txt) {
      extras.push('textUrl')
      extras.push(txt)
    }

    var args = [
      'android.intent.action.VIEW',  /* action */
      vid,                           /* data   */
      type                           /* type   */
    ]

    for (var i=0; i < extras.length; i++) {
      args.push(extras[i])
    }

    GM_startIntent.apply(this, args)
  }
  catch(e) {}
}
