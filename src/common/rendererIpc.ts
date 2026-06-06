import { ipcRenderer } from 'electron'

const rendererListenerMap = new Map<(...args: any[]) => any, Map<string, (...args: any[]) => any>>()

export function rendererSend(name: string): void
export function rendererSend<T>(name: string, params: T): void
export function rendererSend<T>(name: string, params?: T): void {
  ipcRenderer.send(name, params)
}

export function rendererSendSync(name: string): void
export function rendererSendSync<T>(name: string, params: T): void
export function rendererSendSync<T>(name: string, params?: T): void {
  ipcRenderer.sendSync(name, params)
}

export async function rendererInvoke(name: string): Promise<void>
export async function rendererInvoke<V>(name: string): Promise<V>
export async function rendererInvoke<T>(name: string, params: T): Promise<void>
export async function rendererInvoke<T, V>(name: string, params: T): Promise<V>
export async function rendererInvoke <T, V>(name: string, params?: T): Promise<V> {
  return ipcRenderer.invoke(name, params)
}

export function rendererOn(name: string, listener: LX.IpcRendererEventListener): void
export function rendererOn<T>(name: string, listener: LX.IpcRendererEventListenerParams<T>): void
export function rendererOn<T>(name: string, listener: LX.IpcRendererEventListenerParams<T>): void {
  const wrappedListener = (event: Electron.IpcRendererEvent, params: T) => {
    listener({ event, params })
  }
  let listenerMap = rendererListenerMap.get(listener)
  if (!listenerMap) {
    listenerMap = new Map()
    rendererListenerMap.set(listener, listenerMap)
  }
  listenerMap.set(name, wrappedListener)
  ipcRenderer.on(name, wrappedListener)
}

export function rendererOnce(name: string, listener: LX.IpcRendererEventListener): void
export function rendererOnce<T>(name: string, listener: LX.IpcRendererEventListenerParams<T>): void
export function rendererOnce<T>(name: string, listener: LX.IpcRendererEventListenerParams<T>): void {
  ipcRenderer.once(name, (event, params) => {
    listener({ event, params })
  })
}

export const rendererOff = (name: string, listener: (...args: any[]) => any) => {
  const listenerMap = rendererListenerMap.get(listener)
  const wrappedListener = listenerMap?.get(name) ?? listener
  ipcRenderer.removeListener(name, wrappedListener)
  listenerMap?.delete(name)
  if (listenerMap?.size == 0) rendererListenerMap.delete(listener)
}

export const rendererOffAll = (name: string) => {
  ipcRenderer.removeAllListeners(name)
}
