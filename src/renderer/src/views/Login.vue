<template>
  <div class="login-panel">
    <div class="title drag">MyChat</div>
    <div v-if="showLoading" class="loading-panel">
      <img src="../assets/img/loading.gif" alt="">
    </div>
    <div class="login-form" v-else>
      <el-form :model="formData" ref="formDataRef" label-width="0px" @submit.prevent>
        <!--input输入 邮箱-->
        <el-form-item prop="email">
          <div class="email-panel">
            <el-input size="large" maxlength="30" clearable placeholder="请输入邮箱" v-model.trim="formData.email" @focus="cleanErrorMsg">
              <template #prefix>
                <span class="iconfont icon-email"></span>
              </template>
            </el-input>
            <el-dropdown v-if="isLogin && localUserList.length > 0" trigger="click">
              <span class="iconfont icon-down"></span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="(item, index) in localUserList" :key="index">
                    <div class="email-select" @click="selectEmail(item.email)">
                      {{ item.email }}
                    </div>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-form-item>
        <!--input输入 昵称-->
        <el-form-item prop="nickName" v-if="!isLogin">
          <el-input size="large" maxlength="15" clearable placeholder="请输入昵称" v-model.trim="formData.nickName" @focus="cleanErrorMsg">
            <template #prefix>
              <span class="iconfont icon-user-nick"></span>
            </template>
          </el-input>
        </el-form-item>
        <!--input输入 密码-->
        <el-form-item prop="password">
          <el-input size="large" show-password clearable placeholder="请输入密码" v-model.trim="formData.password" @focus="cleanErrorMsg">
            <template #prefix>
              <span class="iconfont icon-password"></span>
            </template>
          </el-input>
        </el-form-item>
        <!--input输入 确认密码-->
        <el-form-item prop="rePassword" v-if="!isLogin">
          <el-input size="large" show-password clearable placeholder="请再次输入密码" v-model.trim="formData.rePassword" @focus="cleanErrorMsg">
            <template #prefix>
              <span class="iconfont icon-password"></span>
            </template>
          </el-input>
        </el-form-item>
        <!--input输入 验证码-->
        <el-form-item prop="check-code">
          <div class="check-code-panel">
            <el-input size="large" clearable placeholder="请输入验证码" v-model.trim="formData.checkCode" @focus="cleanErrorMsg">
              <template #prefix>
                <span class="iconfont icon-checkcode"></span>
              </template>
            </el-input>
            <img :src="checkCodeBase64" class="check-code" @click="changeCheckCode"/>
          </div>
        </el-form-item>
        <!-- 提示信息 -->
        <div class="error-msg">{{ errorMsg }}</div>
        <!-- 登录/注册按钮 -->
        <el-form-item prop="password">
          <el-button type="primary" class="login-btn" @click="submit">{{ isLogin ? '登录' : '注册' }}</el-button>
        </el-form-item>
        <div class="bottom-link">
          <span class="a-link" @click="changeOpType">{{ isLogin ? '没有账号？' : '已有账号？' }}</span>
        </div>
      </el-form>
    </div>
  </div>
  <WinOp :showSetTop="false" :showMin="false" :showMax="false" :closeType="0"></WinOp>
</template>

<script setup>
  import { ref, reactive, getCurrentInstance, nextTick, onMounted } from 'vue'
  const { proxy } = getCurrentInstance()

  import md5 from 'js-md5'
  import { useUserInfoStore } from '@/stores/UserInfoStore'
  const UserInfoStore = useUserInfoStore();

  import { useRouter } from 'vue-router';
  const router = useRouter()

  const formData = ref({})
  const formDataRef = ref()

  // 标识登录还是注册
  const isLogin = ref(true)
  const changeOpType = () => {
    isLogin.value = !isLogin.value
    // 给主进程发消息 改变页面大小
    window.ipcRenderer.send('loginOrRegister', isLogin.value)
    // 清空输入框
    nextTick(() => {
      formDataRef.value.resetFields()
      formData.value = {}
      cleanErrorMsg()
      changeCheckCode();
    })
  }

  // 刷新验证码
  const checkCodeBase64 = ref(null)
  const changeCheckCode = async() => {
    let result = await proxy.Request({
       url: proxy.Api.checkCode,
       method: 'POST'
    })
    if(!result){
      return;
    }
    checkCodeBase64.value = result.data.checkCode
    localStorage.setItem("checkCodeKey", result.data.checkCodeKey);
  }
  changeCheckCode()

  // 提示信息对象
  const errorMsg = ref(null)

  // 校验参数
  const checkValue = (type, value, msg) => {
    if (proxy.Utils.isEmpty(value)) {
      errorMsg.value = msg
      return false
    }

    if (type && !proxy.Verify[type](value)) {
      errorMsg.value = msg
      return false
    }

    return true
  }

  // 清空提示
  const cleanErrorMsg = () => {
    errorMsg.value = null
  }

  // 标识显示加载页
  const showLoading = ref(false)

  // 点击按钮回调方法
  const submit = async() => {
    cleanErrorMsg()
    if (!checkValue('checkEmail', formData.value.email, '请输入正确的邮箱')) {
      return
    }
    if (!isLogin.value && !checkValue(null, formData.value.nickName, '请输入昵称')) {
      return
    }
    if (
      !checkValue(
        'checkPassword',
        formData.value.password,
        '密码只能是8-18位字母数字组合，数字不能开头'
      )
    ) {
      return
    }
    if (!isLogin.value && formData.value.password != formData.value.rePassword) {
      errorMsg.value = '两次密码输入不一致'
      return
    }
    if (!checkValue(null, formData.value.checkCode, '请输入正确的验证码')) {
      return
    }

    // 向后端登录请求时 显示加载页面
    if (isLogin.value){
      showLoading.value = true
    }

    let result = await proxy.Request({
       url: isLogin.value? proxy.Api.login: proxy.Api.register,
       mode: 'POST',
       params:{
        email: formData.value.email,
        password: formData.value.password,
        checkCode: formData.value.checkCode,
        nickName: formData.value.nickName,
        checkCodeKey: localStorage.getItem("checkCodeKey")
       },
       showError: false,
       showLoading: isLogin.value? false: true,
       // 失败回调
       errorCallback: (response) => {
        showLoading.value = false
        changeCheckCode()
        errorMsg.value = response.msg
       }
    })
    if(!result){
      return;
    }
    if(isLogin.value){
      // 登录成功
      UserInfoStore.setInfo(result.data)
      localStorage.setItem("token", result.data.token)

      router.push('/main')

      // 屏幕尺寸
      const screenWidth = window.screen.width
      const screenHight = window.screen.height
      window.ipcRenderer.send("openChat", {
        email: formData.value.email,
        token: result.data.token,
        userId: result.data.userId,
        nickName: result.data.nickName,
        admin: result.data.admin,
        screenWidth: screenWidth,
        screenHight: screenHight
      })

      
    }else{
      // 注册成功
      proxy.Message.success("注册成功")
      changeOpType()
      changeCheckCode()
    }
  }

  // 本地用户列表
  const localUserList = ref([])

  const selectEmail = (email)=>{
    formData.value.email = email
  }

  const init = async()=>{
    window.ipcRenderer.send('setLocalStore', {key: 'proDomain', value: proxy.Api.proDomain})
    window.ipcRenderer.send('setLocalStore', {key: 'devDomain', value: proxy.Api.devDomain})
    window.ipcRenderer.send('setLocalStore', {key: 'proWsDomain', value: proxy.Api.proWsDomain})
    window.ipcRenderer.send('setLocalStore', {key: 'devWsDomain', value: proxy.Api.devWsDomain})
    localUserList.value = await window.ipcRenderer.invoke('loadLocalUser')
  }


  onMounted(()=>{
    init()
  })
 
</script>

<style lang="scss" scoped>
.email-select {
  width: 250px;
}

.loading-panel {
  height: calc(100vh - 32px);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;

  img {
    width: 300px;
  }
}

.login-panel {
  background: #fff;
  border-radius: 3px;
  border: 1px solid #ddd;

  .title {
    height: 30px;
    padding: 5px 0px 0px 0px;
  }

  .login-form {
    padding: 0px 15px 29px 15px;

    :deep(.el-input__wrapper) {
      box-shadow: none;
      border-radius: none;
    }

    .el-form-item {
      border-bottom: 1px solid #ddd;
    }

    .email-panel {
      align-items: center;
      width: 100%;
      display: flex;

      .input {
        flex: 1;
      }

      .icon-down {
        margin-left: 3px;
        width: 16px;
        cursor: pointer;
        border: none;
      }
    }

    .error-msg {
      line-height: 20px;
      height: 30px;
      color: #fb7373;
    }

    .check-code-panel {
      display: flex;

      .check-code {
        cursor: pointer;
        width: 120px;
        margin-left: 5px;
      }
    }

    .login-btn {
      margin-top: 20px;
      width: 100%;
      background: #07c160;
      height: 36px;
      font-size: 16px;
    }

    .bottom-link {
      text-align: right;
    }
  }
}
</style>
