import { initDva, initRequest } from 'dva16'

1.初始化model
    import user from './user'
    initDva([user])
2.初始化请求地址
    initRequest(requestUrl, (status, data) => {
        console.log(status, data)
    })

########## Model ##########
model示例:

import { getSetting } from '../services'
import { NRemote, RSetState, EGetSetting, EFetchUser, NUser } from './constants'

const delay = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))
export default {
  namespace: NRemote,
  state: {
    ping: 'pong',
    user: { name: 'fred' },
    setting: null
  },
  effects: {
    async [EGetSetting]({ payload }, { call, put, select }) {
      const {user} = select(NRemote)
      let setting = await call(getSetting, payload)
      await put(RSetState, { setting })
      await put(EFetchUser, 1, NUser)
    }
  },
  reducers: {
    [RSetState](state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  }
}



########## API ##########
1.initDva(modelsArr,config) //初始化dav16
    modelsArr : 
        type => Array   
        explain => model数组
    config : 
        type => Object
        explain => 配置项
            {
                printLog : Boolean,  // default => false (打印日志)
                useImmer : Boolean   // default => true  (应用Immer)
            } 
2.useStore(namespace)  //获取model中state的值
    namespace : 
        type => String   
        explain => model的namespace

    例 :
    export default () => {
        const { count } = useStore(model的namespace)
        return (
            <>
                <p>{count}</p>
            </>
        )
    }

3.reducer(namespace, type, payload)
    namespace : 
        type => String   
        explain => model的namespace
    type : 
        type => String
        explain => reducer名 / 键名
    payload ：
        type => Any
        explain => 传递参数

4.effect(namespace, type, payload)
    namespace : 
        type => String   
        explain => model的namespace
    type : 
        type => String
        explain => reducer名 / 键名
    payload ：
        type => Any
        explain => 传递参数

5.initRequest(serverHome, errorHanlder)
    serverHome : 
        type => String   
        explain => model的namespace
    errorHanlder : 
        type => Function
        explain => 错误回调函数

6.bindJWTToken(token)
    token : 
        type => String   
        explain => 请求头 Token

安装
  npm install dva16

