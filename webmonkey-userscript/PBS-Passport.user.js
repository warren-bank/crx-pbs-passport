// ==UserScript==
// @name         PBS Passport
// @description  Watch videos without a PBS Passport.
// @version      1.0.0
// @match        https://*.pbs.org/*
// @icon         https://www.pbs.org/static/images/favicons/favicon-32x32.png
// @run-at       document-end
// @homepage     https://github.com/warren-bank/crx-pbs-passport/tree/webmonkey-userscript/es6
// @supportURL   https://github.com/warren-bank/crx-pbs-passport/issues
// @downloadURL  https://github.com/warren-bank/crx-pbs-passport/raw/webmonkey-userscript/es6/webmonkey-userscript/PBS-Passport.user.js
// @updateURL    https://github.com/warren-bank/crx-pbs-passport/raw/webmonkey-userscript/es6/webmonkey-userscript/PBS-Passport.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

if ((unsafeWindow.location.hostname.toLowerCase() === 'www.pbs.org') && (unsafeWindow.location.pathname.toLowerCase().indexOf('/video/') === 0)) {
  try {
    const iframe = document.querySelector('iframe[src^="https://player.pbs.org/"]')

    if (iframe)
      unsafeWindow.location = iframe.getAttribute('src')
  }
  catch(e) {}
}
else if (unsafeWindow.location.hostname.toLowerCase() === 'player.pbs.org') {
  try {
    const resolve_redirected_url = (url) => {
      return (!url || (typeof url !== 'string'))
        ? Promise.resolve(null)
        : new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('GET', url, true)
            xhr.onprogress = () => {
              resolve(
                ((xhr.status >= 200) && (xhr.status < 300) && (xhr.responseURL !== url))
                  ? xhr.responseURL
                  : url
              )
              xhr.abort()
            }
            xhr.send()
          })
    }

    const extract_video = async () => {
      const vb = unsafeWindow.videoBridge
      if (!vb) throw ''

      let vid = vb.encodings
      if (!vid || !vid.length) throw ''

      let HLS = (vid.length > 0) ? vid[0] : null
      let MP4 = (vid.length > 1) ? vid[1] : null

      let txt = vb.cc
      let VTT = (txt && txt.WebVTT) ? txt.WebVTT : null
      let SRT = (txt && txt.SRT)    ? txt.SRT    : null

      if (HLS) {
        HLS  = await resolve_redirected_url(HLS)
        HLS += '#video.m3u8'
      }
      else if (MP4) {
        MP4  = await resolve_redirected_url(MP4)
        MP4 += '#video.mp4'
      }

      vid = HLS || MP4
      if (!vid) throw ''

      const type = (HLS) ? 'application/x-mpegurl' : 'video/mp4'

      if (VTT) {
        VTT  = await resolve_redirected_url(VTT)
        VTT += '#text.vtt'
      }
      else if (SRT) {
        SRT  = await resolve_redirected_url(SRT)
        SRT += '#text.srt'
      }

      txt = VTT || SRT

      const extras = []
      extras.push('referUrl')
      extras.push(unsafeWindow.location.href)
      if (txt) {
        extras.push('textUrl')
        extras.push(txt)
      }

      GM_startIntent(/* action= */ 'android.intent.action.VIEW', /* data= */ vid, /* type= */ type, /* extras: */ ...extras);
    }

    extract_video()
    .catch(e => {})
  }
  catch(e) {}
}
