<template>
  <div class="send-panel">
    <div class="toolbar">
        <el-popover
            :visible="showEmojiPopover"
            trigger="click"
            placement="top"
            :teleported="false"
            @show="openPopover"
            @hide="closePopover"
            :popper-style="{
                padding: '0px 10px 10px 10px',
                width: '490px'
            }"
        >
            <template #default>
                <el-tabs v-model="activeEmoji" @click.stop="">
                    <el-tab-pane :label="emoji.name" :name="emoji.name" v-for="(emoji, index) in emojiList" :key="index">
                        <div class="emoji-list">
                            <div class="emoji-item" v-for="(item, idx) in emoji.emojiList" :key="idx" @click="sendEmoji(item)">{{ item }}</div>
                        </div>
                    </el-tab-pane>
                </el-tabs>
            </template>
            <template #reference>
                <div class="iconfont icon-emoji" @click="showEmojiPopoverHandler"></div>
            </template>
        </el-popover>
        <el-upload
            ref="uploadRef"
            name="file"
            :show-file-list="false"
            :multiple="true"
            :limit="fileLimit"
            :http-request="uploadFile"
            :on-exceed="uploadExceed"
        >
            <div class="iconfont icon-folder"></div>
        </el-upload>
    </div>
    <div class="input-area" @drop="dropHandler" @dragover="dragOverHandler">
        <el-input 
            rows="5"
            v-model="msgContent"
            type="textarea"
            resize="none"
            maxlength="500"
            show-word-limit
            spellcheck="false"
            input-style="background: #f5f5f5; border: none"
            @keydown.enter="sendMessage"
            @paste="pasteFile"
            >
        </el-input>
    </div>
    <div class="send-btn-panel">
        <el-popover
            trigger="click"
            :visible="showSendMsgPopover"
            :hide-after="1500"
            placement="top-end"
            :teleported="false"
            @show="openPopover"
            @hide="closePopover"
            :popper-style="{
                padding: '5px',
                'min-width': '0px',
                width: '120px'
            }"
        >
            <template #default> <span class="empty-msg">不能发送空白消息</span> </template>
            <template #reference>
                <span class="send-btn" @click="sendMessage">发送(S)</span>
            </template>
        </el-popover>
    </div>
    <!-- 添加好友 -->
    <SearchAdd ref="searchAddRef"></SearchAdd>
  </div>
</template>

<script setup>
import { getFileType } from '@/utils/Constants';
import SearchAdd from '@/views/contact/SearchAdd.vue'
import emojiList from "@/utils/Emoji.js";
import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();
import { useRouter, useRoute } from "vue-router";
const router = useRouter()
const route = useRoute()

import {useUserInfoStore} from '@/stores/UserInfoStore'
const userInfoStore = useUserInfoStore()
import {useSysSettingStore} from '@/stores/SysSettingStore'
const sysSettingStore = useSysSettingStore()

const props = defineProps({
    currentChatSession:{
        type: Object,
        default: {}
    }
})

const emit = defineEmits(['sendMessage4Local'])

const activeEmoji = ref("笑脸")
const msgContent = ref('')
const showEmojiPopover  = ref(false)

// 空白消息提示标识
const showSendMsgPopover = ref(false)
// 隐藏空白消息提示/隐藏emoji表情栏
const hidePopover = ()=>{
    showSendMsgPopover.value = false
    showEmojiPopover.value = false
}

// 发送消息
const sendMessage = (e)=>{
    // shift + enter 换行
    if(e.shiftKey && e.keyCode === 13){
        return
    }
    e.preventDefault();
    
    const messageContent = msgContent.value ? msgContent.value.replace(/\s*$/g, ''): ''
    // 输入为空 提示
    if (messageContent == ""){
        showSendMsgPopover.value = true
        return
    }

    sendMessageDo({messageContent, messageType: 2}, true) 
}

const sendMessageDo = async(messageObj = {messageContent, messageType, localFilePath, fileSize, fileName, filePath, fileType}, cleanMsgContent)=>{
    // 判断文件大小
    if(!checkFileSize(messageObj.fileType, messageObj.fileSize, messageObj.fileName)){
        return
    }
    if(messageObj.fileSize == 0){
        proxy.Confirm({
            message: `${messageObj.fileName}是一个空文件，无法发送，请重新选择！`,
            showCancelBtn: false
        })
        return
    }
    messageObj.sessionId = props.currentChatSession.sessionId
    messageObj.sendUserId = userInfoStore.getInfo().userId

    let result = await proxy.Request({
        url: proxy.Api.sendMessage,
        mode: 'POST',
        params: {
            contactId: proxy.currentChatSession.contactId,
            messageContent: messageObj.messageContent,
            messageType: messageObj.messageType,
            fileSize: messageObj.fileSize,
            fileName: messageObj.fileName,
            fileType: messageObj.fileType
        },
        showError: false,
        errorCallback: (responseData) =>{
            proxy.Confirm({
                message: responseData.msg,
                okfun: ()=>{
                    addContact(props.currentChatSession.contactId, responseData.code)
                },
                okText: '重新申请'
            })
        }
    })
    if (!result) {
        return;
    }
    if(cleanMsgContent){
        msgContent.value = ''
    }
    Object.assign(messageObj, result.data)
    // 更新本地消息
    emit("sendMessage4Local", messageObj)

    // 保存消息到本地
    window.ipcRenderer.send('addLocalMessage', messageObj)
}

const uploadExceed = (files)=>{
    checkFileLimit(files)
}

const uploadRef = ref()

// 选择文件发送
const uploadFile = (file)=>{
    uploadFileDo(file.file)
    // 清空选择的文件
    uploadRef.value.clearFiles()
}

const uploadFileDo = (file)=>{
    const fileType = getFileType(file.name)
    sendMessageDo({
        messageContent: '['+ getFileType(fileType) +']',
        messageType: 5,
        fileSize: file.size,
        fileName: file.name,
        filePath: file.path,
        fileType: fileType
    }, false)
}

// 添加好友
const searchAddRef = ref()
const addContact = (contactId, code)=>{
    searchAddRef.value.show({
        contactId,
        contactType: code == 902? 'USER': 'GROUP'
    })
}

const sendEmoji = (emoji)=>{
    msgContent.value = msgContent.value + emoji 
    showEmojiPopover.value = false
}

const showEmojiPopoverHandler = ()=>{
    showEmojiPopover.value = true
}

const openPopover = () =>{
    document.addEventListener("click", hidePopover, false)
}

const closePopover = ()=>{
    document.removeEventListener("click", hidePopover, false)
}

// 校验文件大小
const checkFileSize = (fileType, fileSize, fileName)=>{
    const SIZE_MB = 1024*1024
    const settingArray = Object.assign(sysSettingStore.getSetting())
    const fileSizeNumber = settingArray[fileType]
    if(fileSize > fileSizeNumber * SIZE_MB){
        proxy.Confirm({
            message: `文件${fileName}超过大小${fileSizeNumber}MB限制`,
            showCancelBtn: false
        })
        return false
    }
    return true
}

// 校验发送文件数量
const fileLimit = 10    // 一会最多发送10个文件
const checkFileLimit = (files) =>{
    if(files.length > fileLimit){
        proxy.Confirm({
            message: `一次最多可以上传10个文件`,
            showCancelBtn: false
        })
        return;
    }
    return true
}

// 拖入文件
const dragOverHandler = (e)=>{  // 拖入文件未松开鼠标时
    e.preventDefault()
}
const dropHandler = (event)=>{       // 拖入文件松开鼠标后
    event.preventDefault()
    const files = event.dataTransfer.files
    if(!checkFileLimit(files)){
        return
    }
    for(let i = 0; i < files.length; i ++){
        uploadFileDo(files[i])
    }
}

// 粘贴
const pasteFile = async(event)=>{
    let items = event.clipboardData && event.clipboardData.items
    const fileData = {}
    for (const item of items){
        console.log(item);
        // 不需要处理非文件粘贴事件
        if(item.kind != 'file'){
            break
        }
        const file = await item.getAsFile()
        if(file.path != ''){    // 复制的文件粘贴（有路径）
            uploadFileDo(file)
        }else{                  // 截图粘贴（无路径）
            const imageFile = new File([file], 'temp.jpg')
            let fileReader = new FileReader()
            fileReader.onloadend = async function () {
                const byteArray = new Uint8Array(this.result)
                fileData.byteArray = byteArray
                fileData.name = imageFile.name
                const clipBoardFile = await window.ipcRenderer.invoke('saveClipBoardFile', fileData)
                const fileType = 0
                sendMessageDo({
                    messageContent: '['+ getFileType(fileType) +']',
                    messageType: 5,
                    fileSize: clipBoardFile.size,
                    fileName: clipBoardFile.name,
                    filePath: clipBoardFile.path,
                    fileType: fileType
                }, false)
            }
            fileReader.readAsArrayBuffer(imageFile)
        }

    }
}
</script>

<style lang="scss" scoped>
.emoji-list{
    .emoji-item{
        float: left;
        font-size: 23px;
        padding: 2px;
        text-align: center;
        border-radius: 3px;
        margin-left: 10px;
        margin-top: 5px;
        cursor: pointer;
        &:hover{
            background: #ddd;
        }
    }
}
.send-panel{
    height: 200px;
    border-top: 1px solid #ddd;
    .toolbar{
        height: 40px;
        display: flex;
        align-items: center;
        padding-left: 10px;
        .iconfont{
            color: #494949;
            font-size: 20px;
            margin-left: 10px;
            cursor: pointer;
        }
        :deep(.el-tabs__header){
            margin-bottom: 0px;
        }
    }
    .input-area{
        padding: 0px 10px;
        outline: none;
        width: 100%;
        height: 115px;
        overflow: auto;
        word-wrap: break-word;
        word-break: break-all;
        :deep(.el-textarea__inner){
            box-shadow: none;
        }
        :deep(.el-input__count){
            background: none;
            right: 12px;
        }
    }
    .send-btn-panel{
        text-align: right;
        padding-top: 10px;
        margin-right: 22px;
        .send-btn{
            cursor: pointer;
            color: #07c160;
            background: #e9e9e9;
            border-radius: 5px;
            padding: 8px 25px;
            &:hover{
                background: #d2d2d2;
            }
        }
        .empty-msg{
            font-size: 13px;
        }
    }
}

</style>
