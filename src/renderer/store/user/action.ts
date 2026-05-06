import musicSdk from '@renderer/utils/musicSdk'
import { appSetting } from '@renderer/store/setting'
import { deduplicationList, toNewMusicInfo } from '@renderer/utils'
import { markRawList } from '@common/utils/vueTools'
import { listDetailInfo } from '@renderer/store/songList/state'
import { removeListDetailCache } from '@renderer/store/songList/action'
import {
  wyLikedSongIds,
  wyFollowedArtists,
  wyPlaylists,
  wySubscribedPlaylists,
  wySubscribedAlbums,
  wyUid,
  wyUserError,
  wyUserLoading,
  wyVipType,
  type WyAlbumInfo,
  type WyArtistInfo,
  type WyPlaylistInfo,
} from './state'

const getCookie = () => appSetting['common.wy_cookie'].trim()

interface WyUserCache {
  uid: string
  vipType: number
  likedIds: Set<string>
  playlists: WyPlaylistInfo[]
  subscribedPlaylists: WyPlaylistInfo[]
  followedArtists: WyArtistInfo[]
  subscribedAlbums: WyAlbumInfo[]
}

const wyUserCache = new Map<string, WyUserCache>()
const wyUserPending = new Map<string, Promise<void>>()
const wyDailyRecCache = new Map<string, LX.Music.MusicInfoOnline[]>()
const wyDailyRecPending = new Map<string, Promise<LX.Music.MusicInfoOnline[]>>()
const wyRecPlaylistsCache = new Map<string, WyPlaylistInfo[]>()
const wyRecPlaylistsPending = new Map<string, Promise<WyPlaylistInfo[]>>()

const isWyLikedPlaylist = (playlist: { name?: string, specialType?: number } | null | undefined) => {
  return playlist?.specialType === 5 || /喜欢.*音乐|喜欢.*歌曲|liked songs?/i.test(playlist?.name ?? '')
}

const getMusicSongId = (musicInfo: LX.Music.MusicInfoOnline) => {
  return String(musicInfo.meta.songId || String(musicInfo.id).replace(/^wy_/, ''))
}

const syncCurrentWyLikedPlaylist = (musicInfo: LX.Music.MusicInfoOnline, like: boolean) => {
  if (listDetailInfo.source !== 'wy') return
  const currentPlaylist = wyPlaylists.find(item => String(item.id) == String(listDetailInfo.id))
  if (!isWyLikedPlaylist(currentPlaylist) && !isWyLikedPlaylist(listDetailInfo.info)) return

  const songId = getMusicSongId(musicInfo)
  const index = listDetailInfo.list.findIndex(item => getMusicSongId(item) == songId)
  if (like) {
    if (index < 0) {
      listDetailInfo.list = markRawList([musicInfo, ...listDetailInfo.list])
      listDetailInfo.total += 1
    }
  } else if (index > -1) {
    listDetailInfo.list = markRawList(listDetailInfo.list.filter((_, idx) => idx != index))
    listDetailInfo.total = Math.max(0, listDetailInfo.total - 1)
  }
}

const syncWyLikedPlaylistCount = (like: boolean) => {
  const likedPlaylist = wyPlaylists.find(isWyLikedPlaylist)
  if (!likedPlaylist) return null
  likedPlaylist.trackCount = Math.max(0, likedPlaylist.trackCount + (like ? 1 : -1))
  return likedPlaylist
}

const resetWyUserState = () => {
  wyUid.value = null
  setWyVipType(0)
  wyLikedSongIds.value = new Set()
  wyPlaylists.splice(0, wyPlaylists.length)
  wySubscribedPlaylists.splice(0, wySubscribedPlaylists.length)
  wyFollowedArtists.splice(0, wyFollowedArtists.length)
  wySubscribedAlbums.splice(0, wySubscribedAlbums.length)
}

const applyWyUserCache = (cache: WyUserCache) => {
  wyUid.value = cache.uid
  setWyVipType(cache.vipType)
  wyLikedSongIds.value = new Set(cache.likedIds)
  wyPlaylists.splice(0, wyPlaylists.length, ...cache.playlists)
  wySubscribedPlaylists.splice(0, wySubscribedPlaylists.length, ...cache.subscribedPlaylists)
  wyFollowedArtists.splice(0, wyFollowedArtists.length, ...cache.followedArtists)
  wySubscribedAlbums.splice(0, wySubscribedAlbums.length, ...cache.subscribedAlbums)
}

export const isWyLiked = (songId: string | number) => {
  return wyLikedSongIds.value.has(String(songId))
}

export const setWyVipType = (type: number) => {
  wyVipType.value = type || 0
}

export const initWyUser = async(force = false) => {
  const isForce = typeof force == 'boolean' && force
  const cookie = getCookie()
  wyUserError.value = ''
  if (!cookie) {
    resetWyUserState()
    return
  }

  if (!isForce) {
    const cached = wyUserCache.get(cookie)
    if (cached) {
      applyWyUserCache(cached)
      return
    }

    const pending = wyUserPending.get(cookie)
    if (pending) return pending
  }

  const task = (async() => {
    wyUserLoading.value = true
    try {
      const account = await musicSdk.wy.user.getAccount(cookie)
      const uid = account.uid
      const [likedIds, allPlaylists, followedArtists, subscribedAlbums] = await Promise.all([
        musicSdk.wy.user.getLikedSongList(uid, cookie),
        musicSdk.wy.user.getUserPlaylists(uid, cookie),
        musicSdk.wy.user.getAllSublist(cookie),
        musicSdk.wy.user.getAllSubAlbumList(cookie),
      ])
      const playlists = (allPlaylists as WyPlaylistInfo[]).filter(item => String(item.userId) == String(uid))
      const subscribedPlaylists = (allPlaylists as WyPlaylistInfo[]).filter(item => String(item.userId) != String(uid))
      const cache: WyUserCache = {
        uid,
        vipType: account.vipType,
        likedIds: new Set(likedIds.map(String)),
        playlists,
        subscribedPlaylists,
        followedArtists: followedArtists as WyArtistInfo[],
        subscribedAlbums: subscribedAlbums as WyAlbumInfo[],
      }
      wyUserCache.set(cookie, cache)
      if (getCookie() == cookie) applyWyUserCache(cache)
    } catch (err: any) {
      if (getCookie() == cookie) {
        resetWyUserState()
        wyUserError.value = err?.message || 'Netease login failed'
      }
      console.log(err)
    } finally {
      wyUserPending.delete(cookie)
      if (getCookie() == cookie) wyUserLoading.value = false
    }
  })()
  wyUserPending.set(cookie, task)
  return task
}

export const toggleWyLike = async(musicInfo: LX.Music.MusicInfoOnline) => {
  if (musicInfo.source !== 'wy') return
  const cookie = getCookie()
  if (!cookie) {
    wyUserError.value = 'Please set Netease cookie first'
    throw new Error(wyUserError.value)
  }

  const songId = getMusicSongId(musicInfo)
  const like = !isWyLiked(songId)
  await musicSdk.wy.user.likeSong(songId, like, cookie)
  const next = new Set(wyLikedSongIds.value)
  if (like) next.add(songId)
  else next.delete(songId)
  wyLikedSongIds.value = next
  syncCurrentWyLikedPlaylist(musicInfo, like)
  const likedPlaylist = syncWyLikedPlaylistCount(like)
  if (likedPlaylist) removeListDetailCache(String(likedPlaylist.id), 'wy')

  const cache = wyUserCache.get(cookie)
  if (cache) cache.likedIds = new Set(next)
}

export const toggleWyFollowArtist = async(artist: { id: string | number, name?: string, picUrl?: string, img1v1Url?: string }) => {
  const cookie = getCookie()
  if (!cookie) {
    wyUserError.value = 'Please set Netease cookie first'
    return
  }

  const artistId = String(artist.id)
  const isFollow = !wyFollowedArtists.some(item => String(item.id) == artistId)
  await musicSdk.wy.user.followSinger(artistId, isFollow, cookie)
  if (isFollow) {
    wyFollowedArtists.unshift(artist as WyArtistInfo)
  } else {
    const index = wyFollowedArtists.findIndex(item => String(item.id) == artistId)
    if (index > -1) wyFollowedArtists.splice(index, 1)
  }
  const cache = wyUserCache.get(cookie)
  if (cache) cache.followedArtists = [...wyFollowedArtists]
}

export const toggleWySubAlbum = async(album: { id: string | number, name?: string, picUrl?: string, artists?: Array<{ id: string | number, name: string }> }) => {
  const cookie = getCookie()
  if (!cookie) {
    wyUserError.value = 'Please set Netease cookie first'
    return
  }

  const albumId = String(album.id)
  const isSub = !wySubscribedAlbums.some(item => String(item.id) == albumId)
  await musicSdk.wy.user.subAlbum(albumId, isSub, cookie)
  if (isSub) {
    wySubscribedAlbums.unshift(album as WyAlbumInfo)
  } else {
    const index = wySubscribedAlbums.findIndex(item => String(item.id) == albumId)
    if (index > -1) wySubscribedAlbums.splice(index, 1)
  }
  const cache = wyUserCache.get(cookie)
  if (cache) cache.subscribedAlbums = [...wySubscribedAlbums]
}

export const toggleWySubPlaylist = async(playlist: { id: string | number, name?: string, coverImgUrl?: string }) => {
  const cookie = getCookie()
  if (!cookie) {
    wyUserError.value = 'Please set Netease cookie first'
    return
  }

  const playlistId = String(playlist.id)
  const isSub = !wySubscribedPlaylists.some(item => String(item.id) == playlistId)
  await musicSdk.wy.user.subPlaylist(playlistId, isSub, cookie)
  if (isSub) {
    wySubscribedPlaylists.unshift(playlist as WyPlaylistInfo)
  } else {
    const index = wySubscribedPlaylists.findIndex(item => String(item.id) == playlistId)
    if (index > -1) wySubscribedPlaylists.splice(index, 1)
  }
  const cache = wyUserCache.get(cookie)
  if (cache) cache.subscribedPlaylists = [...wySubscribedPlaylists]
}

export const getWyDailyRec = async(force = false) => {
  const isForce = typeof force == 'boolean' && force
  const cookie = getCookie()
  if (!cookie) throw new Error('Please set Netease cookie first')

  if (!isForce) {
    const cached = wyDailyRecCache.get(cookie)
    if (cached) return cached

    const pending = wyDailyRecPending.get(cookie)
    if (pending) return pending
  }

  const task = musicSdk.wy.dailyRec.getList(cookie).then((result: { list: any[] }) => {
    const list = markRawList(deduplicationList(result.list.map((m: any) => toNewMusicInfo(m)) as LX.Music.MusicInfoOnline[]))
    wyDailyRecCache.set(cookie, list)
    return list
  }).finally(() => {
    wyDailyRecPending.delete(cookie)
  })

  wyDailyRecPending.set(cookie, task)
  return task
}

export const getWyRecPlaylists = async(force = false) => {
  const isForce = typeof force == 'boolean' && force
  const cookie = getCookie()
  if (!cookie) throw new Error('Please set Netease cookie first')

  if (!isForce) {
    const cached = wyRecPlaylistsCache.get(cookie)
    if (cached) return cached

    const pending = wyRecPlaylistsPending.get(cookie)
    if (pending) return pending
  }

  const task = musicSdk.wy.dailyRec.getRecPlaylists(cookie).then((list: WyPlaylistInfo[]) => {
    wyRecPlaylistsCache.set(cookie, list)
    return list
  }).finally(() => {
    wyRecPlaylistsPending.delete(cookie)
  })

  wyRecPlaylistsPending.set(cookie, task)
  return task
}

export const dislikeWyDailyRecMusic = async(musicInfo: LX.Music.MusicInfoOnline) => {
  const cookie = getCookie()
  if (!cookie) throw new Error('Please set Netease cookie first')
  const songId = musicInfo.meta.songId || String(musicInfo.id).replace(/^wy_/, '')
  const result = await musicSdk.wy.dailyRec.dislike(cookie, songId)
  const newMusic = result ? markRawList([toNewMusicInfo(result) as LX.Music.MusicInfoOnline])[0] : null
  const cached = wyDailyRecCache.get(cookie)
  if (cached) {
    const index = cached.findIndex(item => item.id == musicInfo.id)
    if (index > -1) {
      if (newMusic) cached.splice(index, 1, newMusic)
      else cached.splice(index, 1)
    }
  }
  return newMusic
}

export const wyScrobble = async(songId: string | number, sourceId: string | number | null, duration: number) => {
  const cookie = getCookie()
  if (!cookie) return
  await musicSdk.wy.user.scrobble(songId, sourceId ?? 0, duration, cookie)
}
