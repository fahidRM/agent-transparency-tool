const electron = require('electron');
let app = electron.app;                     // Module to control application life.
let BrowserWindow = electron.BrowserWindow; // Module to create native browser window.
const ipcMain = electron.ipcMain;

let mainWindow = null;
let settingsWindow = null


// Launch the settings page
ipcMain.on('launch-settings-page', (event, arg) => {
    settingsWindow = new BrowserWindow({
        height: 600,
        maximizable: false,
        modal: true,
        parent: mainWindow,
        resizable: false,
        webPreferences: {
            enableRemoteModule: true,
            nodeIntegration: true
        },
        width: 400
    });
    settingsWindow.loadURL('file://' + __dirname + '/settings.html');
});

ipcMain.on('close-settings-page', (event, arg) => {
    settingsWindow.close();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
    // Create the browser window.
    mainWindow = new BrowserWindow(
        {
                height: 800,
                maximizable: false,
                resizable: false,
                webPreferences: {
                    enableRemoteModule: true,
                    nodeIntegration: true
                },
                width: 1200
            }
        );
    // and load the index.html of the app. => index
    mainWindow.loadURL('file://' + __dirname + '/index.html').then();
    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        mainWindow = null;
        app.exit(0);
    });
});