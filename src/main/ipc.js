import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
const NODE_ENV = process.env.NODE_ENV
import store from './store'
import { initWs, closeWs } from './wsClient'
import { addUserSetting, selectSettingInfo, updateContactNoReadCount, loadLocalUser } from './db/UserSettingModel'
import { selectUserSessionList, delChatSession, topChatSession, updateSessionInfo4Message, readAll, updateStatus } from './db/ChatSessionUserModel'
import { selectMessageList, insertMessage, updateMessage } from './db/ChatMessageModel'
import { saveFile2Local, createCover, saveAs, saveClipBoardFile, closeLocalServer, openLocalFolder, changeLocalFolder, downloadUpdate } from './file'
import { delWindow, getWindow, savaWindow } from './windowProxy'

// 登录注册切换
const onLoginOrRegister = (callback) => {
    ipcMain.on("loginOrRegister", (e, isLogin) => {
        callback(isLogin)
    })
}

// 登录成功
const onLoginSuccess = (callback) => {
    ipcMain.on("openChat", (e, data) => {
        // 保存用户信息到内存
        store.initUserId(data.userId)
        store.setUserData("token", data.token)
        
        // 将用户配置写入数据库
        addUserSetting(data.userId, data.email)

        callback(data)
        // 初始化ws
        initWs(data, e.sender)
    })
}

// 窗口按钮操作
const onWinTitleOp = (callback)=>{
    ipcMain.on("winTitleOp", (e, data) => {
        callback(e, data)
    })
}

const onSetLocalStore = (callback) =>{
    ipcMain.on("setLocalStore", (e, {key, value}) => {
        console.log("setLocalStore:" + key + "=" + value);
        store.setData(key, value)
    })
}

const onGetLocalStore = ()=>{
    ipcMain.handle("getLocalStore", async(e, key) => {
        console.log("收到渲染进程的获取事件：" + key);
        return await store.getData(key)
    })
}

// 加载聊天会话信息
const onLoadSessionData = ()=>{
    ipcMain.handle("loadChatSession", async(e) => {
        const result = await selectUserSessionList()
        return result
    })
}

// 置顶聊天会话
const onTopChatSession = ()=>{
    ipcMain.on("topChatSession", (e, {contactId, topType}) => {
        topChatSession(contactId, topType)
    })
}

// 删除聊天会话
const onDelChatSession = ()=>{
    ipcMain.on("delChatSession", (e, contactId) => {
        delChatSession(contactId)
    })
}

// 加载聊天消息
const onLoadChatMessage = ()=>{
    ipcMain.handle("loadChatMessage", async(e, data) => {
        const result = await selectMessageList(data)
        return result
    })
}

// 保存发送的聊天消息到本地
const onAddLocalMessage = ()=>{
    ipcMain.on("addLocalMessage", async(e, data) => {
        await insertMessage(data)
        // 如果是文件消息，还需要保存文件
        if(data.messageType == 5){
            await saveFile2Local(data.messageId, data.filePath, data.fileType)

            // 更新消息状态
            const updateInfo = {
                status: 1
            }
            await updateMessage(updateInfo, {messageId: data.messageId})
        }

        // 更新chatSession
        data.lastReceiveTime = data.sendTime
        await updateSessionInfo4Message(store.getUserData("currentSessionId"), data)
        e.sender.send("addLocalMessageCallback", {status: 1, messageId: data.messageId}) 
    })
}

// 记录当前选中的会话
const onSetSessionSelect = ()=>{
    ipcMain.on("setSessionSelect", (e, {contactId, sessionId}) => {
        if(sessionId){
            store.setUserData("currentSessionId", sessionId)
            // 清空未读消息
            readAll(contactId)
        }else{
            store.deleteUserData("currentSessionId")
        }
    })
}

// 生成缩略图
const onCreateCover = ()=>{
    ipcMain.handle("createCover", async(e, localFilePath) => {
        const steam = await createCover(localFilePath);
        return steam;
    })
}

// 打开新窗口（查询媒体消息详情）
const onOpenNewWindow = ()=>{
    ipcMain.on("newWindow", async(e, config) => {
        openWindow(config)
    })
}

const openWindow = ({windowId, title='MyChat', path, width=960, hight=720, data})=>{
    const localServerPort = store.getUserData("localServerPort")
    data.localServerPort = localServerPort
    let newWindow = getWindow(windowId)
    if(!newWindow){
        newWindow = new BrowserWindow({
            width: width,
            height: hight,
            fullscreenable: false,
            fullscreen: false,
            maximizable: false,
            autoHideMenuBar: true,      // 隐藏工具栏
            titleBarStyle: "hidden",    // 隐藏标题栏
            resizable: false,           // 禁止改变窗口大小
            frame: true,                // 无边框窗口(只保留主体部分,标题、icon、菜单栏、收起/全屏/关闭选项等全部隐藏)
            transparent: true,          // 透明窗口
            icon: icon,
            hasShadow: false,
            webPreferences: {
                preload: join(__dirname, '../preload/index.js'),
                sandbox: false,
                contextIsolation: false
            }
        })
        savaWindow(windowId, newWindow)
        newWindow.setMinimumSize(600, 484)
        if(is.dev && process.env['ELECTRON_RENDERER_URL']){
            newWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#${path}`)
        }else{
            newWindow.loadURL(join(__dirname, `../renderer/index.html`), {hash: `${path}`})
        }
        // 开发环境下打开开发者工具
        if(NODE_ENV === "development"){
            newWindow.webContents.openDevTools({mode:'detach'});
        }
        newWindow.on('ready-to-show', () => {
            newWindow.setTitle(title)
            newWindow.show()
        })
        newWindow.once('show', ()=>{
            setTimeout(()=>{
                newWindow.webContents.send('pageInitData', data)
            }, 500)
        })
        newWindow.on('closed', ()=>{
            delWindow(windowId)
        })
    }else{
        newWindow.show()
        newWindow.setSkipTaskbar(false)
        newWindow.webContents.send('pageInitData', data)
    }
}

// 下载文件
const onSaveAs = () =>{
    ipcMain.on("saveAs", async(e, data) => {
        saveAs(data)
    })
}

// 粘贴截图
const onSaveClipBoardFile = ()=>{
    ipcMain.handle("saveClipBoardFile", async(e, data) => {
        const result = await saveClipBoardFile(data)
        return result
    })
}

// 获取未读好友申请数
const onLoadContactApply = ()=>{
    ipcMain.handle("loadContactApply", async(e) => {
        const userId = store.getUserId()
        let result = await selectSettingInfo(userId)
        let contactNoRead = 0
        if(result != null){
            contactNoRead = result.contactNoRead
        }
        return contactNoRead
    })
}

// 处理联系人好友申请 数量已读
const onUpdateCountNoReadCount = ()=>{
    ipcMain.on("updateCountNoReadCount", async(e) => {
        updateContactNoReadCount({})
    })
}
  
// 重新登录（退出登录）
const onReLogin = (callback)=>{
    ipcMain.on("reLogin", async(e) => {
        callback()
        e.sender.send("reLoginCallback")
        closeWs()
        closeLocalServer()
    })
}

// 打开文件夹
const onOpenLocalFolder = ()=>{
    ipcMain.on("openLocalFolder", async(e) => {
        openLocalFolder()
    })
}

// 获取用户设置
const onGetSysSetting = ()=>{
    ipcMain.on("getSysSetting", async(e) => {
        let result = await selectSettingInfo(store.getUserId())
        let sysSetting = result.sysSetting
        e.sender.send("getSysSettingCallback", sysSetting) 
    })
}

// 更改文件保存路径
const onChangeLocalFolder = ()=>{
    ipcMain.on("changeLocalFolder", async(e) => {
        changeLocalFolder()
    })
}

// 重新加载聊天会话
const onReloadChatSession = ()=>{
    ipcMain.on("reloadChatSession", async(e, {contactId}) => {
        // 修改会话状态为显示状态
        await updateStatus(contactId)
        let newChatSessionList = await selectUserSessionList()
        e.sender.send("reloadChatSessionCallback", {contactId, newChatSessionList}) 
    })
}

// 打开url
const onOpenUrl = ()=>{
    ipcMain.on("openUrl", async(e, {url}) => {
        shell.openExternal(url)
    })
}

// 下载更新安装包
const onDownloadUpdate = ()=>{
    ipcMain.on("downloadUpdate", async(e, { id, fileName }) => {
        downloadUpdate(id, fileName)
    })
}

// 加载本地用户（登录过的用户）
const onLoadLocalUser = ()=>{
    ipcMain.handle("loadLocalUser", async(e) => {
        return await loadLocalUser()
    })
}

export{
    onLoginOrRegister,
    onLoginSuccess,
    onWinTitleOp,
    onSetLocalStore,
    onGetLocalStore,
    onLoadSessionData,
    onDelChatSession,
    onTopChatSession,
    onLoadChatMessage,
    onAddLocalMessage,
    onSetSessionSelect,
    onCreateCover,
    onOpenNewWindow,
    onSaveAs,
    onSaveClipBoardFile,
    onLoadContactApply,
    onUpdateCountNoReadCount,
    onReLogin,
    onOpenLocalFolder,
    onGetSysSetting,
    onChangeLocalFolder,
    onReloadChatSession,
    onOpenUrl,
    onDownloadUpdate,
    onLoadLocalUser,
    openWindow
}