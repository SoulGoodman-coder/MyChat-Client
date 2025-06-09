/* 主进程进程中 用于保存数据 */

const Store = require('electron-store')
const store = new Store()

// 保存用户id
let userId = null
const initUserId = (_userId) => {
    userId = _userId
}
const getUserId = () => {
    return userId
}

const setData = (key, value) => {
    store.set(key, value)
}

const getData = (key) => {
    return store.get(key)
}

/* 用户数据操作 */
const setUserData = (key, value) => {
    setData(userId + key, value)
}

const getUserData = (key) => {
    return store.get(userId + key)
}

const deleteUserData = (key) => {
    store.delete(userId + key)
}

export default {
    initUserId,
    getUserId,
    setData,
    getData,
    setUserData,
    getUserData,
    deleteUserData
}