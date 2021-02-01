const electron = require('electron');
let app = electron.app;                     // Module to control application life.
let BrowserWindow = electron.BrowserWindow; // Module to create native browser window.

let mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
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