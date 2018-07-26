var payload = function(){
  if (top.location != self.location){
    top.location = self.location.href
  }
  else {
    try {
      var vb, video_MP4, video_M3U8, encoding, url, source, track, body

      vb = window.videoBridge
      if (vb){

        // .mp4
        encoding = vb.alternate_encoding
        if (encoding && encoding.url){
          url = encoding.url

          // create <video> element
          video_MP4 = document.createElement('video')
          video_MP4.setAttribute('controls', 'controls')

          // create <source> element
          source = document.createElement('source')
          source.type = 'video/mp4'
          source.src  = url

          video_MP4.appendChild(source)
        }

        // .m3u8
        encoding = vb.recommended_encoding
        if (encoding && encoding.url){
          url = encoding.url

          // create <video> element
          video_M3U8 = document.createElement('video')

          // create <source> element
          source = document.createElement('source')
          source.src = url

          video_M3U8.appendChild(source)
        }

        // .vtt
        encoding = vb.cc
        if (encoding && encoding.WebVTT && video_MP4){
          url = encoding.WebVTT

          // create <track> element
          track = document.createElement('track')
          track.label = 'subtitles'
          track.kind  = 'subtitles'
          track.src   = url
          track.setAttribute('default', 'default')

          video_MP4.appendChild(track)
          video_MP4.setAttribute('crossorigin', 'anonymous')
        }

        if (video_MP4 || video_M3U8){
          // update <body> element
          body = document.getElementsByTagName('body')[0]
          while (body.firstChild) body.removeChild(body.firstChild)

          if (video_MP4)  body.appendChild(video_MP4)
          if (video_M3U8) body.appendChild(video_M3U8)
        }
      }
    }
    catch(e){}
  }
}

var inject_payload = function(){
  var inline, script, head

  inline = document.createTextNode(
    '(' + payload.toString() + ')()'
  )

  script = document.createElement('script')
  script.appendChild(inline)

  head = document.getElementsByTagName('head')[0]
  head.appendChild(script)
}

if (document.readyState === 'complete'){
  inject_payload()
}
else {
  document.onreadystatechange = function(){
    if (document.readyState === 'complete'){
      inject_payload()
    }
  }
}
