
const {app, BrowserWindow, ipcMain, ipcRenderer, dialog} = require ('electron')

ipcMain.on('open-file-dialog', (event) => {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: { name: "YAML Files", extensions: ['yml', 'yaml'] }
  }, (files) => {
    if (files) {
      event.sender.send('selected-file', files)
    }
  })
})

ipcMain.on('save-file-dialog', (event) => {
  dialog.showSaveDialog({
    properties: ['openFile']
  }, (files) => {
    if (files) {
      event.sender.send('selected-file', files)
    }
  })
})
