
const {app, BrowserWindow, ipcMain, ipcRenderer, dialog} = require ('electron')



ipcMain.on('open-file-dialog', (event) => {
  dialog.showOpenDialog({
    properties: ['openFile']
  }, (files) => {
    if (files) {
      event.sender.send('selected-file', files)
    }
  })
})
