<template>
  <Layout>
    <template #left-content>
      <div class="drag-panel drag"></div>
      <div class="top-search">
        <el-input clearable placeholder="搜索" v-model="searchKey" size="small" @keyup="search">
          <template #suffix>
            <span class="iconfont icon-search"></span>
          </template>
        </el-input>
      </div>
      <div class="chat-session-list" v-if="!searchKey">
        <template v-for="(item, index) in chatSessionList" :key="index">
          <ChatSession :data="item" @click="chatSessionClickHandler(item)" @contextmenu.stop="onContextMenu(item, $event)" :currentSession="item.contactId == currentChatSession.contactId"></ChatSession>
        </template>
      </div>
      <div class="" v-else>
        <SearchResult
          :data="item"
          v-for="(item, index) in searchList"
          @click="searchClickHandler(item)"
          :key="index"
        ></SearchResult>
      </div>
    </template>
    <template #right-content>
      <div class="title-panel drag" v-if="Object.keys(currentChatSession).length > 0">
        <div class="title">
          <span>{{ currentChatSession.contactName }}</span>
          <span v-if="currentChatSession.contactType == 1">
            ({{ currentChatSession.memberCount }})
          </span>
        </div>
      </div>
      <div
        v-if="currentChatSession.contactType == 1"
        class="iconfont icon-more no-drag"
        @click="showGroupDetail"
      ></div>
      <div class="chat-panel" v-show="Object.keys(currentChatSession).length > 0">
        <div class="message-panel" id="message-panel">
          <div
            class="message-item"
            v-for="(data, index) in messageList"
            :key="index"
            :id = "'message' + data.messageId"
          >
            <!-- 展示时间 (消息间隔超过5分钟)-->
            <template v-if="index>1 && data.sendTime - messageList[index-1].sendTime >= 300000 && (data.messageType == 2 || data.messageType == 5)">
              <ChatMessageTime :data="data"></ChatMessageTime>
            </template>
            <!-- 展示系统消息 -->
            <template 
              v-if="
                data.messageType == 1 ||
                data.messageType == 3 ||
                data.messageType == 8 ||
                data.messageType == 9 ||
                data.messageType == 11 ||
                data.messageType == 12
              "
            >
              <ChatMessageSys :data="data"></ChatMessageSys>
            </template>
            <template
              v-if="data.messageType == 1 || data.messageType == 2 || data.messageType == 5" 
            >
              <ChatMessage :data="data" :currentChatSession="currentChatSession" @showMediaDetail="showMediaDetailHandler"></ChatMessage>
            </template>
          </div>
        </div>
        <MessageSend :currentChatSession="currentChatSession" @sendMessage4Local="sendMessage4LocalHandler"></MessageSend>
      </div>
      <div class="chat-panel" v-show="Object.keys(currentChatSession).length == 0">
        <Blank></Blank>
      </div>
    </template>
  </Layout>
  <ChatGroupDetail ref="chatGroupDetailRef" @delChatSessionCallback="delChatSession"></ChatGroupDetail>
</template>

<script>
export default {
  name: 'chat'
}
</script>
<script setup>
import SearchResult from './SearchResult.vue'
import Blank from "@/components/Blank.vue"
import ChatMessage from "./ChatMessage.vue"
import ChatMessageTime from "./ChatMessageTime.vue"
import ChatMessageSys from "./ChatMessageSys.vue"
import MessageSend from "./MessageSend.vue";
import ChatGroupDetail from "./ChatGroupDetail.vue";
import ContextMenu from "@imengyu/vue3-context-menu";
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ChatSession from "./ChatSession.vue";
import { ref, reactive, getCurrentInstance, nextTick, onMounted, onUnmounted, watch } from "vue"
import {useMessageCountStore} from '@/stores/MessageCountStore'
import { useRouter, useRoute } from "vue-router";
const { proxy } = getCurrentInstance();
const router = useRouter()
const route = useRoute()

const messageCountStore = useMessageCountStore()

// 会话列表
const chatSessionList = ref([])

// 当前选中的会话
const currentChatSession = ref({})

// 监听主进程收到ws消息
const onReceiverMessage = ()=>{
  window.ipcRenderer.on("receiveMessage", (e, message)=>{
    console.log("收到消息, message:", message);
    // ws连接成功
    if(message == 0){
      loadChatSession()
    }

    // 收到好友申请消息
    if(message.messageType == 4){
      loadContactApply()
      return
    }

    // 强制下线
    if(message.messageType == 7){
      proxy.Confirm({
        message: `你已经被管理员强制下线`,
        okfun: ()=>{
          setTimeout(() => {
            window.ipcRenderer.send("reLogin")
          }, 200);
        },
        showCancelBtn: false
      })
      return
    }

    // 更新群昵称
    if(message.messageType == 10){
      let curSession = chatSessionList.value.find((item) =>{
        return item.contactId == message.contactId
      })
      curSession.contactName = message.extendData
      return
    }

    // 媒体文件上传服务器完成
    if(message.messageType == 6){
      const localMessage = messageList.value.find((item) => {
        if(item.messageId == message.messageId){
          return item
        }
      })
      if(localMessage != null){
        localMessage.status = 1
      }
      return
    }

    // 接收消息的session对象
    let curSession = chatSessionList.value.find((item) => {
      return item.sessionId == message.sessionId
    })
    // 接收消息的session对象 不在列表中则添加，在列表中则更新
    if(curSession == null){
      chatSessionList.value.push(message.extendData)
    }else{
      Object.assign(curSession, message.extendData)
    }
    sortChatSessionList(chatSessionList.value)
    // 判断是否是当前选中的会话收到新消息
    if(message.sessionId != currentChatSession.value.sessionId){
      // 未读消息气泡
      messageCountStore.setCount('chatCount', 1, false)
    }else{
      messageList.value.push(message)
      gotoBottom()
    }
  })
}

// 加载聊天会话信息
const loadChatSession = async()=>{
  const dataList = await window.ipcRenderer.invoke('loadChatSession')

  // 设置未读消息气泡
  let noReadCount = 0
  dataList.forEach((element) => {
    noReadCount = noReadCount + element.noReadCount
  })
  messageCountStore.setCount('chatCount', noReadCount, true)

  sortChatSessionList(dataList)
  chatSessionList.value = dataList
}

// 会话排序
const sortChatSessionList = (dataList)=>{
  dataList.sort((a, b)=>{
    const topTypeResult = b["topType"] - a["topType"]
    if(topTypeResult == 0){
      return b["lastReceiveTime"] - a["lastReceiveTime"]
    }
    return topTypeResult
  })
}

// 删除会话
const delChatSessionList = (contactId)=>{
  setTimeout(() => {
    chatSessionList.value = chatSessionList.value.filter((item) => {
      return item.contactId !== contactId
    })
  }, 100);
}

// 消息列表
const messageList = ref([])
const messageCountInfo = {
  pageTotal: 0,
  pageNo: 0,
  maxMessageId: null,
  noData: false
}

// 是否滚动到底部 距离
let distanceBottom = 0

// 点击会话
const chatSessionClickHandler = (item)=>{
  distanceBottom = 0
  currentChatSession.value = Object.assign({}, item)
  // 清空未读消息记录数
  messageCountStore.setCount('chatCount', -item.noReadCount, false)
  item.noReadCount = 0

  // 重置数据
  messageList.value = []
  messageCountInfo.pageTotal = 0
  messageCountInfo.pageNo = 0
  messageCountInfo.maxMessageId = null
  messageCountInfo.noData = false

  loadChatMessage()

  // 记录当前选中的会话
  setSessionSelect({contactId: item.contactId, sessionId: item.sessionId})
}

// 记录当前选中的会话
const setSessionSelect = ({contactId, sessionId})=>{
  window.ipcRenderer.send("setSessionSelect", {contactId, sessionId})
}

// 加载聊天消息
const loadChatMessage = async()=>{
  if(messageCountInfo.noData){
    return
  }
  messageCountInfo.pageNo ++
  // 给主进程发消息，获取聊天消息数据
  const {dataList, pageTotal, pageNo } = await window.ipcRenderer.invoke("loadChatMessage", {
    sessionId: currentChatSession.value.sessionId,
    pageNo: messageCountInfo.pageNo,
    maxMessageId: messageCountInfo.maxMessageId
  })

  if(pageNo == pageTotal){
    messageCountInfo.noData = true
  }

  // 排序，新消息在下面（后面）
  dataList.sort((a,b) => {
    return a.messageId - b.messageId
  })

  const lastMessage = messageList.value[0]
  messageList.value = dataList.concat(messageList.value)
  messageCountInfo.pageNo = pageNo
  messageCountInfo.pageTotal = pageTotal
  // 保存当前最新消息id
  if(pageNo == 1){
    messageCountInfo.maxMessageId = dataList.length > 0 ? dataList[dataList.length - 1].messageId : null
    // 滚动条滚动到底部
    gotoBottom()
  }else{
    nextTick(()=>{
      document.querySelector("#message" + lastMessage.messageId).scrollIntoView()
    })
  }
}

// 消息保存到本地完成
const onAddLocalMessage = ()=>{
  window.ipcRenderer.on("addLocalMessageCallback",(e, {status, messageId}) =>{
    const findMessage = messageList.value.find(item =>{
      if(item.messageId == messageId){
        return item
      }
    })
    if(findMessage != null){
      findMessage.status = status
    }
  })
}

// 自己发送消息时，更新本地消息显示
const sendMessage4LocalHandler = (messageObj)=>{
  // 更新聊天窗口消息
  messageList.value.push(messageObj)
  // 更新左侧联系人列表信息
  const chatSession = chatSessionList.value.find((item) => {
    return item.sessionId == messageObj.sessionId
  })
  if(chatSession){
    chatSession.lastMessage = messageObj.lastMessage
    chatSession.lastReceiveTime = messageObj.lastReceiveTime
  }
  sortChatSessionList(chatSessionList.value)
  gotoBottom()
}

// 滚动到底部
const gotoBottom = ()=>{
  nextTick(()=>{
    // 距离底部超过200，不自动滚动到底部
    if(distanceBottom > 200){
      return
    }

    const items = document.querySelectorAll('.message-item')
    if(items.length > 0){
      setTimeout(()=>{
        items[items.length - 1].scrollIntoView()
      }, 200)
    }
  })
}

// 加载联系人申请
const loadContactApply = async()=>{
  const contactNoRead = await window.ipcRenderer.invoke('loadContactApply')
  console.log("未读好友申请数：", contactNoRead);
  messageCountStore.setCount('contactApplyCount', contactNoRead, true)
}

onMounted(()=>{
  onReceiverMessage()
  loadChatSession()
  onAddLocalMessage()
  loadContactApply()
  nextTick(()=>{
    const messagePanel = document.querySelector('#message-panel')
    messagePanel.addEventListener('scroll', (e)=>{
      const scrollTop = e.target.scrollTop

      // 计算距离底部的距离
      distanceBottom = e.target.scrollHeight - e.target.clientHeight - scrollTop;

      // 聊天滚动分页
      if(scrollTop == 0 && messageList.value.length > 0){
        loadChatMessage()
      }
    })
  })
  setSessionSelect({})
  onReloadChatSession()
})

onUnmounted(()=>{
  window.ipcRenderer.removeAllListeners("receiveMessage")
  window.ipcRenderer.removeAllListeners("addLocalMessageCallback")
  window.ipcRenderer.removeAllListeners("reloadChatSessionCallback")
})

// 置顶
const setTop = (data) =>{
  data.topType = data.topType == 0? 1:0
  // 会话排序
  sortChatSessionList(chatSessionList.value)
  // 给主进程发消息，修改本地数据库数据
  window.ipcRenderer.send("topChatSession", {contactId: data.contactId, topType: data.topType})
}

// 删除聊天会话
const delChatSession = (contactId)=>{
  // 从当前页面列表中删除
  delChatSessionList(contactId)
  
  // 设置选中的会话为空
  setSessionSelect({})
  currentChatSession.value = {}

  // 给主进程发消息，修改本地数据库数据
  window.ipcRenderer.send("delChatSession", contactId)
}

// 右键
const onContextMenu = (data, e)=>{
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items:[
      {
        label: data.topType == 0? '置顶': '取消置顶',
        onClick: () =>{
          setTop(data)
        }
      },{
        label: '删除聊天',
        onClick: () =>{
          proxy.Confirm({
            message: `确定要删除聊天【${data.contactName}】吗？`,
            okfun: ()=>{
              delChatSession(data.contactId)
            }
          })
        }
      }
    ]
  })
}

const showMediaDetailHandler = (messageId)=>{
  let showFileList = messageList.value.filter((item) => {
    return item.messageType == 5
  })
  showFileList = showFileList.map((item) => {
    return {
      partType: 'chat',
      fileId: item.messageId,
      fileType: item.fileType,
      fileName: item.fileName,
      fileSize: item.fileSize,
      forceGet: false
    }
  })
  window.ipcRenderer.send("newWindow", {
    windowId: 'media',
    title: '图片查看',
    path: '/showMedia',
    data: {
      currentFileId: messageId,
      fileList: showFileList
    }
  })
}

// 群详情
const chatGroupDetailRef = ref()
const showGroupDetail = ()=>{
  chatGroupDetailRef.value.show(currentChatSession.value.contactId)
}

const sendMessage = (contactId)=>{
  let curSession = chatSessionList.value.find((item) => {
    return item.contactId == contactId
  })
  
  if(!curSession){
    // 重新加载聊天会话
    window.ipcRenderer.send("reloadChatSession", {contactId})
    return
  }else{
    chatSessionClickHandler(curSession)
  }
}

const onReloadChatSession = ()=>{
  window.ipcRenderer.on("reloadChatSessionCallback", (e, {contactId, newChatSessionList})=>{
    sortChatSessionList(newChatSessionList)
    chatSessionList.value = newChatSessionList
    sendMessage(contactId)
  })
}

watch(
  () => route.query.timestamp, 
  (newVal, oldVal) => {
    if(newVal && route.query.chatId){
      sendMessage(route.query.chatId)
    }
  }, 
  { immediate: true, deep: true }
);

// 搜索
const searchKey = ref()
const searchList = ref([])
const search = ()=>{
  if(!searchKey.value){
    return
  }
  
  searchList.value = []
  const regex = new RegExp("(" + searchKey.value + ")", 'gi')
  chatSessionList.value.forEach(item =>{
    // 搜索联系人名称和最后一条消息
    if(item.contactName.includes(searchKey.value) || item.lastMessage.includes(searchKey.value)){
      let newData = Object.assign({}, item)
      // 关键字高亮显示
      newData.searchContactName = newData.contactName.replace(regex, "<span class='highlight'>$1</span>")
      newData.searchLastMessage = newData.lastMessage.replace(regex, "<span class='highlight'>$1</span>")

      searchList.value.push(newData)
    }
  })
}

const searchClickHandler = (data)=>{
  searchKey.value = undefined
  chatSessionClickHandler(data)
}

</script>

<style lang="scss" scoped>
.drag-panel{
  height: 25px;
  background: #f7f7f7;
}
.top-search{
  padding: 0px 10px 9px 10px;
  background: #f7f7f7;
  display: flex;
  align-items: center;
  .iconfont{
    font-size: 12px;
  }
}
.chat-session-list{
  height: calc(100vh - 62px);
  overflow: hidden;
  border-top: 1px solid #ddd;
  &:hover{
    overflow: auto;
  }
}

.search-list{
  height: calc(100vh - 62px);
  background: #f7f7f7;
  overflow: hidden;
  &:hover{
    overflow: auto;
  }
}

.title-panel{
  display: flex;
  align-items: center;
  .title{
    height: 60px;
    line-height: 60px;
    padding-left: 10px;
    font-size: 18px;
    color: #000;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.icon-more{
  position: absolute;
  z-index: 1;
  top: 30px;
  right: 3px;
  width: 20px;
  font-size: 20px;
  margin-right: 5px;
  cursor: pointer;
}

.chat-panel{
  border-top: 1px solid #ddd;
  background: #f5f5f5;
  .message-panel{
    padding: 10px 30px 0px 30px;
    height: calc(100vh - 262px);
    overflow-y: auto;
    .message-item{
      margin-bottom: 15px;
      text-align: center;
    }
  }
}

</style>
