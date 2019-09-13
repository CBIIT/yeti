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

const {app, Menu, shell, dialog, BrowserWindow} = require('electron')


const debug = /--debug/.test(process.argv[2])

if (process.mas) app.setName('yedit')

let mainWindow = null

function initialize () {
  makeSingleInstance()
  loadMainProc()
  function createWindow () {
    const windowOptions = {
      width: 1080,
      minWidth: 680,
      height: 840,
      title: app.getName(),
      webPreferences: {
        nodeIntegration: true
      }
    }

    if (process.platform === 'linux') {
      //      windowOptions.icon = path.join(__dirname, '/assets/app-icon/png/512.png')
    }

    mainWindow = new BrowserWindow(windowOptions)
    // mainWindow.loadURL(path.join('file://', __dirname, templates, '/index.html'))

    mainWindow.loadURL(path.join('file://', __dirname, templates, '/index.pug'))
    //   mainWindow.loadURL(path.join('file://', __dirname, assets, '/try.html'))

    // Launch fullscreen with DevTools open, usage: npm run debug
    if (debug) {
      mainWindow.webContents.openDevTools()
      mainWindow.maximize()
      require('devtron').install()
    }

    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }

  app.on('ready', async () => {
    try {
      let pug = await setupPug({}, locals)
      pug.on('error', err => console.error('electron-pug error', err))
    } catch(e) {
      console.error("Couldn't initialize electron-pug:", e);
    }
    createWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
  
  app.on('open-file-dialog', (event) => {
    if (mainWindow === null) {
      app.emit('activate')
      app.emit('open-file-dialog')
    }
    else {
      dialog.showOpenDialog({
        properties: ['openFile']
      }, (files) => {
        if (files) {
          let ydoc=null
          try {
            let inf = fs.readFileSync(files[0],'utf8')
            ydoc = YAML.parseDocument(inf, { prettyErrors: true })
            console.info(`${files[0]} parse succeeded`)
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
              dialog.showMessageBox(mainWindow, {
                type:"error",
                message: `There's a problem: ${ename}\nDetails: `+e.prototype.message
              })
            }
            return
          }
          mainWindow.webContents.send('selected-yaml', ydoc)
        }
      })
    }
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

initialize()
