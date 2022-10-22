const {app, BrowserWindow, ipcMain} = require('electron')

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 350+48,
    height: 450+48,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    autoHideMenuBar: true,
    center: true,
    title: "Acord Installer",
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('./web/index.html');
}

ipcMain.on("quit", ()=>{
  app.quit();
});

ipcMain.on("getPath", (e, v)=>{
  try {
    e.returnValue = app.getPath(v);
  } catch {
    e.returnValue = "";
  }
});

app.whenReady().then(async () => {
  await new Promise(r=>setTimeout(r, 300));
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})