import { ref, shallowReactive } from '@common/utils/vueTools'

export interface WyPlaylistInfo {
  id: string | number
  userId: number
  name: string
  coverImgUrl: string
  trackCount: number
  playCount?: number
  specialType?: number
  description?: string
  creator?: {
    nickname?: string
  }
}

export interface WyArtistInfo {
  id: string | number
  name: string
  alias?: string[] | null
  albumSize?: number
  musicSize?: number
  mvSize?: number
  picUrl?: string
  img1v1Url?: string
}

export interface WyAlbumInfo {
  id: string | number
  name: string
  picUrl: string
  size: number
  publishTime?: number
  artists?: Array<{ id: string | number, name: string }>
  artistName?: string
  artistId?: string | number
}

export const wyUid = ref<string | null>(null)
export const wyVipType = ref(0)
export const wyLikedSongIds = ref<Set<string>>(new Set())
export const wyPlaylists = shallowReactive<WyPlaylistInfo[]>([])
export const wySubscribedPlaylists = shallowReactive<WyPlaylistInfo[]>([])
export const wyFollowedArtists = shallowReactive<WyArtistInfo[]>([])
export const wySubscribedAlbums = shallowReactive<WyAlbumInfo[]>([])
export const wyUserLoading = ref(false)
export const wyUserError = ref('')
