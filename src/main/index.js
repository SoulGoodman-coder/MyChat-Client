import { app, shell, BrowserWindow, Menu, Tray } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
const NODE_ENV = process.env.NODE_ENV

import{ onLoginOrRegister, onLoginSuccess, onWinTitleOp, onSetLocalStore, onGetLocalStore, onLoadSessionData, onDelChatSession,
  onTopChatSession, onLoadChatMessage, onAddLocalMessage, onSetSessionSelect, onCreateCover, onOpenNewWindow, onSaveAs, onSaveClipBoardFile,
  onLoadContactApply, onUpdateCountNoReadCount, onReLogin, onOpenLocalFolder, onGetSysSetting, onChangeLocalFolder, onReloadChatSession,
  onOpenUrl, onDownloadUpdate, onLoadLocalUser, openWindow } from './ipc'
import { savaWindow } from './windowProxy'

const login_width = 300;
const login_hight = 370;
const register_width = 490;

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: login_width,
    height: login_hight,
    show: false,
    autoHideMenuBar: true,      // 隐藏工具栏
    titleBarStyle: "hidden",    // 隐藏标题栏
    resizable: false,           // 禁止改变窗口大小
    frame: true,                // 无边框窗口(只保留主体部分,标题、icon、菜单栏、收起/全屏/关闭选项等全部隐藏)
    transparent: true,          // 透明窗口
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: false
    }
  })

  // 保存主窗口对象到内存
  savaWindow("main", mainWindow)

  // 开发环境下打开开发者工具
  if(NODE_ENV === "development"){
    mainWindow.webContents.openDevTools({mode:'detach'});
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.setTitle('MyChat')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 托盘
  const tray = new Tray(icon)
  const contextMenu = [
    {
      label: '退出MyChat',
      click: function () {
        app.exit()
      }
    }
  ]
  const menu =  Menu.buildFromTemplate(contextMenu)
  tray.setToolTip("MyChat")
  tray.setContextMenu(menu)
  tray.on('click', ()=>{
    mainWindow.setSkipTaskbar(false)
    mainWindow.show()
  })

  /* 监听渲染进程的消息 */
  // 监听登录注册切换消息
  onLoginOrRegister((isLogin) => {
    mainWindow.setResizable(true);
    if(isLogin){
      mainWindow.setSize(login_width, login_hight)
    }else{
      mainWindow.setSize(login_width, register_width)
    }
    mainWindow.setResizable(false);
  })
  // 监听登录成功，打开聊天页面消息
  onLoginSuccess((data) => {
    mainWindow.setResizable(true)
    mainWindow.setSize(850, 800)
    mainWindow.center()             // 居中显示
    mainWindow.setMaximizable(true) // 可以最大化
    mainWindow.setMinimumSize(600, 800) // 最小窗口大小

    // 管理员账号需要做管理后台窗口操作、托盘操作
    if(data.admin){
      contextMenu.unshift({
        label: '管理后台', click: function () {
          openWindow({
            windowId: 'admin',
            title: '管理后台',
            path: '/admin',
            width: data.screenWidth * 0.8,
            height: data.screenHight * 0.8,
            data: {
              token: data.token
            }
          })
        }
      })
    }
    contextMenu.unshift(
      {
        label: '用户：'+ data.nickName,
        click: function () {
          
        }
      }
    )
    tray.setContextMenu(Menu.buildFromTemplate(contextMenu))
  })

  // 窗口按钮操作
  onWinTitleOp((e, {action, data}) => {
    // 获取当前操作窗口
    const win = BrowserWindow.fromWebContents(e.sender);
    switch(action){
      case 'close':{  // 关闭
        if(data.closeType == 0){
          // 关闭
          win.close()
        }else{
          // 隐藏
          win.setSkipTaskbar(true)
          win.hide()
        }
        break;
      }
      case 'minimize':{ // 最小化
        win.minimize()
        break
      }
      case 'maximize':{ // 最大化
        win.maximize()
        break
      }
      case 'unmaximize':{ // 取消最大化
        win.unmaximize()
        break
      }
      case 'top':{ // 置顶
        win.setAlwaysOnTop(data.top, 'screen-saver')
        break
      }
    }
  })

  onSetLocalStore()
  onGetLocalStore()
  onLoadSessionData()
  onDelChatSession()
  onTopChatSession()
  onLoadChatMessage()
  onAddLocalMessage()
  onSetSessionSelect()
  onCreateCover()
  onOpenNewWindow()
  onSaveAs()
  onSaveClipBoardFile()
  onLoadContactApply()
  onUpdateCountNoReadCount()
  // 退出登录（强制下线）
  onReLogin(()=>{
    mainWindow.setResizable(true)
    mainWindow.setMinimumSize(login_width, login_hight)
    mainWindow.setSize(login_width, login_hight)
    mainWindow.center()
    mainWindow.setResizable(false)
  })
  onOpenLocalFolder()
  onGetSysSetting()
  onChangeLocalFolder()
  onReloadChatSession()
  onOpenUrl()
  onDownloadUpdate()
  onLoadLocalUser()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
    process.env.LANG = 'en_US.UTF-8';
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
