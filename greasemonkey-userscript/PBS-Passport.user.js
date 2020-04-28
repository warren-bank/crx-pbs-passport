// ==UserScript==
// @name         PBS Passport
// @description  Play videos on PBS website without a PBS Passport. Optionally transfer video streams to alternate video players: WebCast-Reloaded, ExoAirPlayer.
// @version      0.2.0
// @match        *://player.pbs.org/*
// @icon         https://www.pbs.org/static/images/favicons/favicon-32x32.png
// @run-at       document-idle
// @homepage     https://github.com/warren-bank/crx-pbs-passport/tree/greasemonkey-userscript
// @supportURL   https://github.com/warren-bank/crx-pbs-passport/issues
// @downloadURL  https://github.com/warren-bank/crx-pbs-passport/raw/greasemonkey-userscript/greasemonkey-userscript/PBS-Passport.user.js
// @updateURL    https://github.com/warren-bank/crx-pbs-passport/raw/greasemonkey-userscript/greasemonkey-userscript/PBS-Passport.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// https://www.chromium.org/developers/design-documents/user-scripts

var user_options = {
  "script_injection_delay_ms":   0,
  "open_in_webcast_reloaded":    false,
  "open_in_exoairplayer_sender": true
}

var payload = function(){
  const get_media_urls = () => {
    let urls = null

    const vb = window.videoBridge
    if (!vb) return urls

    const vid = vb.encodings
    const txt = vb.cc

    if (!vid || !Array.isArray(vid) || !vid.length) return urls

    urls = {
      "m3u8": vid[0],
      "mp4" : ((vid.length > 1) ? vid[1] : null),
      "vtt" : ((txt && txt.WebVTT) ? txt.WebVTT : null),
      "srt" : ((txt && txt.SRT   ) ? txt.SRT    : null)
    }

    //Add video stream format hint to URLs, which do not directly include file extensions. They redirect to another URL which does. But this confuses many video players.
    if (urls.m3u8)
      urls.m3u8 += '#video.m3u8'
    if (urls.mp4)
      urls.mp4  += '#video.mp4'

    return urls
  }

  const transfer_stream = (urls) => {
    const vid_url = urls.m3u8 || urls.mp4
    const txt_url = urls.vtt  || urls.srt

    let encoded_vid_url, encoded_txt_url, webcast_reloaded_base, webcast_reloaded_url
    let encoded_referer_url, exoairplayer_base, exoairplayer_url

    encoded_vid_url       = encodeURIComponent(encodeURIComponent(btoa(vid_url)))
    encoded_txt_url       = txt_url ? encodeURIComponent(encodeURIComponent(btoa(txt_url))) : null
    webcast_reloaded_base = {
      "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
      "http":  "http://webcast-reloaded.surge.sh/index.html"
    }
    webcast_reloaded_base = (vid_url.toLowerCase().indexOf('https:') === 0)
                              ? webcast_reloaded_base.https
                              : webcast_reloaded_base.http
    webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_vid_url + (encoded_txt_url ? ('/subtitle/' + encoded_txt_url) : '')

    encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(top.location.href)))
    exoairplayer_base     = 'http://webcast-reloaded.surge.sh/airplay_sender.html'
    exoairplayer_url      = exoairplayer_base  + '#/watch/' + encoded_vid_url + (encoded_txt_url ? ('/subtitle/' + encoded_txt_url) : '') + '/referer/' + encoded_referer_url

    if (window.open_in_webcast_reloaded && webcast_reloaded_url) {
      top.location = webcast_reloaded_url
      return
    }

    if (window.open_in_exoairplayer_sender && exoairplayer_url) {
      top.location = exoairplayer_url
      return
    }
  }

  const rewrite_dom = (urls) => {
    try {
      var video_MP4, video_M3U8, url, source, body
      var video_links = {direct: {}, webcast: {}}

      var add_video_link_captions = function(c_type, c_url) {
        video_links.direct[c_type] = c_url

        ;['MP4', 'M3U8'].forEach(function(v_type){
          var v_url = video_links.direct[v_type]
          if (v_url) {
            video_links.webcast[v_type + ' + ' + c_type] = 'https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html#/watch/' + window.btoa(v_url) + '/subtitle/' + window.btoa(c_url)
          }
        })
      }

      var display_video_links = function() {
        var html, div, body

        html = ''
        ;['direct', 'webcast'].forEach(function(heading, index){
          if (index) html += '<hr />'

          html += '<h3>' + heading + '</h3>'

          html += '<ul>'
          for (var key in video_links[heading]) {
            html += `<li><a target="_blank" href="${video_links[heading][key]}">${key}</a></li>`
          }
          html += '</ul>'
        })

        div = document.createElement('div')
        div.innerHTML = html
        div.style.margin = '20px'

        body = document.getElementsByTagName('body')[0]
        body.appendChild(div)
      }

      // .mp4
      if (urls.mp4){
        url = urls.mp4

        // create <video> element
        video_MP4 = document.createElement('video')
        video_MP4.setAttribute('controls', 'controls')

        // create <source> element
        source = document.createElement('source')
        source.type = 'video/mp4'
        source.src = url

        video_MP4.appendChild(source)

        video_links.direct['MP4'] = url
        video_links.webcast['MP4'] = 'https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html#/watch/' + window.btoa(url)
      }

      // .m3u8
      if (urls.m3u8){
        url = urls.m3u8

        // create <video> element
        video_M3U8 = document.createElement('video')

        // create <source> element
        source = document.createElement('source')
        source.src = url

        video_M3U8.appendChild(source)

        video_links.direct['M3U8'] = url
        video_links.webcast['M3U8'] = 'https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html#/watch/' + window.btoa(url)
      }

      if (video_MP4 || video_M3U8){
        // add subtitles to "video_links" data structure

        // .vtt
        if (urls.vtt){
          add_video_link_captions('WebVTT', urls.vtt)
        }

        // .srt
        if (urls.srt){
          add_video_link_captions('SRT', urls.srt)
        }

        // update DOM: remove all previous content
        body = document.getElementsByTagName('body')[0]
        while (body.firstChild) body.removeChild(body.firstChild)

        // update DOM: add video elements
        if (video_MP4)  body.appendChild(video_MP4)
        if (video_M3U8) body.appendChild(video_M3U8)

        // update DOM: print "video_links" data structure
        display_video_links()
      }
    }
    catch(e){}
  }

  if (top.location != self.location){
    top.location = self.location.href
  }
  else {
    const urls = get_media_urls()
    if (!urls) return

    if (window.open_in_webcast_reloaded || window.open_in_exoairplayer_sender)
      transfer_stream(urls)
    else
      rewrite_dom(urls)
  }
}

var get_hash_code = function(str){
  var hash, i, char
  hash = 0
  if (str.length == 0) {
    return hash
  }
  for (i = 0; i < str.length; i++) {
    char = str.charCodeAt(i)
    hash = ((hash<<5)-hash)+char
    hash = hash & hash  // Convert to 32bit integer
  }
  return Math.abs(hash)
}

var inject_function = function(_function){
  var inline, script, head

  inline = _function.toString()
  inline = '(' + inline + ')()' + '; //# sourceURL=crx_extension.' + get_hash_code(inline)
  inline = document.createTextNode(inline)

  script = document.createElement('script')
  script.appendChild(inline)

  head = document.head
  head.appendChild(script)
}

var inject_options = function(){
  var _function = `function(){
    window.open_in_webcast_reloaded    = ${user_options['open_in_webcast_reloaded']}
    window.open_in_exoairplayer_sender = ${user_options['open_in_exoairplayer_sender']}
  }`
  inject_function(_function)
}

var inject_options_then_function = function(_function){
  inject_options()
  inject_function(_function)
}

setTimeout(
  function(){
    inject_options_then_function(payload)
  },
  user_options['script_injection_delay_ms']
)