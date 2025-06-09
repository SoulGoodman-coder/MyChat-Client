<template>
  <div>
    <Dialog
      :show="dialogConfig.show"
      :title="dialogConfig.title"
      :buttons="dialogConfig.buttons"
      width="400px"
      :showCancel="false"
      @close="dialogConfig.show = false">
      <el-form
        :model="formData"
        :rules="rules"
        ref="formDataRef"
        @submit.prevent
      >
        <!--textarea输入-->
        <el-form-item label="" prop="">
          <el-input
            clearable
            placeholder="请输入申请信息，更容易被通过"
            type="textarea"
            :rows="5"
            :maxlength="100"
            resize="none"
            show-word-limit
            v-model.trim="formData.applyInfo"
        ></el-input>
        </el-form-item>
      </el-form>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();
import { useUserInfoStore } from '@/stores/UserInfoStore'
const userInfoStore = useUserInfoStore();

import {useContactStateStore} from '@/stores/ContactStateStore'
const contactStateStore = useContactStateStore()

const dialogConfig = ref({
  show: false,
  title: "提交申请",
  buttons: [
   {
    type: "primary",
    text: "确定",
    click: (e) => {
      submitApply();
    },
  },
 ],
});

const formData = ref({});
const formDataRef = ref();
const rules = {
  title: [{ required: true, message: "请输入内容" }],
};

const emit = defineEmits(['reload'])
// 提交申请
const submitApply = async()=>{
    let {contactId, contactType, applyInfo} = formData.value
    let result = await proxy.Request({
       url: proxy.Api.applyAdd,
       mode: 'POST',
       params:{
        contactId,
        applyInfo
       }
    })
    if(!result){
      return;
    }
    if(result.data == 0){
        proxy.Message.success("加入成功")
    }else{
        proxy.Message.success("申请成功，等待对方同意")
    }
    dialogConfig.value.show = false
    emit('reload')

    if(result.data == 0){
      switch(contactType){
        // 用户
        case 0:
          contactType = "USER"
          break
        // 群组
        case 1:
          contactType = "GROUP"
          break
      }
      contactStateStore.setContactReload(contactType)
    }
}

const show = (data)=>{
    // 显示申请框
    dialogConfig.value.show = true
    nextTick(()=>{
        formDataRef.value.resetFields();
        formData.value = Object.assign({},data);
        formData.value.applyInfo = "我是" + userInfoStore.getInfo().nickName
    })
}

defineExpose({
    show
})
</script>

<style lang="scss" scoped>
</style>
