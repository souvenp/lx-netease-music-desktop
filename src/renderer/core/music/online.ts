import { updateListMusics } from '@renderer/store/list/action'
import { appSetting } from '@renderer/store/setting'
import {
  saveLyric,
  saveMusicUrl,
  getMusicUrl as getStoreMusicUrl,
  registerNeteaseCookieMusicUrl,
} from '@renderer/utils/ipc'
import {
  buildLyricInfo,
  getPlayQuality,
  handleGetOnlineLyricInfo,
  handleGetOnlineMusicUrl,
  handleGetOnlinePicUrl,
  getCachedLyricInfo,
} from './utils'
import musicSdk from '@renderer/utils/musicSdk'
import { wyVipType } from '@renderer/store/user/state'

const neteaseCookieMusicUrls = new Set<string>()

export const isNeteaseCookieMusicUrl = (url: string | null | undefined): boolean => {
  return !!url && neteaseCookieMusicUrls.has(url)
}

const markNeteaseCookieMusicUrl = (url: string) => {
  neteaseCookieMusicUrls.add(url)
  registerNeteaseCookieMusicUrl(url)
  setTimeout(() => {
    neteaseCookieMusicUrls.delete(url)
  }, 15 * 60_000)
}

/* export const setMusicUrl = ({ musicInfo, type, url }: {
  musicInfo: LX.Music.MusicInfo
  type: LX.Quality
  url: string
}) => {
  saveMusicUrl(musicInfo, type, url)
}

export const setPic = (datas: {
  listId: string
  musicInfo: LX.Music.MusicInfo
  url: string
}) => {
  datas.musicInfo.img = datas.url
  updateMusicInfo({
    listId: datas.listId,
    id: datas.musicInfo.songmid,
    data: { img: datas.url },
    musicInfo: datas.musicInfo,
  })
}
 */


export const getMusicUrl = async({ musicInfo, quality, isRefresh, allowToggleSource = true, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  // if (!musicInfo._types[type]) {
  //   // 兼容旧版酷我源搜索列表过滤128k音质的bug
  //   if (!(musicInfo.source == 'kw' && type == '128k')) throw new Error('该歌曲没有可播放的音频')

  //   // return Promise.reject(new Error('该歌曲没有可播放的音频'))
  // }
  const targetQuality = quality ?? getPlayQuality(appSetting['player.playQuality'], musicInfo)
  const hasWyCookie = musicInfo.source == 'wy' && !!appSetting['common.wy_cookie'].trim()
  const cachedUrl = await getStoreMusicUrl(musicInfo, targetQuality)
  if (cachedUrl && !isRefresh && !hasWyCookie) return cachedUrl

  const getOnlineUrl = async() => {
    return handleGetOnlineMusicUrl({ musicInfo, quality: targetQuality, onToggleSource, isRefresh, allowToggleSource })
      .then(({ url, quality: targetQuality, musicInfo: targetMusicInfo, isFromCache }) => {
        if (targetMusicInfo.id != musicInfo.id && !isFromCache) void saveMusicUrl(targetMusicInfo, targetQuality, url)
        void saveMusicUrl(musicInfo, targetQuality, url)
        return url
      })
  }

  if (hasWyCookie) {
    const isHighQuality = targetQuality == 'flac' || targetQuality == 'flac24bit'
    const isVipSong = musicInfo.meta.fee === 1 || musicInfo.meta.fee === 4
    const shouldPreferApi = wyVipType.value == 0 && (isHighQuality || isVipSong)

    if (shouldPreferApi) return getOnlineUrl()

    try {
      const { url } = await musicSdk.wy.cookie.getMusicUrl(musicInfo, targetQuality).promise
      if (url) {
        markNeteaseCookieMusicUrl(url)
        void saveMusicUrl(musicInfo, targetQuality, url)
        return url
      }
    } catch (err) {
      console.log('Get wy music url with cookie failed, fallback to api', err)
    }
  }

  return getOnlineUrl()
}

export const getPicUrl = async({ musicInfo, listId, isRefresh, allowToggleSource = true, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoOnline
  listId?: string | null
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (musicInfo.meta.picUrl && !isRefresh) return musicInfo.meta.picUrl
  return handleGetOnlinePicUrl({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(({ url, musicInfo: targetMusicInfo, isFromCache }) => {
    // picRequest = null
    if (listId) {
      musicInfo.meta.picUrl = url
      void updateListMusics([{ id: listId, musicInfo }])
    }
    // savePic({ musicInfo, url, listId })
    return url
  })
}
export const getLyricInfo = async({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoOnline
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo)
    if (lyricInfo) return buildLyricInfo(lyricInfo)
  }

  // lrcRequest = music[musicInfo.source].getLyric(musicInfo)
  return handleGetOnlineLyricInfo({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(async({ lyricInfo, musicInfo: targetMusicInfo, isFromCache }) => {
    // lrcRequest = null
    if (isFromCache) return buildLyricInfo(lyricInfo)
    if (targetMusicInfo.id == musicInfo.id) void saveLyric(musicInfo, lyricInfo)
    else void saveLyric(targetMusicInfo, lyricInfo)

    return buildLyricInfo(lyricInfo)
  })
}
