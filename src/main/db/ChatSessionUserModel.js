import store from '../store';
import { run, queryOne, queryCount, queryAll, insertOrReplace, insertOrIgnore, update, insert} from './ADB'

const selectUserSessionByContactId = (contactId)=>{
    let sql = "select * from chat_session_user where user_id = ? and contact_id = ?"
    return queryOne(sql, [store.getUserId(), contactId])
}

const insertOrUpdateChatSessionBatch4Init = (chatSessionList)=>{
    return new Promise(async(resolve, reject) =>{
        try {
            for(let i = 0; i < chatSessionList.length; i++){
                const sessionInfo = chatSessionList[i]
                sessionInfo.status = 1;     // 会话状态 0：隐藏  1：可见
                let sessionData = await selectUserSessionByContactId(sessionInfo.contactId)
                // 数据存在则更新，不存在则插入
                if(sessionData){
                    const paramData = {
                        userId: store.getUserId(),
                        contactId: sessionInfo.contactId
                    }
                    const updateInfo = Object.assign({}, sessionInfo);
                    updateInfo.userId = null;
                    updateInfo.contactId = null;
                    await update('chat_session_user', updateInfo, paramData)
                }else{
                    await insertOrIgnore("chat_session_user", sessionInfo)
                }
            }
            resolve()
        } catch (error) {
            resolve()
        }
    })
}

// 更新消息未读数
const updateNoReadCount = ({contactId, noReadCount})=>{
    let sql = `update chat_session_user set no_read_count = no_read_count + ? where user_id = ? and contact_id = ?`
    return run(sql, [noReadCount, store.getUserId(), contactId])
}

// 查询用户会话信息
const selectUserSessionList = ()=>{
    let sql = `select * from chat_session_user where user_id = ? and status = 1`
    return queryAll(sql, [store.getUserId()])
}

// 删除聊天会话
const delChatSession = (contactId) =>{
    const paramData = {
        userId: store.getUserId(),
        contactId
    }
    const sessionInfo = {
        status: 0
    }
    return update("chat_session_user", sessionInfo, paramData)
}

// 置顶聊天会话
const topChatSession = (contactId, topType)=>{
    const paramData = {
        userId: store.getUserId(),
        contactId
    }
    const sessionInfo = {
        topType
    }
    return update("chat_session_user", sessionInfo, paramData)
}

// 更新会话信息
const updateSessionInfo4Message = async(currentSessionId, {sessionId, contactName, lastMessage, lastReceiveTime, contactId, memberCount})=>{
    const params = [lastMessage, lastReceiveTime]
    let sql = `update chat_session_user set last_message = ?, last_receive_time = ?, status = 1`
    if(contactName){
        sql = sql + ', contact_name = ?'
        params.push(contactName)
    }
    // 成员数量
    if(memberCount != null){
        sql = sql + ', member_count = ?'
        params.push(memberCount)
    }
    // 未选中当前会话时收到新消息，需要添加未读消息数
    if(sessionId !== currentSessionId){
        sql = sql + ', no_read_count = no_read_count + 1'
    }

    sql = sql + ' where user_id = ? and contact_id = ?'
    params.push(store.getUserId())
    params.push(contactId)
    return run(sql, params)
}

// 未读消息设置已读
const readAll = (contactId)=>{
    let sql = `update chat_session_user set no_read_count = 0 where user_id = ? and contact_id = ?`
    return run(sql, [store.getUserId(), contactId])
}

// 收到消息后更新本地数据库表
const insertOrUpdate4Message = (currentSessionId, sessionInfo)=>{
    return new Promise(async(resolve, reject) =>{
        let sessionData = await selectUserSessionByContactId(sessionInfo.contactId)
        if(sessionData){
            updateSessionInfo4Message(currentSessionId, sessionInfo)
        }else{
            sessionInfo.noReadCount = 1
            sessionInfo.userId = store.getUserId()
            await insertOrIgnore("chat_session_user", sessionInfo)
        }
        resolve()
    })
}

const updateGroupName = (contactId, groupName)=>{
    const paramData = {
        userId: store.getUserId(),
        contactId
    }
    const sessionInfo = {
        contactName: groupName
    }
    return update("chat_session_user", sessionInfo, paramData)
}

// 修改会话状态为显示
const updateStatus = (contactId)=>{
    const paramData = {
        userId: store.getUserId(),
        contactId
    }
    const sessionInfo = {
        status: 1
    }
    return update('chat_session_user', sessionInfo, paramData)
}

export{
    insertOrUpdateChatSessionBatch4Init,
    updateNoReadCount,
    selectUserSessionList,
    selectUserSessionByContactId,
    delChatSession,
    topChatSession,
    updateSessionInfo4Message,
    readAll,
    insertOrUpdate4Message,
    updateGroupName,
    updateStatus
}