const $ = require('jquery')
const {ipcRenderer} = require('electron')
// text display of YAML errors

$(function () {
  ipcRenderer
    .on('display', function (event, filename, errors) {
      
      errors.forEach( (e) => {
        $('#file').text(filename)
        $('ul')
          .append(
            "<li><span class='yaml-error-loc'>"+
              `Line ${e.linePos.start.line} at column ${e.linePos.start.col}`+
              `</span> (<span style="font-family:monospace;">${e.name}</span>)`+
              "<div class='yaml-error-msg'><pre>"+
              `${e.message}`+
              "</pre></div></li>"
          )
      })
    })
  ipcRenderer.send('setup-done')
})
