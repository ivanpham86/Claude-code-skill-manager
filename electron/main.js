const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import handlers
const initHandler = require('./handlers/initHandler');
const skillHandler = require('./handlers/skillHandler');
const gitHandler = require('./handlers/gitHandler');
const searchHandler = require('./handlers/searchHandler');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  if (!app.isPackaged) {
    // Dev mode
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  await initHandler.initializeApp();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-config', initHandler.getConfig);
ipcMain.handle('set-config', (e, data) => initHandler.setConfig(data));

ipcMain.handle('list-installed-skills', skillHandler.listInstalledSkills);
ipcMain.handle('install-skill', (e, data) => skillHandler.installSkill(data));
ipcMain.handle('uninstall-skill', (e, skillId) => skillHandler.uninstallSkill(skillId));

ipcMain.handle('search-skills', (e, data) => searchHandler.searchSkills(data));
ipcMain.handle('parse-github-repo', (e, data) => gitHandler.parseGitHubRepo(data));
ipcMain.handle('load-skill-description', (e, data) => gitHandler.loadSkillDescription(data));

module.exports = { app, createWindow };