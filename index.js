/**
 * Created by Fred(qq:24242811) on 2018/8/18.
 */
import create from 'zustand'
import axios from 'axios'
import produce from 'immer'

/* 参考dva接口绑定 */
const store = {}
const immer = config => (set, get, api) => config(fn => set(produce(fn)), get, api)
const wrapPromise = promise => {
  let status = 'pending'
  let result
  let suspender = promise.then(
    r => {
      status = 'success'
      result = r
    },
    e => {
      status = 'error'
      result = e
    }
  )
  return {
    read() {
      if (status === 'pending') {
        throw suspender
      } else if (status === 'error') {
        throw result
      } else if (status === 'success') {
        return result
      }
    }
  }
}
export function models(models) {
  for (let { namespace, state, reducers, effects } of models) {
    let vo = { suspense: {}, reducers, effects }
    vo.zustand = create(
      immer((set, get) => {
        vo.set = set
        vo.get = get
        return {
          ...state,
          suspense: (type, pendingWithoutPromise = true) => {
            console.log('[suspense]', namespace, type, vo.suspense[type])
            if (vo.suspense[type]) {
              console.log('---1')
              vo.suspense[type].read()
            } else if (pendingWithoutPromise) {
              console.log('---2')
              throw new Promise(res => res).then()
            }
          }
        }
      })
    )
    store[namespace] = vo
  }
}
export function useStore(namespace) {
  return store[namespace] ? { ...store[namespace].zustand[0]() } : null
}
export function dispatch(namespace, type, payload) {
  console.log('[dispatch]', namespace, type, payload)
  let { set, get, reducers, effects, suspense } = store[namespace]
  if (reducers[type]) {
    set(() => reducers[type](get(), { payload }))
  } else if (effects[type]) {
    suspense[type] = wrapPromise(
      effects[type](
        { payload },
        {
          call: (func, params) => func(params),
          put: (type, payload, namespace2 = null) => {
            dispatch(namespace2 || namespace, type, payload)
          },
          select: namespace => store[namespace].get()
        }
      )
    )
  } else {
    console.error('reducers, effects function not exsits')
  }
}

/* restful + json + jwt基本网络库 */
const requstParams = {} // { serverHome: null, errorHanlder: null, extraHeaders: {} }
export function initRequest(serverHome, errorHanlder) {
  if (requstParams) {
    requstParams.serverHome = serverHome
    requstParams.errorHanlder = errorHanlder
  }
}
export function bindJWTToken(token) {
  requstParams.extraHeaders['Authorization'] = token ? `Bearer ${token}` : undefined
}
export function requestGet(url, body) {
  return request(url, { method: 'GET', body })
}
export function requestDelete(url) {
  return request(url, { method: 'DELETE' })
}
export function requestPost(url, body) {
  return request(url, { method: 'POST', body })
}
export function requestPatch(url, body) {
  return request(url, { method: 'PATCH', body })
}
export function requestPut(url, body) {
  return request(url, { method: 'PUT', body })
}
function request(url, options) {
  return new Promise((resolve, reject) => {
    let { method, body } = options
    // 添加url前缀
    if (url.indexOf('https://') === -1 && url.indexOf('http://') === -1) {
      url = requstParams.serverHome + (url.indexOf('/') === 0 ? url.substr(1) : url)
    }
    let option = {
      method,
      url,
      header: {
        Accept: 'application/json',
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Expires: 0,
        'Content-Type': 'application/json; charset=utf-8',
        ...requstParams.extraHeaders
      },
      dataType: 'json'
    }
    // 参数赋值
    switch (method.toUpperCase()) {
      case 'GET':
      case 'DELETE':
        option.params = body || {}
        break
      case 'POST':
      case 'PATCH':
      case 'PUT':
        option.data = body || {}
        break
    }

    axios(option)
      .then(({ data }) => resolve(data))
      .catch(e => {
        if (e.response) {
          let { status, data } = e.response
          requstParams.errorHanlder(status, data)
        } else {
          throw e
        }
      })
  })
}
