const $ = require('jquery')
const {ipcRenderer} = require('electron')
var timeout_id
$(function () {
  window.onclick = function() {
    clearTimeout(timeout_id)
    window.close()
  }
  ipcRenderer
    .on('timeout', function( event, toid ) {
      timeout_id = toid
     ipcRenderer.send('got-timeout', timeout_id)
    })
  ipcRenderer
    .send('splash-setup-done')
})
