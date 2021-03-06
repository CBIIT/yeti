const {BrowserWindow, Menu, app, shell, dialog} = require('electron')
const _=require('lodash')
const os = require('os')
const debug = _.find('--debug',process.argv)

menu_template = null

let template = [
  {
  label: 'File',
    submenu: [{
    label: 'New',
    accelerator: 'CmdOrCtrl+N',
    //role: 'new',
      click: () => {
        console.log('try-new')
      app.emit('try-new')
    }
    }, {     
    label: 'Open',
    accelerator: 'CmdOrCtrl+O',
    //role: 'open',
      click: () => {
        app.emit('try-open')
      }
  },
  {
    label: 'Close',
    accelerator: 'CmdOrCtrl+W',
    role: 'close'
  },{
    label: 'Save',
    accelerator: 'CmdOrCtrl+S',
    role: 'save',
    click: () => {
      app.emit('save-file-dialog')
    }
  }
  ]},
  {
  label: 'Edit',
  submenu: [{
    label: 'Undo',
    accelerator: 'CmdOrCtrl+Z',
    role: 'undo',
  }, {
    label: 'Undo YAML Edit',
    accelerator: 'Shift+CmdOrCtrl+Z',
    role: 'undo-yaml',
    click: () => {
      app.emit('undo-yaml-edit');
    }
  }, { type: 'separator'
  }, {
    label: 'Delete YAML Item',
    accelerator: 'Shift+CmdOrCtrl+D',
    click: () => { app.emit('delete-yaml-item') }
  }, {
    label: 'New YAML Item Above',
    accelerator: 'CmdOrCtrl+<',
    click: () => { app.emit('insert-yaml-before') }
   }, {
     label: 'New YAML Item Below',
    accelerator: 'CmdOrCtrl+>',
     click: () => { app.emit('insert-yaml-after') }
   }, {
     label: "Sort This Level",
     accelerator: 'F7',
     role: 'sort',
     click: () => {
         app.emit('sort-level')
     }
  }, {
    label: "Add Comment",
    accelerator: 'F12',
    role: 'comment',
    click: () => {
      app.emit('add-comment')
    }
  }, {
    type: 'separator'
  }, {
    label: 'Cut',
    accelerator: 'CmdOrCtrl+X',
    role: 'cut'
  }, {
    label: 'Copy',
    accelerator: 'CmdOrCtrl+C',
    role: 'copy'
  }, {
    label: 'Paste',
    accelerator: 'CmdOrCtrl+V',
    role: 'paste'
  }, {
    label: 'Select All',
    accelerator: 'CmdOrCtrl+A',
    role: 'selectall'
  }]
}, {
  label: 'View',
  submenu: [{
    label: 'Preview YAML',
    accelerator: 'CmdOrCtrl+Y',
    click: () => {
      app.emit('preview-yaml')
    }
  }, {
    label: 'Show/Hide Level',
    accelerator: 'F8',
    click: () => {
      app.emit('toggle-show-level')
    }
  }, {
    type: 'separator'
  }, {
    label: 'Toggle Full Screen',
    accelerator: (() => {
      if (process.platform === 'darwin') {
        return 'Ctrl+Command+F'
      } else {
        return 'F11'
      }
    })(),
    click: (item, focusedWindow) => {
      if (focusedWindow) {
        focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
      }
    }
  }]
}, {
  label: 'Window',
  role: 'window',
  submenu: [{
    label: 'Minimize',
    accelerator: 'CmdOrCtrl+M',
    role: 'minimize'
  }, {
    label: 'Close',
    accelerator: 'CmdOrCtrl+W',
    role: 'close'
  }, {
    type: 'separator'
  }, {
    label: 'Reopen Window',
    accelerator: 'CmdOrCtrl+Shift+T',
    enabled: false,
    key: 'reopenMenuItem',
    click: () => {
      app.emit('activate')
    }
  }]
}, {
  label: 'Help',
  role: 'help',
  submenu: [{
    label: 'yeti Tutorial',
    click: () => {
      shell.openExternal('https://github.com/CBIIT/yeti#tutorial')
    }
  }]
}]

let devtools_tmpl = {
  label: 'Dev Tools',
  submenu: [{
    label: 'Reload',
    accelerator: 'CmdOrCtrl+R',
    click: (item, focusedWindow) => {
      if (focusedWindow) {
        // on reload, start fresh and close any old
        // open secondary windows
        if (focusedWindow.id === 1) {
          BrowserWindow.getAllWindows().forEach(win => {
            if (win.id > 1) win.close()
          })
        }
        focusedWindow.reload()
      }
    }
  },{  
    label: 'Toggle Developer Tools',
    accelerator: (() => {
      if (process.platform === 'darwin') {
        return 'Alt+Command+I'
      } else {
        return 'Ctrl+Shift+I'
      }
    })(),
    click: (item, focusedWindow) => {
      if (focusedWindow) {
        focusedWindow.toggleDevTools()
      }
    }
  }]
};

if (debug) {
  let n = _.findIndex(template, function(i){ i.label == 'Window' })
  template.splice(n,0,devtools_templ)
}

function findReopenMenuItem () {
  const menu = Menu.getApplicationMenu()
  if (!menu) return

  let reopenMenuItem
  menu.items.forEach(item => {
    if (item.submenu) {
      item.submenu.items.forEach(item => {
        if (item.key === 'reopenMenuItem') {
          reopenMenuItem = item
        }
      })
    }
  })
  return reopenMenuItem
}

if (process.platform === 'darwin') {
  const name = app.name
  template.unshift({
    label: name,
    submenu: [{
      label: `About ${name}`,
      role: 'about'
    }, {
      type: 'separator'
    }, {
      label: 'Services',
      role: 'services',
      submenu: []
    }, {
      type: 'separator'
    }, {
      label: `Hide ${name}`,
      accelerator: 'Command+H',
      role: 'hide'
    }, {
      label: 'Hide Others',
      accelerator: 'Command+Alt+H',
      role: 'hideothers'
    }, {
      label: 'Show All',
      role: 'unhide'
    }, {
      type: 'separator'
    }, {
      label: 'Quit',
      accelerator: 'Command+Q',
      click: () => {
        app.quit()
      }
    }]
  })

  // Window menu.
  template[3].submenu.push({
    type: 'separator'
  }, {
    label: 'Bring All to Front',
    role: 'front'
  })

 // addUpdateMenuItems(template[0].submenu, 1)
}

if (process.platform === 'win32') {
  const helpMenu = template[template.length - 1].submenu
  // addUpdateMenuItems(helpMenu, 0)
}

// the menu is instantiated in the app here:
app.on('ready', () => {
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
})

app.on('browser-window-created', () => {
  let reopenMenuItem = findReopenMenuItem()
  if (reopenMenuItem) reopenMenuItem.enabled = false
})

app.on('window-all-closed', () => {
  let reopenMenuItem = findReopenMenuItem()
  if (reopenMenuItem) reopenMenuItem.enabled = true
})

/*
function addUpdateMenuItems (items, position) {
  if (process.mas) return

  const version = app.getVersion()
  let updateItems = [{
    label: `Version ${version}`,
    enabled: false
  }, {
    label: 'Checking for Update',
    enabled: false,
    key: 'checkingForUpdate'
  }, {
    label: 'Check for Update',
    visible: false,
    key: 'checkForUpdate',
    click: () => {
      require('electron').autoUpdater.checkForUpdates()
    }
  }, {
    label: 'Restart and Install Update',
    enabled: true,
    visible: false,
    key: 'restartToUpdate',
    click: () => {
      require('electron').autoUpdater.quitAndInstall()
    }
  }]

  items.splice.apply(items, [position, 0].concat(updateItems))
}
*/
