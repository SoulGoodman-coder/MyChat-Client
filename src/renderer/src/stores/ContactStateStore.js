import {defineStore} from 'pinia'

export const useContactStateStore = defineStore("contactStateInfo", {
    state: ()=> {
        return {
            contactReload: null,    // 要重新加载的联系人类型 USER | GROUP | MYGROUP
        }
    },
    actions: {
        setContactReload(contactReload){
            this.contactReload = contactReload;
        },
    }
})