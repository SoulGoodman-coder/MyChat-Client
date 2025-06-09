import WebSocket from "ws";
const NODE_ENV = process.env.NODE_ENV

import store from "./store";
import {insertOrUpdateChatSessionBatch4Init, insertOrUpdate4Message, selectUserSessionByContactId, updateGroupName} from './db/ChatSessionUserModel'
import { insertMessage, insertMessageBatch, updateMessage } from "./db/ChatMessageModel";
import { updateContactNoReadCount } from "./db/UserSettingModel";

let ws = null
let wsUrl = null
let sender = null
let needReconnect = null    // 是否重连
let maxReConnectTimes = null    // 重连次数
let lockReconnect = false       // ws重连的锁，重复连接
let intervalId = null       // 定时器id

const initWs = (config, _sender)=>{
    wsUrl = `${NODE_ENV === "development"? store.getData("devWsDomain") : store.getData("proWsDomain")}?token=${config.token}`
    console.log(wsUrl);
    sender = _sender
    needReconnect = true
    maxReConnectTimes = 5
    createWs()
}

const createWs = ()=>{
    if(wsUrl == null){
        return
    }
    ws = new WebSocket(wsUrl)

    // ws连接成功的回调函数
    ws.onopen = function () {
        console.log("客户端启动,ws连接成功");
        ws.send("heart beat")
        maxReConnectTimes = 5
    }

    // 从服务器接收到信息的回调函数
    ws.onmessage = async function (e) {
        console.log("收到服务器消息：", e.data);
        const message = JSON.parse(e.data)
        const messageType = message.messageType
        const leaveGroupUserId = message.extendData
        switch(messageType){
            case 0: //ws初始化消息
                // 保存会话信息 chat_session_user
                await insertOrUpdateChatSessionBatch4Init(message.extendData.chatSessionUserList)

                // 保存消息 chat_message
                await insertMessageBatch(message.extendData.chatMessageList)

                // 更新联系人申请未读数 user_setting
                await updateContactNoReadCount({noReadCount: message.extendData.applyCount})

                // 给渲染进程发送消息
                sender.send("receiveMessage", message.messageType)
                break;
            case 1: // 添加好友成功
            case 2: // 普通聊天消息
            case 3: // 创建群聊成功
            case 5: // 媒体文件发送消息（未上传下载）
            case 8: // 解散群聊
            case 9: // 好友加入群组
            case 11: // 退出群聊
            case 12: // 踢出群聊
                if(message.sendUserId == store.getUserId() && message.contactType == 1){
                    break
                }
                const sessionInfo = {}
                if(message.extendData && typeof message.extendData === "object"){
                    Object.assign(sessionInfo, message.extendData)
                }else{
                    Object.assign(sessionInfo, message)
                    if(message.contactType == 0 && messageType != 1){
                        sessionInfo.contactName = message.sendUserNickName
                    }
                    sessionInfo.lastReceiveTime = message.sendTime
                }

                // 加入退出群聊时修改群人数
                if(messageType == 9 || messageType == 11 || messageType == 12){
                    sessionInfo.memberCount = message.memberCount
                }

                await insertOrUpdate4Message(store.getUserData("currentSessionId"), sessionInfo)
                await insertMessage(message)

                const dbSessionInfo = await selectUserSessionByContactId(message.contactId)
                message.extendData = dbSessionInfo

                // 当前用户退出群聊，不需要给当前用户发消息
                if(messageType == 11 && leaveGroupUserId == store.getUserId()){
                    break;
                }

                sender.send("receiveMessage", message)
                break
            case 6: // 媒体文件上传服务器完成，接收方开始从服务器下载
                updateMessage({status: message.status}, {messageId: message.messageId})
                sender.send("receiveMessage", message)
                break
            case 4: // 好友申请
                await updateContactNoReadCount({userId: store.getUserId(), noReadCount: 1})
                sender.send("receiveMessage", {messageType: message.messageType})
                break
            case 10: // 联系人修改昵称
                updateGroupName(message.contactId, message.extendData)
                sender.send("receiveMessage", message)
                break
            case 7: // 强制下线
                sender.send("receiveMessage", message)
                closeWs()
                break
        }
    }
    
    // ws连接断开的回调函数
    ws.onclose = function () {
        console.log("关闭客户端准备重连");
        reconnect()
    }

    // 连接发生异常的回调函数
    ws.onerror = function () {
        console.log("连接失败准备重连");
        reconnect()
    }

    // 重连
    const reconnect = ()=>{
        if(!needReconnect){
            console.log("ws连接断开，无需重连");
            return
        }
        // 若原本的ws对象还存在，则关闭
        if(ws != null){
            ws.close()
        }

        // 若锁已被其他人拿到则退出，若锁还在则立即将锁设为true（不让其他人拿到锁）
        if(lockReconnect){
            return
        }
        lockReconnect = true
        // 重连
        if(maxReConnectTimes > 0){
            console.log("准备重连，剩余重连次数" + maxReConnectTimes, new Date().getTime());
            maxReConnectTimes --;
            setTimeout(() => {
                createWs()
                lockReconnect = false
            }, 5000);
        }else{
            console.log("ws连接超时, 重连失败");
        }
    }

    // 清除发送心跳定时器
    if(intervalId != null){
        clearInterval(intervalId)
    }

    // 定时器发送心跳
    intervalId = setInterval(() => {
        if(ws != null && ws.readyState == 1){
            ws.send("heart beat")
        }
    }, 5000);
}

const closeWs = ()=>{
    needReconnect = false
    ws.close()
}

export{
    initWs,
    createWs,
    closeWs,
}