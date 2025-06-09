<template>
  <ContentPanel>
    <div class="group-info-item">
        <div class="group-title">群封面：</div>
        <div class="group-value">
            <Avatar :userId="groupInfo.groupId"></Avatar>
        </div>
        <el-dropdown placement="bottom-end" trigger="click">
            <span class="el-dropdown-link">
                <div class="iconfont icon-more"></div>
            </span>
            <template #dropdown>
                <el-dropdown-menu v-if="groupInfo.groupOwnerId == userInfoStore.getInfo().userId">
                    <el-dropdown-item @click="editGroupInfo">修改群信息</el-dropdown-item>
                    <el-dropdown-item @click="dissolutionGroup">解散该群</el-dropdown-item>
                </el-dropdown-menu>
                <el-dropdown-menu v-else>
                    <el-dropdown-item @click="leaveGroup">退出该群</el-dropdown-item>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </div>
    <div class="group-info-item">
        <div class="group-title">群ID：</div>
        <div class="group-value">{{ groupInfo.groupId }}</div>
    </div>
    <div class="group-info-item">
        <div class="group-title">群名称：</div>
        <div class="group-value">{{ groupInfo.groupName }}</div>
    </div>
    <div class="group-info-item">
        <div class="group-title">群成员：</div>
        <div class="group-value">{{ groupInfo.memberCount }}</div>
    </div>
    <div class="group-info-item">
        <div class="group-title">加入权限：</div>
        <div class="group-value">
            {{ groupInfo.joinType == 0? '直接加入': '管理员同意后加入' }}
        </div>
    </div>
    <div class="group-info-item notice">
        <div class="group-title">群公告：</div>
        <div class="group-value">{{ groupInfo.groupNotice || '-' }}</div>
    </div>
    <div class="group-info-item">
        <div class="group-title"></div>
        <div class="group-value">
            <el-button type="primary" @click="sendMessage">发送群消息</el-button>
        </div>
    </div>
  </ContentPanel>
  <GroupEditDialog ref="groupEditDialogRef" @reloadGroupInfo="getGroupInfo"></GroupEditDialog>
</template>

<script setup>
import GroupEditDialog from "./GroupEditDialog.vue";
import { ref, reactive, getCurrentInstance, nextTick, watch } from "vue"
const { proxy } = getCurrentInstance();
import { useRouter, useRoute } from "vue-router";
const router = useRouter()
const route = useRoute()

import {useUserInfoStore} from '@/stores/UserInfoStore'
const userInfoStore = useUserInfoStore()
import {useContactStateStore} from '@/stores/ContactStateStore'
const contactStateStore = useContactStateStore()

const groupInfo = ref({})
const groupId = ref()

// 获取群信息
const getGroupInfo = async()=>{
    let result = await proxy.Request({
        url: proxy.Api.getGroupInfo,
        mode: 'POST',
        params: {
            groupId: groupId.value
        }
    })
    if (!result) {
        return;
    }
    groupInfo.value = result.data
}

const groupEditDialogRef = ref()
// 修改群信息
const editGroupInfo = ()=>{
    groupEditDialogRef.value.show(groupInfo.value)
}

// 解散群聊
const dissolutionGroup = ()=>{
    // 先将状态置空，再赋值，watch才能检测到变化
    contactStateStore.setContactReload(null)
    proxy.Confirm({
        message: '确定要解散群聊吗？解散后无法恢复！',
        okfun: async()=>{
            let result = await proxy.Request({
                url: proxy.Api.dissolutionGroup,
                mode: 'POST',
                params: {
                    groupId: groupInfo.value.groupId
                }
            })
            if (!result) {
                return;
            }
            proxy.Message.success('解散成功')
            // 刷新我的群组列表
            contactStateStore.setContactReload("DISSOLUTION_GROUP")
        }
    })
}

// 退出群聊
const leaveGroup = ()=>{
    // 先将状态置空，再赋值，watch才能检测到变化
    contactStateStore.setContactReload(null)
    proxy.Confirm({
        message: '确定要解散群聊吗？解散后无法恢复！',
        okfun: async()=>{
            let result = await proxy.Request({
                url: proxy.Api.leaveGroup,
                mode: 'POST',
                params: {
                    groupId: groupInfo.value.groupId
                }
            })
            if (!result) {
                return;
            }
            proxy.Message.success('退出成功')
            // 刷新我的群组列表
            contactStateStore.setContactReload("LEAVE_GROUP")
        }
    })
}

// 点击发送群消息
const sendMessage = ()=>{
    router.push({
        path: '/chat',
        query:{
            chatId: groupInfo.value.groupId,
            timestamp: new Data().getTime()
        }
    })
}

watch(
    () => route.query.contactId, 
    (newVal, oldVal) => {
        groupId.value = newVal
        getGroupInfo()
    }, 
    { immediate: true, deep: true }
);

</script>

<style lang="scss" scoped>
.group-info-item{
    display: flex;
    margin: 15px 0px;
    align-items: center;
    .group-title{
        width: 100px;
        text-align: right;
    }
    .group-value{
        flex: 1;
    }
}
.notice{
    align-items: flex-start;
}
</style>
