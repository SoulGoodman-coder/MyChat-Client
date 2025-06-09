<template>
  <div class="top-panel">
    <el-form
        :model="searchForm"
        label-width="70px"
        label-position="right"
      >
        <el-row>
          <el-col :span="5">
            <el-form-item label="靓号" label-width="40px">
              <el-input 
                class="password-input"
                clearable 
                v-model="searchForm.userIdFuzzy"
                placeholder="支持模糊搜索"
                @keyup="loadDataList"
              >
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="邮箱">
              <el-input
                class="password-input"
                v-model="searchForm.nickNameFuzzy"
                clearable
                placeholder="支持模糊搜索"
                @keyup = 'loadDataList'
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="4" :style="{paddingLeft: '10px'}">
            <el-button type="success" @click="loadDataList()">查询</el-button>
            <el-button type="primary" @click="editAccount()">新增靓号</el-button>
          </el-col>
        </el-row>
      </el-form>
  </div>
  <el-card class="table-data-card">
    <Table :columns="columns" :fetch="loadDataList" :dataSource="tableData" options="tableOptions">
      <template #slotAvatar="{row}">
        <AvatarBase :width="50" :userId="row.userId" partType="avatar"></AvatarBase>
      </template>

      <template #slotNickName="{row}">
        {{ row.nickName }}
        <span v-if="row.sex == 0" class="iconfont icon-woman"></span>
        <span v-if="row.sex == 1" class="iconfont icon-man"></span>
      </template>

      <template #slotStatus="{row}">
        <span style="color: red" v-if="!row.status || row.status == 0">未使用</span>
        <span style="color: green" v-else>已使用</span>
      </template>

      <template #slotOnline="{row}">
        <span style="color: green" v-if="row.onlineType == 1">在线</span>
        <span style="color: #8a8a8a" v-else>离线</span>
      </template>

      <template #slotOperation="{row}">
        <el-dropdown placement="bottom-end" trigger="click">
          <span class="iconfont icon-more"></span>
          <template #dropdown>
            <el-dropdown-item @click="editAccount(row)" v-if="row.status == 0">
              修改
            </el-dropdown-item>
            <el-dropdown-item @click="delAccount(row)">
              删除
            </el-dropdown-item>
          </template>
        </el-dropdown>
      </template>
    </Table>
  </el-card>
  <BeautyAccountEdit ref="beautyAccountEditRef" @reload="loadDataList"></BeautyAccountEdit>
</template>

<script setup>
import BeautyAccountEdit from './BeautyAccountEdit.vue'
import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();
import { useRouter, useRoute } from "vue-router";
const router = useRouter()
const route = useRoute()

const tableData = ref({})
const tableOptions = {}
const columns = [
  {
    label: '邮箱',
    prop: 'email',
  },{
    label: '靓号',
    prop: 'userId',
  },{
    label: '状态',
    prop: 'status',
    scopedSlots: 'slotStatus'
  },{
    label: '操作',
    prop: 'operation',
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
     url: proxy.Api.loadBeautyAccountList,
     mode: 'POST',
     params:params
  })
  if(!result){
    return;
  }
  Object.assign(tableData.value, result.data)
}

let beautyAccountEditRef = ref()
const editAccount = (data)=>{
  beautyAccountEditRef.value.showEdit(data)
}

const delAccount = (data) =>{
  proxy.Confirm({
    message: `确定要删除邮箱【${data.email}】对应的靓号吗？`,
    okfun: async()=>{
      let result = await proxy.Request({
        url: proxy.Api.delBeautAccount,
        mode: 'POST',
        params: {
          id: data.id
        }
      })
      if (!result) {
        return;
      }
      proxy.Message.success('删除成功')
      loadDataList()
    }
  })
}
</script>

<style lang="scss" scoped>
</style>
