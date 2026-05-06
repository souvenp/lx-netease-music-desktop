import { computed } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { playMusicInfo } from '@renderer/store/player/state'

export default () => {
  const router = useRouter()

  const currentMusic = computed(() => {
    const musicInfo = playMusicInfo.musicInfo
    if (!musicInfo || !('source' in musicInfo) || musicInfo.source !== 'wy') return null
    return musicInfo
  })

  const neteaseArtists = computed(() => currentMusic.value?.meta.artists ?? [])
  const neteaseArtist = computed(() => neteaseArtists.value[0] ?? null)
  const neteaseAlbum = computed(() => {
    const musicInfo = currentMusic.value
    if (!musicInfo?.meta.albumId) return null
    return {
      id: musicInfo.meta.albumId,
      name: musicInfo.meta.albumName || musicInfo.meta.albumId,
    }
  })

  const openNeteaseArtist = (targetArtist?: { id: string | number, name: string }) => {
    const artist = targetArtist ?? neteaseArtist.value
    if (!artist) return
    void router.push({
      path: '/netease/artist',
      query: {
        id: String(artist.id),
        name: artist.name,
      },
    })
  }

  const openNeteaseAlbum = () => {
    const album = neteaseAlbum.value
    if (!album) return
    void router.push({
      path: '/netease/album',
      query: {
        id: String(album.id),
        name: String(album.name),
      },
    })
  }

  return {
    neteaseArtists,
    neteaseArtist,
    neteaseAlbum,
    openNeteaseArtist,
    openNeteaseAlbum,
  }
}
