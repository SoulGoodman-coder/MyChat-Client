<template>
  <ContentPanel v-loading="copying" element-loading-text="正在复制文件">
    <el-form
      label-position="top"
      :model="formData"
      :rules="rules"
      ref="formDataRef"
      label-width="80px"
      @submit.prevent
    >
      <el-form-item label="文件管理" prop="" class="file-manage">
        <div class="file-input" :title="formData.sysSetting">{{ formData.sysSetting }}</div>
        <div class="tips">文件的默认保存位置</div>
      </el-form-item>
      <el-button type="primary" @click="changeFolder">更改</el-button>
      <el-button type="primary" @click="openLocalFolder">打开文件夹</el-button>
    </el-form>
  </ContentPanel>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick, onMounted } from "vue"
const { proxy } = getCurrentInstance();
import { useRouter, useRoute } from "vue-router";
const router = useRouter()
const route = useRoute()

const copying = ref(false)

const formData = ref({});
const formDataRef = ref();
const rules = {
  title: [{ required: true, message: "请输入内容" }],
};

// 获取文件缓存路径
const getSetting = async()=>{
  window.ipcRenderer.send('getSysSetting')
}

onMounted(()=>{
  getSetting()

  window.ipcRenderer.on('getSysSettingCallback', (e, sysSetting)=>{
    copying.value = false
    sysSetting = JSON.parse(sysSetting)
    formData.value = {
      sysSetting: sysSetting.localFileFolder
    }
  })

  window.ipcRenderer.on('copyingCallback', ()=>{
    copying.value = true
  })
})

// 更改文件保存路径
const changeFolder = ()=>{
  window.ipcRenderer.send('changeLocalFolder')
}

// 打开文件夹
const openLocalFolder = ()=>{
  window.ipcRenderer.send('openLocalFolder')
}

</script>

<style lang="scss" scoped>
.file-manage{
  :deep(.el-form-item__content){
    display: block;
  }
  .file-input{
    background: #fff;
    padding: 0px 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
  }
  .tips{
    color: #888;
    font-size: 13px;
  }
}
</style>
