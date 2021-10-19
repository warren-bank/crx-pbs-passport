// ==UserScript==
// @name         PBS Passport
// @description  Watch videos without a PBS Passport.
// @version      2.0.3
// @match        *://pbs.org/*
// @match        *://*.pbs.org/*
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

// ----------------------------------------------------------------------------- constants

var user_options = {
  "common": {
    "resolve_media_urls":           true  // requires Chrome 37+
  },
  "webmonkey": {
    "post_intent_redirect_to_url":  "about:blank"
  },
  "greasemonkey": {
    "redirect_to_webcast_reloaded": true,
    "force_http":                   true,
    "force_https":                  false
  }
}

// ----------------------------------------------------------------------------- helpers

const resolve_redirected_url = (url) => {
  if (!url || ('string' !== (typeof url)))
    return Promise.resolve(null)

  if (!user_options.common.resolve_media_urls)
    return Promise.resolve(url)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.onprogress = () => {
      if ((xhr.status >= 200) && (xhr.status < 300)) {
        resolve(
          (xhr.responseURL && (xhr.responseURL !== url)) ? xhr.responseURL : url
        )
        xhr.abort()
      }
    }
    xhr.send()
  })
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.greasemonkey.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.greasemonkey.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
  referer_url           = referer_url ? referer_url : unsafeWindow.location.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + '/referer/' + encoded_referer_url
  return webcast_reloaded_url
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if (typeof GM_resolveUrl === 'function')
      url = GM_resolveUrl(url, unsafeWindow.location.href) || url

    GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_webmonkey_post_intent_redirect_to_url = function() {
  var url = null

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'string')
    url = user_options.webmonkey.post_intent_redirect_to_url

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'function')
    url = user_options.webmonkey.post_intent_redirect_to_url()

  if (typeof url === 'string')
    redirect_to_url(url)
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url) {
  if (!referer_url)
    referer_url = unsafeWindow.location.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ video_url,
      /* type   = */ video_type
    ]

    // extras:
    if (vtt_url) {
      args.push('textUrl')
      args.push(vtt_url)
    }
    if (referer_url) {
      args.push('referUrl')
      args.push(referer_url)
    }

    GM_startIntent.apply(this, args)
    process_webmonkey_post_intent_redirect_to_url()
    return true
  }
  else if (user_options.greasemonkey.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url))
    return true
  }
  else {
    return false
  }
}

var process_mp4_url = function(mp4_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ mp4_url, /* video_type= */ 'video/mp4', vtt_url, referer_url)
}

var process_hls_url = function(hls_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url)
}

var process_dash_url = function(dash_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url)
}

// ----------------------------------------------------------------------------- process video page

var process_video_page = function() {
  var iframe, url

  // method #1: requires a very modern web browser to properly execute webpage javascript

  iframe = unsafeWindow.document.querySelector('iframe[src^="https://player.pbs.org/"]')

  if (iframe) {
    url = iframe.getAttribute('src')
    redirect_to_url(url)
    return
  }

  // method #2: fallback to derive the URL of iframe from variables declared by webpage javascript

  if (unsafeWindow.PBS && unsafeWindow.PBS.playerConfig && unsafeWindow.PBS.playerConfig.embedURL && unsafeWindow.PBS.playerConfig.embedType && unsafeWindow.PBS.playerConfig.id) {
    url = unsafeWindow.PBS.playerConfig.embedURL + unsafeWindow.PBS.playerConfig.embedType + unsafeWindow.PBS.playerConfig.id
    redirect_to_url(url)
    return
  }
}

// ----------------------------------------------------------------------------- process video player

var process_video_player = function() {
  try {
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

      process_video_url(/* video_url= */ vid, /* video_type= */ type, /* vtt_url= */ txt)
    }

    extract_video()
    .catch(e => {})
  }
  catch(e) {}
}

// ----------------------------------------------------------------------------- bootstrap

var init_video_page = function() {
  var hostname = unsafeWindow.location.hostname.toLowerCase()
  var pathname = unsafeWindow.location.pathname.toLowerCase()

  if (hostname !== 'www.pbs.org')
    return false
  if (pathname.indexOf('/video/') !== 0)
    return false

  process_video_page()
  return true
}

var init_video_player = function() {
  var hostname = unsafeWindow.location.hostname.toLowerCase()

  if (hostname !== 'player.pbs.org')
    return false

  process_video_player()
  return true
}

var init = function() {
  if ((typeof GM_getUrl === 'function') && (GM_getUrl() !== unsafeWindow.location.href)) return

  init_video_page() || init_video_player()
}

init()

// -----------------------------------------------------------------------------
