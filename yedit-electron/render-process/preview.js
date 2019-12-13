const $ = require('jquery')
const {ipcRenderer} = require('electron')

$(function () {
  ipcRenderer
    .on('display', function (event, yaml) {
      $('pre').text(yaml)
    })
  $("pre").text("what")
  ipcRenderer.send('should-be-ready-now')
})
