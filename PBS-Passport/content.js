var payload = function(){
  if (top.location != self.location){
    top.location = self.location.href
  }
  else {
    try {
      var vb, encodings, video_MP4, video_M3U8, url, source, body
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

      vb = window.videoBridge
      if (vb){
        encodings = vb.encodings

        // .mp4
        if (encodings && encodings.length > 1){
          url = encodings[1]

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
        if (encodings && encodings.length > 0){
          url = encodings[0]

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
          encodings = vb.cc

          // .vtt
          if (encodings && encodings.WebVTT){
            add_video_link_captions('WebVTT', encodings.WebVTT)
          }

          // .srt
          if (encodings && encodings.SRT){
            add_video_link_captions('SRT', encodings.SRT)
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
