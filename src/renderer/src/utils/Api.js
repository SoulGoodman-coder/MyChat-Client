const api = {
    proDomain: "http://123.56.201.207:5050",
    devDomain: "http://123.56.201.207:5050",
    proWsDomain: "ws://123.56.201.207:5051/ws",
    devWsDomain: "ws://123.56.201.207:5051/ws",
    checkCode: "/account/checkCode", // 验证码
    register: "/account/register", // 注册
    login: "/account/login", // 登录
    getSysSetting: "/account/getSysSetting", // 获取系统设置
    loadMyGroup: "/group/loadMyGroup", // 获取我创建的群组
    saveGroup: "/group/saveGroup", // 保存群组
    getGroupInfo: "/group/getGroupInfo", // 获取群聊详情
    getGroupInfo4Chat: "/group/getGroupInfo4Chat", // 获取聊天会话群聊详情
    leaveGroup: "/group/leaveGroup", // 退出群聊
    dissolutionGroup: "/group/dissolutionGroup", // 解散群聊
    addOrRemoveGroupUser: "/group/addOrRemoveGroupUser", // 添加或移除群聊人员
    search: "/contact/search", // 搜索好友或群聊
    applyAdd: "/contact/applyAdd", // 好友申请或入群申请
    loadApply: "/contact/loadApply", // 获取好友申请列表
    dealWithApply: "/contact/dealWithApply", // 处理加群申请或好友申请
    loadContact: "/contact/loadContact", // 获取联系人列表
    getContactInfo: "/contact/getContactInfo", // 获取联系人详情（可查询非好友）
    getContactUserInfo: "/contact/getContactUserInfo", // 获取联系人详情（仅可查询好友）
    delContact: "/contact/delContact", // 删除联系人
    addContact2BlackList: "/contact/addContact2BlackList", // 拉黑联系人
    getUserInfo: "/userInfo/getUserInfo", // 获取当前用户信息
    saveUserInfo: "/userInfo/saveUserInfo", // 保存用户信息
    updatePassword: "/userInfo/updatePassword", // 修改密码
    logout: "/userInfo/logout", // 退出登录
    sendMessage: "/chat/sendMessage", // 发送消息
    uploadFile: "/chat/uploadFile", // 上传文件
    downloadFile: "/chat/downloadFile", // 下载文件
    loadUser: "/admin/loadUser", // 获取用户列表
    updateUserStatus: "/admin/updateUserStatus", // 更新用户状态
    forceOffLine: "/admin/forceOffLine", // 强制下线
    loadGroupList: "/admin/loadGroupList", // 获取群组列表
    AdminDissolutionGroup: "/admin/dissolutionGroup", // 管理员解散群组
    loadBeautyAccountList: "/admin/loadBeautyAccountList", // 获取靓号列表
    saveBeautAccount: "/admin/saveBeautAccount", // 保存靓号
    delBeautAccount: "/admin/delBeautAccount", // 删除靓号
    AdminGetSysSetting: "/admin/getSysSetting", // 管理员获取系统设置
    saveSysSetting: "/admin/saveSysSetting", // 保存系统设置
    saveUpdate: "/admin/saveUpdate", // 保存更新
    loadUpdateList: "/admin/loadUpdateList", // 获取更新列表
    delUpdate: "/admin/delUpdate", // 删除更新
    postUpdate: "/admin/postUpdate", // 发布更新
    checkVersion: "/update/checkVersion", // 检测更新
}

export default api;