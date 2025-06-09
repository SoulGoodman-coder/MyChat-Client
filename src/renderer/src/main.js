import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from '@/router'
import '@/assets/cust-elementplus.scss'
import '@/assets/base.scss'
import '@/assets/icon/iconfont.css'
import Utils from '@/utils/Utils.js'
import Verify from '@/utils/Verify.js'
import Request from '@/utils/Request.js'
import Message from '@/utils/Message.js'
import Api from '@/utils/Api.js'
import Confirm from '@/utils/Confirm.js'
import * as Pinia from 'pinia'
import Dialog from '@/components/Dialog.vue'
import WinOp from '@/components/WinOp.vue'
import Layout from '@/components/Layout.vue'
import ContentPanel from '@/components/ContentPanel.vue'
import ShowLocalImage from '@/components/ShowLocalImage.vue'
import UserBaseInfo from '@/components/UserBaseInfo.vue'
import Avatar from '@/components/Avatar.vue'
import AvatarUpload from '@/components/AvatarUpload.vue'
import Badge from '@/components/Badge.vue'
import Table from '@/components/Table.vue'


const app = createApp(App)
// 将工具类放到proxy对象上
app.config.globalProperties.Utils = Utils;
app.config.globalProperties.Verify = Verify;
app.config.globalProperties.Request = Request;
app.config.globalProperties.Message = Message;
app.config.globalProperties.Api = Api;
app.config.globalProperties.Confirm = Confirm;

// 引入组件
app.component("Dialog", Dialog)
app.component("WinOp", WinOp)
app.component("Layout", Layout)
app.component("ContentPanel", ContentPanel)
app.component("ShowLocalImage", ShowLocalImage)
app.component("UserBaseInfo", UserBaseInfo)
app.component("Avatar", Avatar)
app.component("AvatarUpload", AvatarUpload)
app.component("Badge", Badge)
app.component("Table", Table)

app.use(ElementPlus)
app.use(router)
app.use(Pinia.createPinia())

app.mount('#app')