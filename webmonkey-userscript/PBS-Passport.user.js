// ==UserScript==
// @name         PBS Passport
// @description  Watch videos without a PBS Passport.
// @version      2.0.7
// @match        *://*.pbs.org/*
// @match        *://video.kqed.org/video/*
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
    "show_debug_alerts":            false,
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

// ----------------------------------------------------------------------------- helpers (debugging)

var debug_alert = function(msg) {
  if (user_options.common.show_debug_alerts) {
    unsafeWindow.alert(msg)
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
  process_video_page_01() ||
  process_video_page_02() ||
  process_video_page_03() ||
  process_video_page_04() ||
  process_video_page_05() ||
  process_video_page_06() ||
  setTimeout(
    process_video_page_03,
    2500
  )
}

var process_video_page_01 = function() {
  // method #1: extract video URLs from variables defined in javascript

  if (Array.isArray(unsafeWindow.__next_f)) {
    debug_alert('found array of raw data. length: ' + unsafeWindow.__next_f.length)
    for (var i=0; i < unsafeWindow.__next_f.length; i++) {
      if (Array.isArray(unsafeWindow.__next_f[i]) && (unsafeWindow.__next_f[i].length > 1) && (typeof unsafeWindow.__next_f[i][1] === 'string')) {
        if (process_video_page_raw_data_video_urls(unsafeWindow.__next_f[i][1], false)) return true
      }
    }
  }
  debug_alert('video JSON not found in defined variables')
  return false
}

var process_video_page_02 = function() {
  // method #2: extract video URLs from raw page content

  var scripts
  scripts = document.querySelectorAll('script')
  scripts = Array.prototype.slice.call(scripts)
  scripts = scripts.filter(function(s){return s.innerText.indexOf('\\"hls_videos\\"') !== -1})

  if (scripts.length) {
    debug_alert('found inline scripts containing raw data. length: ' + scripts.length)
    for (var i=0; i < scripts.length; i++) {
      if (process_video_page_raw_data_video_urls(scripts[i].innerText, true)) return true
    }
  }
  debug_alert('video JSON not found in script tags')
  return false
}

var process_video_page_raw_data_video_urls_regex = /(\{\\?"video\\?":\{.*?\\?"hls_videos\\?":\[.*?\\?"mp4_videos\\?":\[.*\\?"closed_captions\\?":\[.*?\})\],\\?"\$L/

var process_video_page_raw_data_video_urls = function(haystack, doublequotes_are_escaped) {
  var needle
  var HLS, MP4, VTT, SRT

  needle = process_video_page_raw_data_video_urls_regex.exec(haystack)
  if (needle) {
    try {
      needle = needle[1]
      needle = needle.replace(/\\(\\)/g, '$1')
      if (doublequotes_are_escaped)
        needle = needle.replace(/\\(")/g, '$1')
      needle = JSON.parse(needle)
      console.log(needle) // parsed object
      debug_alert('found and parsed video JSON')
    }
    catch(e){
      console.log('error', e)
      console.log(needle) // string that failed to parse
      debug_alert('found video JSON that failed to parse')
      needle = null
    }
  }
  if (needle) {
    try {
      HLS = (needle.video.hls_videos.length > 0) ? needle.video.hls_videos[0].url : null
      MP4 = (needle.video.mp4_videos.length > 0) ? needle.video.mp4_videos[0].url : null

      for (var i=0; i < needle.video.closed_captions.length; i++) {
        if (needle.video.closed_captions[i].profile === 'WebVTT')
          VTT = needle.video.closed_captions[i].url
        if (needle.video.closed_captions[i].profile === 'SRT')
          SRT = needle.video.closed_captions[i].url
      }

      process_video_urls(HLS, MP4, VTT, SRT)
      return true
    }
    catch(e) {
    }
  }
  return false
}

var process_video_page_03 = function() {
  // method #3: obtain URL for video player from iframe, which requires a very modern web browser to properly execute webpage javascript

  var iframe, url

  iframe = unsafeWindow.document.querySelector('iframe[src^="https://player.pbs.org/"],iframe[src^="//player.pbs.org/"]')

  if (iframe) {
    url = iframe.getAttribute('src')
    if (url.substring(0,2) === '//') url = 'https:' + url
    debug_alert('found video player iframe. url: ' + url)
    redirect_to_url(url)
    return true
  }
  debug_alert('video player iframe not found')
  return false
}

var process_video_page_04 = function() {
  // method #4: derive URL for video player from variables defined in javascript (defunct: these variables no-longer appear to be defined)

  var url

  if (unsafeWindow.PBS && unsafeWindow.PBS.playerConfig && unsafeWindow.PBS.playerConfig.embedURL && unsafeWindow.PBS.playerConfig.embedType && unsafeWindow.PBS.playerConfig.id) {
    url = unsafeWindow.PBS.playerConfig.embedURL + unsafeWindow.PBS.playerConfig.embedType + unsafeWindow.PBS.playerConfig.id
    debug_alert('found video player config. url: ' + url)
    redirect_to_url(url)
    return true
  }
  debug_alert('video player config not found')
  return false
}

var process_video_page_05 = function() {
  // method #5: extract video player URL from variables defined in javascript

  if (Array.isArray(unsafeWindow.__next_f)) {
    debug_alert('found array of raw data. length: ' + unsafeWindow.__next_f.length)
    for (var i=0; i < unsafeWindow.__next_f.length; i++) {
      if (Array.isArray(unsafeWindow.__next_f[i]) && (unsafeWindow.__next_f[i].length > 1) && (typeof unsafeWindow.__next_f[i][1] === 'string')) {
        if (process_video_page_raw_data_video_player_url(unsafeWindow.__next_f[i][1], false)) return true
      }
    }
  }
  debug_alert('video player JSON not found in defined variables')
  return false
}

var process_video_page_06 = function() {
  // method #6: extract video player URL from raw page content

  var scripts
  scripts = document.querySelectorAll('script')
  scripts = Array.prototype.slice.call(scripts)
  scripts = scripts.filter(function(s){return s.innerText.indexOf('\\"contentUrl\\"') !== -1})

  if (scripts.length) {
    debug_alert('found inline scripts containing raw data. length: ' + scripts.length)
    for (var i=0; i < scripts.length; i++) {
      if (process_video_page_raw_data_video_player_url(scripts[i].innerText, true)) return true
    }
  }
  debug_alert('video player JSON not found in script tags')
  return false
}

var process_video_page_raw_data_video_player_url_regex = /\\?"contentUrl\\?":\\?"(https:\/\/player\.pbs\.org\/[^\\"]+)\\?"/

var process_video_page_raw_data_video_player_url = function(haystack, doublequotes_are_escaped) {
  var needle, url

  needle = process_video_page_raw_data_video_player_url_regex.exec(haystack)
  if (needle) {
    url = needle[1]
    debug_alert('found video player config. url: ' + url)
    redirect_to_url(url)
    return true
  }
  return false
}

// ----------------------------------------------------------------------------- process video player

var process_video_player = function() {
  var HLS, MP4, VTT, SRT
  var vb, vid, txt

  try {
    vb = unsafeWindow.videoBridge
    if (!vb) throw ''

    vid = vb.encodings
    if (!vid || !vid.length) throw ''

    HLS = (vid.length > 0) ? vid[0] : null
    MP4 = (vid.length > 1) ? vid[1] : null

    txt = vb.cc
    VTT = (txt && txt.WebVTT) ? txt.WebVTT : null
    SRT = (txt && txt.SRT)    ? txt.SRT    : null

    process_video_urls(HLS, MP4, VTT, SRT)
  }
  catch(e) {}
}

var process_video_urls = function(HLS, MP4, VTT, SRT) {
  try {
    const resolve_urls = async () => {
      if (HLS) {
        HLS  = await resolve_redirected_url(HLS)
        HLS += '#video.m3u8'
      }
      else if (MP4) {
        MP4  = await resolve_redirected_url(MP4)
        MP4 += '#video.mp4'
      }

      const vid = HLS || MP4
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

      const txt = VTT || SRT

      process_video_url(/* video_url= */ vid, /* video_type= */ type, /* vtt_url= */ txt)
    }

    resolve_urls()
    .catch(e => {})
  }
  catch(e) {}
}

// ----------------------------------------------------------------------------- bootstrap

var init_video_page = function() {
  var hostname = unsafeWindow.location.hostname.toLowerCase()
  var pathname = unsafeWindow.location.pathname.toLowerCase()

  if ((hostname !== 'www.pbs.org') && (hostname !== 'video.kqed.org'))
    return false
  if (pathname.indexOf('/video/') !== 0)
    return false

  debug_alert('process: video page')
  process_video_page()
  return true
}

var init_video_player = function() {
  var hostname = unsafeWindow.location.hostname.toLowerCase()

  if (hostname !== 'player.pbs.org')
    return false

  debug_alert('process: video player')
  process_video_player()
  return true
}

var init = function() {
  var gmUrl
  if (typeof GM_getUrl === 'function') {
    gmUrl = GM_getUrl()
    if (gmUrl && (gmUrl !== unsafeWindow.location.href)) {
      debug_alert("init() bypass:\n\nCurrent window is stale:\n" + unsafeWindow.location.href + "\n\nWebView is loading:\n" + gmUrl)
      return
    }
  }

  init_video_page() || init_video_player()
}

if (document.readyState === 'complete')
  init()
else
  unsafeWindow.addEventListener('load', init)

// -----------------------------------------------------------------------------
