<template>
  <div class="top-panel">
    <el-card>
      <el-form
        :model="searchForm"
        label-width="80px"
        label-position="right"
      >
        <el-row>
          <el-col :span="5">
            <el-form-item label="群组ID" label-width="55px">
              <el-input 
                class="password-input"
                clearable 
                v-model="searchForm.groupId"
                @keyup="loadDataList"
              >
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="群名称">
              <el-input
                class="password-input"
                v-model="searchForm.groupNameFuzzy"
                clearable
                placeholder="支持模糊搜索"
                @keyup = 'loadDataList'
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="群主UID">
              <el-input
                class="password-input"
                v-model="searchForm.groupOwnerId"
                clearable
                @keyup = 'loadDataList'
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="4" :style="{paddingLeft: '10px'}">
            <el-button type="success" @click="loadDataList()">查询</el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
  <el-card class="table-data-card">
      <Table :columns="columns" :fetch="loadDataList" :dataSource="tableData" options="tableOptions">
        <template #slotAvatar="{row}">
          <AvatarBase :width="50" :userId="row.groupId" partType="avatar"></AvatarBase>
        </template>
        
        <template #slotGroupName="{row}">
          {{ row.groupName }}
          ({{ row.groupId }})
        </template>

        <template #slotJoinType="{row}">
          <div>{{ row.joinType == 0 ? '直接加入': '管理员同意后加入' }}</div>
        </template>

        <template #slotStatus="{row}">
          <div>
            <span style="color: red" v-if="row.status == 0">已解散</span>
            <span style="color: green" v-if="row.status == 1">正常</span>
          </div>
        </template>

        <template #slotOperation="{row}">
          <div class="row-op-panel">
            <a href="javascript:void(0)" @click="dissolutionGroup(row)" v-if="row.status == 1">解散</a>
          </div>
        </template>
      </Table>
    </el-card>
</template>

<script setup>
import AvatarBase from '@/components/AvatarBase.vue'
import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();
import { useRouter, useRoute } from "vue-router";
const router = useRouter()
const route = useRoute()

const tableData = ref({})
const tableOptions = {}
const columns = [
  {
    label: '头像',
    prop: 'userId',
    width: 70,
    scopedSlots: 'slotAvatar'
  },{
    label: '群名称',
    prop: 'groupName',
    scopedSlots: 'slotGroupName'
  },{
    label: '群主',
    prop: 'groupOwnerNickName',
    scopedSlots: 'slotGroupOwnerNickName'
  },{
    label: '群员',
    prop: 'memberCount',
    width: 200,
  },{
    label: '创建时间',
    prop: 'createTime',
    width: 200,
  },{
    label: '加入方式',
    prop: 'joinType',
    width: 150,
    scopedSlots: 'slotJoinType'
  },{
    label: '状态',
    prop: 'status',
    width: 150,
    scopedSlots: 'slotStatus'
  },{
    label: '操作',
    prop: 'operation',
    width: 80,
    scopedSlots: 'slotOperation'
  }
]

const searchForm = ref({})

const loadDataList = async()=>{
  let params = {
    pageNo: tableData.value.pageNo,
    pageSize: tableData.value.pageSize
  }
  Object.assign(params, searchForm.value)
  let result = await proxy.Request({
     url: proxy.Api.loadGroupList,
     mode: 'POST',
     params:params
  })
  if(!result){
    return;
  }
  Object.assign(tableData.value, result.data)
}

const dissolutionGroup = (data)=>{
  proxy.Confirm({
    message: `确定要解散群组【${data.groupName}】吗？`,
    okfun: async()=>{
      let result = await proxy.Request({
        url: proxy.Api.AdminDissolutionGroup,
        mode: 'POST',
        params: {
          groupId: data.groupId
        }
      })
      if (!result) {
        return;
      }
      proxy.Message.success('解散成功')
      loadDataList()
    }
  })
}
</script>

<style lang="scss" scoped>
</style>
