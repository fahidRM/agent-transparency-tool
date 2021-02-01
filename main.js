var app = require('electron').app;  // Module to control application life.
//var ipc =  require('ipc');
var fs =  require('fs');
var BrowserWindow = require('electron').BrowserWindow; // Module to create native browser window.
const ipcMain = require('electron').ipcMain;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;


// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
        app.quit();
    }
});


var print_req = null;

ipcMain.on('print-request', (event, arg) => {
    //load
});

ipcMain.on('print-ready', (event, arg) =>{
   // event.sender.send('print-details', print_req);
});



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {

    // Create the browser window.
    mainWindow = new BrowserWindow(
        {
                height: 800,
                webPreferences: {
                    nodeIntegration: true
                },
                width: 1200
            }
        );

    // and load the index.html of the app. => index
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
});