<template>
  <ContentPanel>
    <el-form
      ref="formDataRef"
      label-width="80px"
      @submit.prevent
    >
      <el-form-item label="版本信息">
        <div class="version-info">
          <div>MyChat {{ config.version }}</div>
          <div>
            <el-button type="primary" @click="checkUpdate">检查更新</el-button>
          </div>
        </div>
      </el-form-item>
    </el-form>
  </ContentPanel>
  <Update :autoUpdate="true" ref="updateRef"></Update>
</template>

<script setup>
import Update from '../Update.vue'
import config from '../../../../../package.json'
import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();
import { useRouter, useRoute } from "vue-router";
const router = useRouter()
const route = useRoute()

const updateRef = ref()
// 检查更新
const checkUpdate = ()=>{
  updateRef.value.checkUpdate()
}

</script>

<style lang="scss" scoped>
</style>
