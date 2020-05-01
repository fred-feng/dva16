/**
 * Created by Fred(qq:24242811) on 2018/8/18.
 */
import create from "zustand";
import axios from "axios";
import produce from "immer";

/* 参考dva接口绑定 */
const config = {};
const store = {};
const immer = (config) => (set, get, api) =>
  config((fn) => set(produce(fn)), get, api);
const wrapPromise = (promise) => {
  let status = "pending";
  let result;
  let suspender = promise.then(
    (r) => {
      status = "success";
      result = r;
    },
    (e) => {
      status = "error";
      result = e;
    }
  );
  return {
    read() {
      if (status === "pending") {
        throw suspender;
      } else if (status === "error") {
        throw result;
      } else if (status === "success") {
        return result;
      }
    },
  };
};
export function initDva(models, { printLog = false, useImmer = true } = {}) {
  Object.assign(config, { printLog, useImmer });
  for (let { namespace, state, reducers, effects } of models) {
    bindModel({ namespace, state, reducers, effects });
  }
}
export function bindModel({ namespace, state, reducers, effects }) {
  let vo = { suspense: {}, reducers, effects };
  const exec = (set, get) => {
    vo.set = set;
    vo.get = get;
    return {
      ...state,
      suspense: (type, pendingWithoutPromise = true) => {
        config.printLog && console.log("[suspense]", namespace, type);
        if (vo.suspense[type]) {
          vo.suspense[type].read();
        } else if (pendingWithoutPromise) {
          throw new Promise((res) => res).then();
        }
      },
    };
  };
  vo.zustand = config.useImmer ? create(immer(exec)) : create(exec);
  store[namespace] = vo;
  config.printLog && console.log("[model]", namespace);
}
export function useStore(namespace) {
  return store[namespace] ? { ...store[namespace].zustand[0]() } : null;
}
export function dispatch(namespace, type, payload) {
  config.printLog && console.log("[dispatch]", namespace, type, payload);
  let { reducers, effects } = store[namespace];
  if (reducers[type]) {
    reducer(namespace, type, payload);
  } else if (effects[type]) {
    effect(namespace, type, payload);
  } else {
    console.error(
      `dispatch[${type}] function not exsits in models[${namespace}]`
    );
  }
}
export function reducer(namespace, type, payload) {
  config.printLog && console.log("[reducer]", namespace, type, payload);
  let { set, get, reducers } = store[namespace];
  if (reducers[type]) {
    set(() => reducers[type](get(), { payload }));
  } else {
    console.error(
      `reducers[${type}] function not exsits in models[${namespace}]`
    );
  }
}
export function effect(namespace, type, payload) {
  config.printLog && console.log("[effect]", namespace, type, payload);
  let { set, get, reducers, effects, suspense } = store[namespace];
  if (effects[type]) {
    suspense[type] = wrapPromise(
      effects[type](
        { payload },
        {
          call: (func, params) => func(params),
          reducer: (...args) => {
            if (args.length <= 2) {
              args.unshift(namespace);
            }
            reducer(...args);
          },
          effect: (...args) => {
            if (args.length <= 2) {
              args.unshift(namespace);
            }
            effect(...args);
          },
          select: (namespace) => store[namespace].get(),
        }
      )
    );
  } else {
    console.error(
      `effects[${type}] function not exsits in models[${namespace}]`
    );
  }
}

/* restful + json + jwt基本网络库 */
const requstParams = { serverHome: null, errorHanlder: null, extraHeaders: {} };
export function initRequest(serverHome, errorHanlder) {
  if (requstParams) {
    requstParams.serverHome = serverHome;
    requstParams.errorHanlder = errorHanlder;
  }
}
export function bindHeader(key, value) {
  requstParams.extraHeaders[key] = value;
}
export function bindJWTToken(token) {
  requstParams.extraHeaders["Authorization"] = token
    ? `Bearer ${token}`
    : undefined;
}
export function requestGet(url, body) {
  return request(url, { method: "GET", body });
}
export function requestDelete(url) {
  return request(url, { method: "DELETE" });
}
export function requestPost(url, body) {
  return request(url, { method: "POST", body });
}
export function requestPatch(url, body) {
  return request(url, { method: "PATCH", body });
}
export function requestPut(url, body) {
  return request(url, { method: "PUT", body });
}
function request(url, options) {
  return new Promise((resolve, reject) => {
    let { method, body } = options;
    // 添加url前缀
    if (url.indexOf("https://") === -1 && url.indexOf("http://") === -1) {
      url =
        requstParams.serverHome +
        (url.indexOf("/") === 0 ? url.substr(1) : url);
    }
    let option = {
      method,
      url,
      headers: {
        Accept: "application/json",
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        Expires: 0,
        "Content-Type": "application/json; charset=utf-8",
        ...requstParams.extraHeaders,
      },
      dataType: "json",
    };
    // 参数赋值
    switch (method.toUpperCase()) {
      case "GET":
      case "DELETE":
        option.params = body || {};
        break;
      case "POST":
      case "PATCH":
      case "PUT":
        option.data = body || {};
        break;
    }

    axios(option)
      .then(({ data }) => {
        config.printLog && console.log("[request]", method, body, data);
        resolve(data);
      })
      .catch((e) => {
        if (e.response) {
          let { status, data } = e.response;
          requstParams.errorHanlder(status, data);
        } else {
          throw e;
        }
      });
  });
}
