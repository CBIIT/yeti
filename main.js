// require('update-electron-app')({
//   logger: require('electron-log')
// })

const path = require('path')
const fs = require('fs')
const YAML = require('yaml')
const glob = require('glob')
const setupPug = require('electron-pug')
const locals = {}

const assets = '/render-process'
const templates = assets+'/templates'
const stylesheets = assets+'/stylesheets'
const splashTime = 3000

const {app, Menu, shell, dialog, ipcMain, BrowserWindow} = require('electron')


const debug = /--debug/.test(process.argv[2])

var isDirty = false
var fileIsOpen = false

if (process.mas) app.setName('yedit')

let mainWindow = null
let previewWindow = null
let errorWindow = null

function initialize () {
  makeSingleInstance()
  loadMainProc()
  function createWindow () {
    const windowOptions = {
      width: 1080,
      minWidth: 680,
      height: 840,
      title: app.name,
      webPreferences: {
        nodeIntegration: true
      }
    }

    if (process.platform === 'linux') {
      //      windowOptions.icon = path.join(__dirname, '/assets/app-icon/png/512.png')
    }
    
    mainWindow = new BrowserWindow(windowOptions)

    mainWindow.loadURL(path.join('file://', __dirname, templates, '/index.pug'))
    // Launch fullscreen with DevTools open, usage: npm run debug
    if (debug) {
      mainWindow.webContents.openDevTools()
      mainWindow.maximize()
      require('devtron').install()
    }

    mainWindow.on('close', (e)=> {
      if (isDirty) {
        e.preventDefault()
        let res = dialog.showMessageBoxSync(
          mainWindow,
          {buttons: ['Proceed', 'Save', 'Cancel'],
           defaultId: 2,
           type: 'warning',
           message: "You have unsaved work; proceed to close?",
           title: 'Sure to close?'})
        switch (res) {
        case 2: // cancel
          break
        case 0: //proceed
          isDirty=false
          mainWindow.close()
          break
        case 1: //save
          app.emit('save-file-dialog')
          break
        default:
          console.error("what?")
        }
      } 
      else {
        fileIsOpen = false
        isDirty = false
      }
    })
    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }
  var splash;
  
  app.on('ready', async () => {
    try {
      let pug = await setupPug({}, locals)
      pug.on('error', err => console.error('electron-pug error', err))
    } catch(e) {
      console.error("Couldn't initialize electron-pug:", e);
    }
    splash = new BrowserWindow(
      {show:false, height:450, width:525,
       resizable:false, movable:false, skipTaskbar:true,
       transparent: false, frame: false, alwaysOnTop: true,
       webPreferences: { nodeIntegration: true }
      })
    splash.loadURL(path.join('file://', __dirname, templates, '/splash.pug'))
    app.on('splash', (timeout) => {
      splash.show()
      ipcMain.once('splash-setup-done', () => {
        splash.webContents.send('timeout', timeout)
      })
    })
    app.on('splash-off', () => {
      splash.destroy()
      splash = null
    })
    let timeout = setTimeout( () => {
      if (!splash.isDestroyed()) app.emit('open-file-dialog');
      app.emit('splash-off'); }, splashTime)
    app.emit('splash', timeout)

  })

  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      mainWindow=null
      let res = dialog.showMessageBoxSync({
	type:"question",
	buttons:['Open','New','Quit'],
	message:"Open document, create new one, or quit?",
	cancelId: 0
      })
      switch (res) {
      case 0: // open
	app.emit('open-file-dialog')
	break
      case 1: // new
	app.emit('new-yaml')
	break
      case 2: // quit
	app.quit()
	break
      }
    }
  })

  app.on('try-open', (event) => {
    if (!fileIsOpen) {
      app.emit('open-file-dialog');
    }
    else {
      dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        message: "Close current file first."
      })
    }
  })

  app.on('try-new', (event) => {
    if (!fileIsOpen) {
      app.emit('new-yaml')
    }
    else {
      dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        message: "Close current file first."
      })
    }
  })
  
  app.on('open-file-dialog', (event) => {
    if (mainWindow === null) {
      app.emit('activate')
      app.once('main-setup-done', () => {
        app.emit('open-file-dialog')
      })
    }
    else {
      let files = dialog.showOpenDialogSync(mainWindow, {
        properties: ['openFile'],
        filters: { name: "YAML Files", extensions: ['yml', 'yaml'] }
      })
      if (files) {
        let file = files[0]
        let inf=null
        try {
          inf = fs.readFileSync(file,'utf8')
        }
        catch (e) {
          let ename = e.name
          if (ename.match(/^YAML/)) {
            dialog.showMessageBox(mainWindow, {
              type:"error",
              message:`${files[0]} has an ${ename}\nDetails: `+e.message
            })
            console.error(e.name, e.message)
          }
          else {
            console.error(e)
            dialog.showMessageBox(mainWindow, {
              type:"error",
              message: `There\'s a problem: ${ename}\nDetails: `+e.message
            })
          }
          return
        }
        mainWindow.webContents.send('selected-yaml', file, inf)
      }
      else {
        console.debug("open file dialog cancelled by user")
      }
    }
  })

  app.on('save-file-dialog', (event) => {
    if (mainWindow === null) {
      app.emit('activate')
      app.once('main-setup-done', () => {
        app.emit('save-file-dialog')
      })
    }
    else {
      let file = dialog.showSaveDialogSync(mainWindow, {
        defaultPath: 'out.yaml',
      })
      if (file) {
        mainWindow.webContents.send('selected-save-yaml', file)
      }
      else {
        console.debug("save file dialog canceled by user")
      }
    }
  })

  app.on('new-yaml', (event) => {
    if (mainWindow == null) {
      app.emit('activate')
      app.once('setup-done', () => {
        app.emit('new-yaml')
      })
    }
    else {
      fileIsOpen=true
      isDirty=true
      mainWindow.webContents.send('create-new-yaml')
    }
  })
  app.on('insert-yaml-before', (event) => {
    if (mainWindow == null) {
      return
    }
    else {
      mainWindow.webContents.send('insert-yaml-before')
    }
  })
  app.on('insert-yaml-after', (event) => {
    if (mainWindow == null) {
      return
    }
    else {
      mainWindow.webContents.send('insert-yaml-after')
    }
  })
  app.on('delete-yaml-item', (event) => {
    if (mainWindow == null) {
      return
    }
    else {
      mainWindow.webContents.send('delete-yaml-item')
    }
  })
  app.on('sort-level', (event) => {
    if (mainWindow == null) {
      return
    }
    else {
      mainWindow.webContents.send('sort-level')
    }
  })
  app.on('add-comment', (event) => {
    if (mainWindow == null) {
      return
    }
    else {
      mainWindow.webContents.send('add-comment')
    }
  })
  app.on('toggle-show-level', (event) => {
    if (mainWindow == null) {
      return
    }
    else {
      mainWindow.webContents.send('toggle-show-level')
    }
  })  
  app.on('undo-yaml-edit', (event) => {
    if (mainWindow == null) {
      return
    }
    else {
      mainWindow.webContents.send('undo-yaml-edit')
    }
  })
  app.on('preview-yaml', (event) => {
    if (mainWindow == null) {
      return
    }
    else {
      mainWindow.webContents.send('dispatch-yaml-string')
    }
  })

  app.on('preview-window', (event, yaml) => {
    previewWindow = new BrowserWindow({parent:mainWindow, title:"YAML preview", webPreferences: {nodeIntegration:true}});
    previewWindow
      .loadFile(path.join(__dirname, templates, "yaml.pug"))
    previewWindow.on('close', () => { previewWindow = null })    
  })

  app.on('error-window', (event) => {
    errorWindow = new BrowserWindow({parent:mainWindow, title:"YAML errors", webPreferences: {nodeIntegration:true}});
    errorWindow
      .loadFile(path.join(__dirname, templates, "errors.pug"))
    errorWindow.on('close', () => { errorWindow = null })
  })
  
  ipcMain.on('main-setup-done', (event) => {
    app.emit('main-setup-done')
  })
  ipcMain.on('preview-setup-done', (event) => {
    app.emit('preview-setup-done')
  })
  ipcMain.on('splash-setup-done', (event) => {
    app.emit('splash-setup-done')
  })
  ipcMain.on('open-success', (event) => {
    fileIsOpen = true
    isDirty = false
  })
  ipcMain.on('create-success', (event) => {
    fileIsOpen = true
    isDirty = false
  })
  
  ipcMain.on('yaml-string', (event, yaml) => {
    ipcMain.once('preview-setup-done', () => {
      previewWindow.webContents.send('display',yaml)
    })
    app.emit('preview-window', yaml)
  })

  ipcMain.on('yaml-errors', (event, filename, errors) => {
    ipcMain.once('errors-setup-done', () => {
      errorWindow.webContents.send('display',filename,errors)
    })
    app.emit('error-window')
  })
  
  ipcMain.on('dirty', () => {
    if (process.platform == 'darwin') {
      mainWindow.setDocumentEdited(true)
    }
    isDirty = true
  })
  
  ipcMain.on('clean', () => {
    if (process.platform == 'darwin') {
      mainWindow.setDocumentEdited(false)
    }
    isDirty = false
  })
  
  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow()
    }
  })
}

// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function makeSingleInstance () {
  if (process.mas) return

  app.requestSingleInstanceLock()

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Require each JS file in the main-process dir
function loadMainProc () {
  const files = glob.sync(path.join(__dirname, 'main-process/**/*.js'))
  files.forEach((file) => { require(file) })
}

function add_ynode_ids (ydoc) {
  let i = 0;
  let walk = function (n) {
    n.id = `n${i}`
    i = i+1;
    switch (n.type) {
    case 'PAIR':
      walk(n.value)
      break
    case 'MAP':
      n.items.forEach( (d) => { walk(d) })
      break
    case 'SEQ':
      n.items.forEach( (d) => { walk(d) })
      break
    default:
      1;
    }
  }
  walk(ydoc.contents)
  return true
}

initialize()
