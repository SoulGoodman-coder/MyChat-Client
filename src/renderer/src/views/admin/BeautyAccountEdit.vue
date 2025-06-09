<template>
    <Dialog
        :title="dialogConfig.title"
        :buttons="dialogConfig.buttons"
        :show="dialogConfig.show"
        @close="dialogConfig.show == false"
        :width="'400px'"
    >
        <el-form
          :model="formData"
          :rules="rules"
          ref="formDataRef"
          label-width="60px"
        >
            <el-form-item label="邮箱" prop="email" >
                <el-input :maxlength="50" placeholder="请输入邮箱" v-model.trim="formData.email"></el-input>
            </el-form-item>
            <el-form-item label="靓号" prop="userId" >
                <el-input :maxlength="11" placeholder="请输入靓号" v-model.trim="formData.userId"></el-input>
            </el-form-item>
        </el-form>
    </Dialog>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();
import { useRouter, useRoute } from "vue-router";
const router = useRouter()
const route = useRoute()

const dialogConfig = ref({
  show: false,
  title: "编辑靓号",
  buttons: [
   {
    type: "primary",
    text: "确定",
    click: (e) => {
      submitForm();
    },
  },
 ],
});

const formData = ref({updateDescList: []})
const formDataRef = ref()
const rules= {
    email: [
        {required: true, message: '请输入邮箱'},
        {validator: proxy.Verify.email, message: '请输入正确的邮箱'}
    ],
    userId: [
        {required: true, message: '请输入靓号'},
        {min: 11, max: 11,  message: '靓号必须11位'},
        {validator: proxy.Verify.number, message: '靓号只能是数字'}
    ]
}

const emit = defineEmits(['reload'])
const submitForm = ()=>{
    formDataRef.value.validate(async (valid) => {
       if (!valid) {
         return;
       }
       let params = {};
       Object.assign(params, formData.value);
       let result = await proxy.Request({
         url: proxy.Api.saveBeautAccount,
         mode: 'POST',
         params
       });
       if (!result) {
         return;
       }
       dialogConfig.value.show = false
       emit('reload')
    });
}

const showEdit = (data={}) =>{
    dialogConfig.value.show = true
    nextTick(()=>{
        formDataRef.value.resetFields()
        formData.value = Object.assign({}, data)
    })
}

defineExpose({
    showEdit
})
</script>

<style lang="scss" scoped>
</style>
