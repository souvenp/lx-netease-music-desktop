import { DOWNLOAD_STATUS, LIST_IDS } from '@common/constants'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { dateFormat } from '@common/utils/common'
import { getApiDataForSync, getApiList, overwriteApiDataForSync } from '@main/modules/userApi'
import { removeSelectModeListener, sendCloseSelectMode, sendEvent, sendSelectMode } from '@main/modules/winMain'
import log from './log'
import * as webdav from './webdav'

interface ListsSyncFile {
  version?: string
  lastModified: number
  data: LX.List.ListDataFull
  playHistory?: any[]
  downloadTasks?: SyncedDownloadTask[]
}

interface SyncedDownloadTask {
  id: string
  musicInfo: LX.Music.MusicInfoOnline
  quality: LX.Quality
  status: 'waiting' | 'downloading' | 'paused' | 'completed' | 'error'
  progress: {
    percent: number
    speed: string
    downloaded: number
    total: number
  }
  metadataStatus: {
    cover: 'pending' | 'success' | 'fail'
    lyric: 'pending' | 'success' | 'fail'
    tags: 'pending' | 'success' | 'fail'
  }
  errorMsg?: string
  createdAt: number
  filePath: string
  fileName: string
  isForceCookie?: boolean
  isRemoteSynced?: boolean
}

type UserApisSyncData = Awaited<ReturnType<typeof getApiDataForSync>>

let listsChanged = false
let downloadTasksChanged = false
let isSyncing = false
let syncTimer: NodeJS.Timeout | null = null
let isRegistered = false

const setListsChanged = (changed: boolean) => {
  listsChanged = changed
}

const setDownloadTasksChanged = (changed: boolean) => {
  downloadTasksChanged = changed
}

const setSyncing = (syncing: boolean) => {
  isSyncing = syncing
}

const getRemotePath = (fileName: string) => {
  const path = global.lx.appSetting['sync.webdav.path'] || '/LX_Music/'
  const cleanPath = path.replace(/^\/|\/$/g, '')
  return cleanPath ? `/${cleanPath}/${fileName}` : `/${fileName}`
}

const getRemoteListsFilePath = () => getRemotePath('playlists.json')
const getRemoteSettingsFilePath = () => getRemotePath('settings_desktop.json')
const getRemoteUserApisFilePath = () => getRemotePath('user_apis.json')

const normalizeRemoteListsData = (remoteData: Partial<ListsSyncFile>): ListsSyncFile => ({
  ...remoteData,
  lastModified: remoteData.lastModified ?? 0,
  data: {
    defaultList: remoteData.data?.defaultList ?? [],
    loveList: remoteData.data?.loveList ?? [],
    userList: remoteData.data?.userList ?? [],
    tempList: remoteData.data?.tempList ?? [],
  },
  playHistory: Array.isArray(remoteData.playHistory) ? remoteData.playHistory : undefined,
  downloadTasks: Array.isArray(remoteData.downloadTasks) ? normalizeDownloadTasksForSync(remoteData.downloadTasks) : undefined,
})

const filterSensitiveSettingsForSync = (settings: Partial<LX.AppSetting>) => {
  const {
    'common.wy_cookie': _wyCookie,
    'sync.webdav.password': _webdavPassword,
    ...restSettings
  } = settings
  const {
    'common.yt_cookie': _ytCookie,
    ...nextSettings
  } = restSettings as Record<string, unknown>
  return nextSettings as Partial<LX.AppSetting>
}

const getLocalListData = async(): Promise<LX.List.ListDataFull> => {
  const userListInfos = await global.lx.worker.dbService.getAllUserList()
  const userList: LX.List.UserListInfoFull[] = []
  for await (const list of userListInfos) {
    userList.push({
      id: list.id,
      name: list.name,
      source: list.source,
      sourceListId: list.sourceListId,
      locationUpdateTime: list.locationUpdateTime,
      list: await global.lx.worker.dbService.getListMusics(list.id),
    })
  }

  return {
    defaultList: await global.lx.worker.dbService.getListMusics(LIST_IDS.DEFAULT),
    loveList: await global.lx.worker.dbService.getListMusics(LIST_IDS.LOVE),
    userList,
    tempList: await global.lx.worker.dbService.getListMusics(LIST_IDS.TEMP),
  }
}

const normalizeDownloadTasksForSync = (tasks: SyncedDownloadTask[]): SyncedDownloadTask[] => {
  return tasks.filter(task => task?.id && task.musicInfo).map(task => ({
    id: String(task.id),
    musicInfo: task.musicInfo,
    quality: task.quality,
    status: 'paused',
    errorMsg: '',
    isRemoteSynced: false,
    progress: {
      percent: 0,
      speed: '',
      downloaded: 0,
      total: task.progress?.total ?? 0,
    },
    metadataStatus: {
      cover: 'pending',
      lyric: 'pending',
      tags: 'pending',
    },
    createdAt: Number.isFinite(task.createdAt) ? task.createdAt : 0,
    filePath: task.filePath ?? '',
    fileName: task.fileName ?? '',
    isForceCookie: task.isForceCookie,
  }))
}

const getLocalDownloadTasksForSync = async(): Promise<SyncedDownloadTask[]> => {
  const downloadList = await global.lx.worker.dbService.getDownloadList()
  return normalizeDownloadTasksForSync(downloadList.map((task, index) => ({
    id: task.id,
    musicInfo: task.metadata.musicInfo,
    quality: task.metadata.quality,
    status: 'paused',
    progress: {
      percent: 0,
      speed: '',
      downloaded: 0,
      total: task.total,
    },
    metadataStatus: {
      cover: 'pending',
      lyric: 'pending',
      tags: 'pending',
    },
    errorMsg: '',
    createdAt: task.createdAt ?? Date.now() - index,
    filePath: task.metadata.filePath,
    fileName: task.metadata.fileName,
    isForceCookie: task.metadata.isNeteaseCookieUrl,
    isRemoteSynced: false,
  })))
}

const mergeDownloadTasks = (
  localTasks: SyncedDownloadTask[],
  remoteTasks?: SyncedDownloadTask[],
) => {
  const taskMap = new Map<string, SyncedDownloadTask>()
  for (const task of normalizeDownloadTasksForSync(remoteTasks ?? [])) taskMap.set(task.id, task)
  for (const task of normalizeDownloadTasksForSync(localTasks)) taskMap.set(task.id, task)
  return [...taskMap.values()].sort((a, b) => b.createdAt - a.createdAt)
}

const getDownloadTaskFileExt = (task: SyncedDownloadTask): LX.Download.FileExt => {
  const ext = task.fileName.match(/\.([^.\\/]+)$/)?.[1]?.toLowerCase()
  switch (ext) {
    case 'ape':
    case 'flac':
    case 'wav':
    case 'mp3':
      return ext
    default:
      switch (task.quality) {
        case 'ape':
          return 'ape'
        case 'flac':
        case 'flac24bit':
          return 'flac'
        case 'wav':
          return 'wav'
        default:
          return 'mp3'
      }
  }
}

const toRemoteSyncedDownloadTask = (task: SyncedDownloadTask): LX.Download.ListItem => {
  return {
    id: task.id,
    isComplate: false,
    status: DOWNLOAD_STATUS.PAUSE,
    statusText: '',
    downloaded: 0,
    total: task.progress?.total ?? 0,
    progress: 0,
    speed: '',
    writeQueue: 0,
    createdAt: task.createdAt,
    isRemoteSynced: true,
    metadata: {
      musicInfo: task.musicInfo,
      url: null,
      quality: task.quality,
      ext: getDownloadTaskFileExt(task),
      fileName: task.fileName,
      filePath: task.filePath,
      isNeteaseCookieUrl: task.isForceCookie,
    },
  }
}

const applyRemoteDownloadTasks = async(remoteTasks?: SyncedDownloadTask[]) => {
  if (!remoteTasks) return
  const localTasks = await global.lx.worker.dbService.getDownloadList()
  const remoteTaskMap = new Map(normalizeDownloadTasksForSync(remoteTasks).map(task => [task.id, task]))
  const mergedTasks: LX.Download.ListItem[] = []

  for (const localTask of localTasks) {
    const remoteTask = remoteTaskMap.get(localTask.id)
    if (localTask.isRemoteSynced && remoteTask) {
      mergedTasks.push(toRemoteSyncedDownloadTask(remoteTask))
    } else if (!localTask.isRemoteSynced) {
      mergedTasks.push(localTask)
    }
    remoteTaskMap.delete(localTask.id)
  }

  mergedTasks.push(...[...remoteTaskMap.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(toRemoteSyncedDownloadTask))

  await global.lx.worker.dbService.downloadInfoOverwrite(mergedTasks)
  sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.download_list_overwrite, mergedTasks)
}

const setLocalListData = async(listData: LX.List.ListDataFull) => {
  await global.lx.event_list.list_data_overwrite(listData, true)
}

const hasListData = (listData: LX.List.ListDataFull) => {
  return !!(listData.defaultList.length || listData.loveList.length || listData.userList.length || listData.tempList.length)
}

const createUserListDataObj = (listData: LX.List.ListDataFull) => {
  const userListDataObj = new Map<string, LX.List.UserListInfoFull>()
  for (const list of listData.userList) userListDataObj.set(list.id, list)
  return userListDataObj
}

const mergeMusicList = (
  sourceList: LX.Music.MusicInfo[],
  targetList: LX.Music.MusicInfo[],
  addMusicLocationType: LX.AddMusicLocationType,
): LX.Music.MusicInfo[] => {
  const map = new Map<string | number, LX.Music.MusicInfo>()
  const ids: Array<string | number> = []
  const newList = addMusicLocationType == 'top'
    ? [...targetList, ...sourceList]
    : [...sourceList, ...targetList]

  if (addMusicLocationType == 'top') {
    for (let i = newList.length - 1; i > -1; i--) {
      const item = newList[i]
      if (map.has(item.id)) continue
      ids.unshift(item.id)
      map.set(item.id, item)
    }
  } else {
    for (const item of newList) {
      if (map.has(item.id)) continue
      ids.push(item.id)
      map.set(item.id, item)
    }
  }
  return ids.map(id => map.get(id)) as LX.Music.MusicInfo[]
}

const mergeList = (sourceListData: LX.List.ListDataFull, targetListData: LX.List.ListDataFull): LX.List.ListDataFull => {
  const addMusicLocationType = global.lx.appSetting['list.addMusicLocationType']
  const newListData: LX.List.ListDataFull = {
    defaultList: mergeMusicList(sourceListData.defaultList, targetListData.defaultList, addMusicLocationType),
    loveList: mergeMusicList(sourceListData.loveList, targetListData.loveList, addMusicLocationType),
    tempList: mergeMusicList(sourceListData.tempList, targetListData.tempList, addMusicLocationType),
    userList: [...sourceListData.userList],
  }
  const userListDataObj = createUserListDataObj(sourceListData)

  targetListData.userList.forEach((list, index) => {
    const targetUpdateTime = list?.locationUpdateTime ?? 0
    const sourceList = userListDataObj.get(list.id)
    if (sourceList) {
      sourceList.list = mergeMusicList(sourceList.list, list.list, addMusicLocationType)
      const sourceUpdateTime = sourceList?.locationUpdateTime ?? 0
      if (targetUpdateTime >= sourceUpdateTime) return
      const [newList] = newListData.userList.splice(newListData.userList.findIndex(l => l.id == list.id), 1)
      newList.locationUpdateTime = targetUpdateTime
      newListData.userList.splice(index, 0, newList)
    } else {
      if (targetUpdateTime) newListData.userList.splice(index, 0, list)
      else newListData.userList.push(list)
    }
  })

  return newListData
}

const overwriteList = (sourceListData: LX.List.ListDataFull, targetListData: LX.List.ListDataFull): LX.List.ListDataFull => {
  const newListData: LX.List.ListDataFull = {
    defaultList: sourceListData.defaultList,
    loveList: sourceListData.loveList,
    tempList: sourceListData.tempList,
    userList: [...sourceListData.userList],
  }
  const userListDataObj = createUserListDataObj(sourceListData)

  targetListData.userList.forEach((list, index) => {
    if (userListDataObj.has(list.id)) return
    if (list?.locationUpdateTime) newListData.userList.splice(index, 0, list)
    else newListData.userList.push(list)
  })

  return newListData
}

const selectSyncMode = async() => {
  return new Promise<LX.Sync.List.SyncMode>((resolve, reject) => {
    sendSelectMode('WebDAV', 'list', (mode) => {
      removeSelectModeListener()
      if (mode == null || mode == 'cancel') {
        reject(new Error('cancel'))
        return
      }
      resolve(mode)
    })
  })
}

const resolveListDataByMode = (mode: LX.Sync.List.SyncMode, localData: LX.List.ListDataFull, remoteData: LX.List.ListDataFull) => {
  switch (mode) {
    case 'merge_local_remote':
      return mergeList(localData, remoteData)
    case 'merge_remote_local':
      return mergeList(remoteData, localData)
    case 'overwrite_local_remote':
      return overwriteList(localData, remoteData)
    case 'overwrite_remote_local':
      return overwriteList(remoteData, localData)
    case 'overwrite_local_remote_full':
      return localData
    case 'overwrite_remote_local_full':
      return remoteData
    default:
      throw new Error('cancel')
  }
}

const readRemoteLists = async(path = getRemoteListsFilePath()) => {
  const remoteListsContent = await webdav.downloadFile(path)
  return remoteListsContent == null ? null : normalizeRemoteListsData(JSON.parse(remoteListsContent))
}

const uploadLists = async(path: string, listsData: LX.List.ListDataFull, remoteExtraData?: Pick<ListsSyncFile, 'playHistory' | 'downloadTasks'>) => {
  const timestamp = Date.now()
  const localDownloadTasks = await getLocalDownloadTasksForSync()
  const remoteDownloadTasks = downloadTasksChanged ? undefined : remoteExtraData?.downloadTasks
  const dataObject: ListsSyncFile = {
    version: '2',
    lastModified: timestamp,
    data: listsData,
    downloadTasks: mergeDownloadTasks(localDownloadTasks, remoteDownloadTasks),
  }
  if (remoteExtraData?.playHistory) dataObject.playHistory = remoteExtraData.playHistory
  await webdav.uploadFile(path, JSON.stringify(dataObject))
  global.lx.event_app.update_config({ 'sync.webdav.lastSyncTimeLists': timestamp })
  return timestamp
}

const uploadSettings = async(path: string) => {
  const timestamp = Date.now()
  await webdav.uploadFile(path, JSON.stringify({
    version: '2',
    lastModified: timestamp,
    data: filterSensitiveSettingsForSync(global.lx.appSetting),
  }))
  return timestamp
}

const uploadUserApis = async(path: string) => {
  const timestamp = Date.now()
  await webdav.uploadFile(path, JSON.stringify({
    version: '2',
    lastModified: timestamp,
    data: await getApiDataForSync(),
  }))
  return timestamp
}

const assertWebdavConfigured = () => {
  if (!global.lx.appSetting['sync.webdav.enable'] || !global.lx.appSetting['sync.webdav.url']) {
    throw new Error('请先启用并配置 WebDAV 同步')
  }
}

export const manualUploadSettingsAndApis = async() => {
  assertWebdavConfigured()
  await uploadSettings(getRemoteSettingsFilePath())
  await uploadUserApis(getRemoteUserApisFilePath())
}

export const manualDownloadSettingsAndApis = async() => {
  assertWebdavConfigured()
  const remoteSettingsContent = await webdav.downloadFile(getRemoteSettingsFilePath())
  if (remoteSettingsContent) {
    const remoteSettingsData = JSON.parse(remoteSettingsContent) as { data?: Partial<LX.AppSetting> }
    if (remoteSettingsData.data) global.lx.event_app.update_config(filterSensitiveSettingsForSync(remoteSettingsData.data))
  }

  const remoteUserApisContent = await webdav.downloadFile(getRemoteUserApisFilePath())
  if (remoteUserApisContent) {
    const remoteApisData = JSON.parse(remoteUserApisContent) as { data?: UserApisSyncData }
    if (remoteApisData.data) overwriteApiDataForSync(remoteApisData.data)
  }
  return {
    userApiList: getApiList(),
  }
}

export const manualUploadLists = async() => {
  assertWebdavConfigured()
  const remoteListsPath = getRemoteListsFilePath()
  const remoteData = await readRemoteLists(remoteListsPath)
  await uploadLists(remoteListsPath, await getLocalListData(), remoteData ?? undefined)
  setListsChanged(false)
  setDownloadTasksChanged(false)
}

export const manualDownloadLists = async() => {
  assertWebdavConfigured()
  const remoteData = await readRemoteLists()
  if (!remoteData) throw new Error('云端未找到歌单文件')
  await setLocalListData(remoteData.data)
  await applyRemoteDownloadTasks(remoteData.downloadTasks)
  global.lx.event_app.update_config({ 'sync.webdav.lastSyncTimeLists': remoteData.lastModified })
  setListsChanged(false)
  setDownloadTasksChanged(false)
}

export const triggerWebDAVSync = async(isManual = false) => {
  if (isSyncing) return
  if (!global.lx.appSetting['sync.webdav.enable'] || !global.lx.appSetting['sync.webdav.url']) return
  if (!isManual && !global.lx.appSetting['sync.webdav.syncLists']) return

  setSyncing(true)
  const remoteListsPath = getRemoteListsFilePath()
  try {
    const remoteData = await readRemoteLists(remoteListsPath)
    const localData = await getLocalListData()
    if (!remoteData) {
      await uploadLists(remoteListsPath, localData)
      setListsChanged(false)
      setDownloadTasksChanged(false)
      return
    }

    const remoteTimestamp = remoteData.lastModified
    const localTimestamp = global.lx.appSetting['sync.webdav.lastSyncTimeLists'] ?? 0
    const hasRemoteUpdate = remoteTimestamp > localTimestamp
    const hasLocalChanges = listsChanged

    if (localTimestamp === 0 && hasListData(remoteData.data) && hasListData(localData)) {
      const mode = await selectSyncMode()
      const mergedData = resolveListDataByMode(mode, localData, remoteData.data)
      await setLocalListData(mergedData)
      await applyRemoteDownloadTasks(remoteData.downloadTasks)
      await uploadLists(remoteListsPath, mergedData, remoteData)
      setListsChanged(false)
      setDownloadTasksChanged(false)
      return
    }

    if (hasRemoteUpdate && hasLocalChanges) {
      const mode = await selectSyncMode()
      const mergedData = resolveListDataByMode(mode, localData, remoteData.data)
      await setLocalListData(mergedData)
      await applyRemoteDownloadTasks(remoteData.downloadTasks)
      await uploadLists(remoteListsPath, mergedData, remoteData)
      setListsChanged(false)
      setDownloadTasksChanged(false)
    } else if (hasRemoteUpdate) {
      await setLocalListData(remoteData.data)
      await applyRemoteDownloadTasks(remoteData.downloadTasks)
      global.lx.event_app.update_config({ 'sync.webdav.lastSyncTimeLists': remoteTimestamp })
      setListsChanged(false)
      setDownloadTasksChanged(false)
    } else if (hasLocalChanges) {
      await uploadLists(remoteListsPath, localData, remoteData)
      setListsChanged(false)
      setDownloadTasksChanged(false)
    } else if (isManual) {
      log.info(`[WebDAV Sync] Lists are up to date at ${dateFormat(Date.now())}`)
    }
  } catch (err: any) {
    if (err.message == 'cancel') {
      sendCloseSelectMode()
      return
    }
    log.error('[WebDAV Sync] Sync failed:', err.stack ?? err.message)
    throw err
  } finally {
    setSyncing(false)
  }
}

const scheduleAutoSync = () => {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void triggerWebDAVSync(false).catch(err => {
      log.error('[WebDAV Sync] Auto sync failed:', err.stack ?? err.message)
    })
  }, 3000)
}

const markListsChanged = () => {
  if (!global.lx.appSetting['sync.webdav.enable'] || !global.lx.appSetting['sync.webdav.syncLists']) return
  setListsChanged(true)
  scheduleAutoSync()
}

export const markDownloadTasksChanged = () => {
  setDownloadTasksChanged(true)
  markListsChanged()
}

const markListsChangedIfLocal = async(isRemote?: boolean) => {
  if (!isRemote) markListsChanged()
}

export const registerWebDAVSync = () => {
  if (isRegistered) return
  isRegistered = true

  global.lx.event_list.on('list_data_overwrite', async(_listData, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_create', async(_position, _listInfos, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_remove', async(_ids, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_update', async(_lists, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_update_position', async(_position, _ids, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_music_overwrite', async(_listId, _musicInfos, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_music_add', async(_id, _musicInfos, _addMusicLocationType, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_music_move', async(_fromId, _toId, _musicInfos, _addMusicLocationType, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_music_remove', async(_listId, _ids, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_music_update', async(_musicInfos, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_music_clear', async(_ids, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  global.lx.event_list.on('list_music_update_position', async(_listId, _position, _ids, isRemote) => {
    await markListsChangedIfLocal(isRemote)
  })
  ;(global.lx.event_app as any).on('webdav_download_tasks_changed', () => {
    markDownloadTasksChanged()
  })

  global.lx.event_app.on('main_window_inited', () => {
    if (!global.lx.appSetting['sync.webdav.url']) return
    void triggerWebDAVSync(false).catch(err => {
      log.error('[WebDAV Sync] Initial sync failed:', err.stack ?? err.message)
    })
  })
}

export const testConnection = webdav.testConnection
