import store from '../store'
import {
  run,
  queryOne,
  queryCount,
  queryAll,
  insertOrReplace,
  insertOrIgnore,
  update,
  insert
} from './ADB'
import { updateNoReadCount } from './ChatSessionUserModel'

const insertMessage = (data) => {
  data.userId = store.getUserId()
  return insertOrReplace('chat_message', data)
}

const insertMessageBatch = (chatMessageList) => {
  return new Promise(async (resolve, reject) => {
    const chatSessionCountMap = {}
    // 统计消息未读数
    chatMessageList.forEach((item) => {
      let contactId = item.contactType == 0 ? item.sendUserId : item.contactId
      let noReadCount = chatSessionCountMap[contactId]
      if (!noReadCount) {
        chatSessionCountMap[contactId] = 1
      } else {
        chatSessionCountMap[contactId] = noReadCount + 1
      }
    })

    // 更新消息未读数
    for (let item in chatSessionCountMap) {
      await updateNoReadCount({ contactId: item, noReadCount: chatSessionCountMap[item] })
    }

    // 批量插入
    chatMessageList.forEach(async (item) => {
      await insertMessage(item)
    })
    resolve()
  })
}

// 构造分页参数
const getPageOffset = (pageNo = 1, totalCount) => {
  const pageSize = 20
  const pageTotal =
    totalCount % pageSize == 0 ? totalCount / pageSize : Number.parseInt(totalCount / pageSize) + 1
  pageNo = pageNo <= 1 ? 1 : pageNo
  pageNo = pageNo >= pageTotal ? pageTotal : pageNo
  return {
    pageTotal,
    offset: (pageNo - 1) * pageSize,
    limit: pageSize
  }
}

const selectMessageList = (query) => {
  return new Promise(async (resolve, reject) => {
    const { sessionId, pageNo, maxMessageId } = query
    let sql = `select count(1) from chat_message where session_id = ? and user_id = ?`
    const totalCount = await queryCount(sql, [sessionId, store.getUserId()])
    const { pageTotal, offset, limit } = getPageOffset(pageNo, totalCount)

    const params = [sessionId, store.getUserId()]
    sql = `select * from chat_message where session_id = ? and user_id = ? `
    if(maxMessageId){
        sql = sql + ` and message_id <= ? `
        params.push(maxMessageId)
    }
    sql = sql + ` order by message_id desc limit ?,? `
    params.push(offset)
    params.push(limit)
    const dataList = await queryAll(sql, params)
    resolve({
        dataList,
        pageTotal,
        pageNo
    })
  })
}

const updateMessage = (data, paramsData)=>{
  paramsData.userId = store.getUserId()
  return update('chat_message', data, paramsData)
}

const selectByMessageId = (messageId)=>{
  let sql = `select * from chat_message where message_id = ? and user_id = ?`
  const params = [messageId, store.getUserId()]
  return queryOne(sql, params)
}

export { insertMessageBatch, selectMessageList, insertMessage, updateMessage, selectByMessageId }
