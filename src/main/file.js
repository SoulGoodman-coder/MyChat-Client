const fs = require('fs')
const fse = require('fs-extra')
const NODE_ENV = process.env.NODE_ENV
const path = require('path')
const {app, ipcMain, shell, dialog} = require('electron')
const {exec} = require('child_process')
const FormData = require('form-data')
const axios = require('axios')
import { title } from 'process'
import { selectByMessageId } from './db/ChatMessageModel'
import store from './store'
import { selectSettingInfo, updateSysSetting } from './db/UserSettingModel'
import { getWindow } from './windowProxy'
const moment = require('moment')
moment.locale('zh-cn', {})

// express 服务器
const express = require('express')
const expressServer = express()

const cover_image_suffix = "_cover.png"
const image_suffix = ".png"

const ffmpegPath = "/assets/ffmpeg.exe"
const ffprobePath = "/assets/ffprobe.exe"

const getResourcesPath = () =>{
    let resourcesPath = app.getAppPath()
    if(NODE_ENV !== "development"){
        resourcesPath = path.dirname(app.getPath("exe")) + '/resources'
    }
    return resourcesPath
}

const getFFprobePath = ()=>{
    return path.join(getResourcesPath(), ffprobePath)
}

const getFFmpegPath = ()=>{
    return path.join(getResourcesPath(), ffmpegPath)
}

// 执行cmd命令
const execCommand = (command) =>{
    return new Promise((resolve, reject) =>{
        exec(command, (error, stdout, stdrr)=>{
            console.log("ffmpeg命令：", command);
            if(error){
                console.log("执行命令失败", error);
            }
            resolve(stdout)
        })
    })
}

const getDomain = ()=>{
    return NODE_ENV !== "development" ? store.getData("proDomain") : store.getData("devDomain")
}

const saveFile2Local = (messageId, filePath, fileType) =>{
    return new Promise(async(resolve, reject) =>{
        let savePath = await getLocalFilePath('chat', false, messageId)
        let coverPath = null
        fs.copyFileSync(filePath, savePath)

        if(fileType != 2){
            let command = `${getFFprobePath()} -v error -select_streams v:0 -show_entries stream=codec_name "${filePath}"`
            let result = await execCommand(command)
            result = result.replaceAll('\r\n', '')
            result = result.substring(result.indexOf('=') + 1)
            let codec = result.substring(0, result.indexOf('['))
            console.log(codec);
            
            // hevc格式转换
            if(codec == "hevc"){
                command = `${getFFmpegPath()} -y -i "${filePath}" -c:v libx264 -crf 20 "${savePath}"`
                await execCommand(command)
            }
            
            // 生成缩略图
            coverPath = savePath + cover_image_suffix
            command = `${getFFmpegPath()} -i "${savePath}" -y -vframes 1 -vf "scale=min(170\\,iw*min(170/iw\\,170/ih)):min(170\\,ih*min(170/iw\\,170/ih))" "${coverPath}"`
            await execCommand(command)
        }
        // 上传文件到服务器
        uploadFile(messageId, savePath, coverPath)
        resolve()
    })
}

//上传文件到服务器
const uploadFile = (messageId, savePath, coverPath) =>{
    const formData = new FormData()
    formData.append("messageId", messageId)
    formData.append("file", fs.createReadStream(savePath))
    if(coverPath){
        formData.append("cover", fs.createReadStream(coverPath))
    }

    const url = `${getDomain()}/api/chat/uploadFile`
    const token = store.getUserData("token")
    const config = {headers: {'Content-Type': 'multipart/form-data', 'token': token}}
    axios.post(url, formData, config)
         .then((response)=>{

         })
         .catch((error) =>{
            console.log("文件上传失败", error);
         })
}


const getLocalFilePath = (partType, showCover, fileId) =>{
    return new Promise(async(resolve, reject) =>{
        let localFolder = store.getUserData('localFileFolder')
        let localPath = null
        if(partType == 'avatar'){
            localFolder = localFolder + "/avatar/"
            if(!fs.existsSync(localFolder)){
                fse.mkdirsSync(localFolder)
            }
            localPath = localFolder + fileId + image_suffix
        }else if(partType == 'chat'){
            const messageInfo = await selectByMessageId(fileId)
            const month = moment(Number.parseInt(messageInfo.sendTime)).format("YYYYMM")
            localFolder = localFolder + '/' + month
            if(!fs.existsSync(localFolder)){
                fse.mkdirsSync(localFolder)
            }
            const fileName = messageInfo.fileName
            const fileSuffix = fileName.substring(fileName.lastIndexOf("."))
            localPath = localFolder + '/' + fileId + fileSuffix
        }else if(partType == 'tmp'){
            localFolder = localFolder + "/tmp"
            if(!fs.existsSync(localFolder)){
                fse.mkdirsSync(localFolder)
            }
            localPath = localFolder + '/' + fileId
        }

        if(showCover){
            localPath = localPath + cover_image_suffix
        }

        resolve(localPath)
    })
}

let server= null
const startLocalServer = (serverPort) =>{
    server = expressServer.listen(serverPort, ()=>{
        console.log("express服务在 http://127.0.0.1:" + serverPort + " 开启");
    })
}

const closeLocalServer = ()=>{
    if(server){
        server.close()
    }
}

const FILE_TYPE_CONTENT_TYPE = {
    "0": "image/",
    "1": "video/",
    "2": "application/octet-stream",
}


// 获取本地文件
expressServer.get("/file", async(req, res) => {
    let {partType, fileId, fileType, showCover, forceGet} = req.query;
    if( !partType || !fileId){
        res.send("请求参数错误")
        return
    }
    showCover = showCover == undefined? false: Boolean(showCover)
    const localPath = await getLocalFilePath(partType, showCover, fileId)
    // 强制获取
    if(!fs.existsSync(localPath) || forceGet == 'true' ){
        if(forceGet == 'true' && partType == 'avatar'){
            // 强制获取头像时，先获取头像缩略图
            await downloadFile(fileId, true, localPath + cover_image_suffix, partType)
        }
        await downloadFile(fileId, showCover, localPath, partType)
    }
    const fileSuffix = localPath.substring(localPath.lastIndexOf('.')+1)
    let contentType = FILE_TYPE_CONTENT_TYPE[fileType] + fileSuffix
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', contentType)

    if(showCover || fileType != '1'){
        fs.createReadStream(localPath).pipe(res)
        return
    }
    let stat = fs.statSync(localPath)
    let fileSize = stat.size
    let range = req.headers.range
    console.log(range);
    if(range){
        let parts = range.replace(/bytes=/, '').split('-')
        let start = parseInt(parts[0], 10)
        let end = parts[1] ? parseInt(parts[1], 10): start + 999999
        end = end > fileSize -1 ? fileSize - 1: end
        let chunksize = (end - start) + 1
        let stream = fs.createReadStream(localPath, {start, end})
        let head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-length': chunksize,
            'Content-Type': 'video/mp4'
        }
        res.writeHead(206, head)
        stream.pipe(res)
    }else{
        let head = {
            'Content-length': fileSize,
            'Content-Type': 'video/mp4'
        }
        res.writeHead(200, head)
        fs.createReadStream(localPath).pipe(res)
    }
    return
})

// 从服务器下载文件
const downloadFile = (fileId, showCover, savePath, partType)=>{
    showCover = showCover + ''  // axios请求参数只能是字符串
    let url = `${getDomain()}/api/chat/downloadFile`
    const token = store.getUserData("token")
    return new Promise(async(resolve, reject) =>{
        const config = {
            responseType: 'stream',
            headers: {'Content-Type': 'multipart/form-data', 'token': token}
        }
        let response = await axios.post(url, {
            fileId,
            showCover
        }, config)
        const folder = savePath.substring(0, savePath.lastIndexOf("/"))
        if(!fs.existsSync(folder)){
            fse.mkdirsSync(folder)
        }
        const stream = fs.createWriteStream(savePath)
        // 若获取文件出错，则返回默认图片
        if(response.headers["Content-Type"] == "application/json" || response.headers["content-length"] == "0"){
            let resourcesPath = getResourcesPath()
            if(partType == "avatar"){
                fs.createReadStream(resourcesPath + "/assets/user.png").pipe(stream)
            }else{
                fs.createReadStream(resourcesPath + "/assets/404.png").pipe(stream)
            }
        }else{
            response.data.pipe(stream)
        }
        stream.on("finish", ()=>{
            stream.close()
            resolve()
        })
    })
}

// 生成缩略图
const createCover = (filePath)=>{
    return new Promise(async(resolve, reject) =>{
        let ffmpegPath = getFFmpegPath()
        // 对用户上传图片的体积进行压缩
        let avatarPath = await getLocalFilePath("avatar", false, store.getUserId() + "_temp")
        let command = `${ffmpegPath} -i "${filePath}" "${avatarPath}" -y`
        await execCommand(command)

        // 生成缩略图
        let coverPath = await getLocalFilePath("avatar", false, store.getUserId() + "_temp_cover")
        command = `${ffmpegPath} -i "${filePath}" -y -vframes 1 -vf "scale=min(170\\,iw*min(170/iw\\,170/ih)):min(170\\,ih*min(170/iw\\,170/ih))" "${coverPath}"`
        await execCommand(command)
        resolve({
            avatarStream: fs.readFileSync(avatarPath),
            coverStream: fs.readFileSync(coverPath)
        })
    })
}

// 下载文件
const saveAs = async ({partType, fileId})=>{
    let fileName = ''
    if(partType == "avatar"){
        fileName = fileId + image_suffix
    }else if(partType == 'chat'){
        let messageInfo = await selectByMessageId(fileId)
        fileName = messageInfo.fileName
    }
    const localPath = await getLocalFilePath(partType, false, fileId)
    const options = {
        title: '保存文件',
        defaultPath: fileName
    }
    let result = await dialog.showSaveDialog(options)
    if(result.canceled || result.filePath == ''){
        return
    }
    const filePath = result.filePath
    fs.copyFileSync(localPath, filePath)
}

// 粘贴截图
const saveClipBoardFile = async (file)=>{
    const fileSuffix = file.name.substring(file.name.lastIndexOf("."))
    const filePath = await getLocalFilePath("tmp", false, 'tmp' + fileSuffix)
    let byteArray = file.byteArray
    const buffer = Buffer.from(byteArray)
    fs.writeFileSync(filePath, buffer)
    return{
        size: byteArray.length,
        name: file.name,
        path: filePath
    }
}

// 打开文件夹
const openLocalFolder = async()=>{
    let settingInfo = await selectSettingInfo(store.getUserId())
    const sysSetting = JSON.parse(settingInfo.sysSetting)
    const localFileFolder = sysSetting.localFileFolder
    if(!fs.existsSync(localFileFolder)){
        fse.mkdirsSync(localFileFolder)
    }
    shell.openPath('file:///' + localFileFolder)
}

// 更改文件保存路径
const changeLocalFolder = async()=>{
    let settingInfo = await selectSettingInfo(store.getUserId())
    const sysSetting = JSON.parse(settingInfo.sysSetting)
    const localFileFolder = sysSetting.localFileFolder 
    const options = {
        properties: ['openDirectory'],
        defaultPath: localFileFolder
    }
    let result = await dialog.showOpenDialog(options)
    if(result.canceled){
        return
    }

    // 修改了文件保存路径，将文件从旧路径拷贝到新路径
    const newFileFolder = result.filePaths[0]
    if(localFileFolder !== newFileFolder + '\\'){
        const userId = store.getUserId()
        getWindow('main').webContents.send("copyingCallback")
        await fse.move(localFileFolder + "/" + userId, newFileFolder + "/" + userId)
    }
    sysSetting.localFileFolder = newFileFolder + "\\"
    const sysSettingJson = JSON.stringify(sysSetting)
    await updateSysSetting(sysSettingJson)
    store.setUserData("localFileFolder", sysSetting.localFileFolder + store.getUserId())
    getWindow('main').webContents.send("getSysSettingCallback", sysSettingJson)

}

const downloadUpdate = async (id, fileName)=>{
    let url = `${store.getData('domain')}/api/update/download`
    const token = store.getUserData("token")
    const config = {
        responseType: 'stream',
        headers: {'Content-Type': 'multipart/form-data', 'token': token},
        onDownloadProgress(progress){
            const loaded = progress.loaded
            getWindow("main").webContents.send("updateDownloadCallback", loaded)
        }
    }
    const response = await axios.post(url, {id}, config)
    const localFile = await getLocalFilePath(null, false, fileName)
    const stream = fs.createWriteStream(localFile)
    response.data.pipe(stream)
    stream.on('finish', async()=>{
        stream.close()
        // 开始安装
        const command = `${localFile}`
        execCommand(command)
    })
}

export{
    saveFile2Local,
    startLocalServer,
    closeLocalServer,
    createCover,
    saveAs,
    saveClipBoardFile,
    openLocalFolder,
    changeLocalFolder,
    downloadUpdate
}