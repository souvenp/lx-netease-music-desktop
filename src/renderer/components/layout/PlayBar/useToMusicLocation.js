import { useRouter } from '@common/utils/vueRouter'
import { LIST_IDS } from '@common/constants'
import { tempListMeta } from '@renderer/store/list/state'
import { playInfo, playMusicInfo } from '@renderer/store/player/state'
import { listDetailInfo } from '@renderer/store/songList/state'

const getMusicLocationRoute = (listId, scrollIndex) => {
  const locationId = Date.now()

  if (listId == 'wy_daily_rec') {
    return {
      path: '/netease/daily',
      query: { scrollIndex, locationId },
    }
  }

  const albumMatch = /^wy_album_(.+)$/.exec(listId)
  if (albumMatch) {
    return {
      path: '/netease/album',
      query: {
        id: albumMatch[1],
        scrollIndex,
        locationId,
      },
    }
  }

  const artistMatch = /^wy_artist_(.+)_(hot|time)$/.exec(listId)
  if (artistMatch) {
    return {
      path: '/netease/artist',
      query: {
        id: artistMatch[1],
        sort: artistMatch[2],
        scrollIndex,
        locationId,
      },
    }
  }

  const songListMatch = /^(kw|kg|tx|wy|mg)__(.+)$/.exec(listId)
  if (songListMatch) {
    const source = songListMatch[1]
    const id = songListMatch[2]
    const query = {
      source,
      id,
      scrollIndex,
      locationId,
    }
    if (listDetailInfo.source == source && listDetailInfo.id == id) query.page = listDetailInfo.page

    return {
      path: '/songList/detail',
      query,
    }
  }

  return {
    path: '/list',
    query: {
      id: listId,
      scrollIndex,
      locationId,
    },
  }
}

export default () => {
  const router = useRouter()

  const handleToMusicLocation = () => {
    const listId = playMusicInfo.listId == LIST_IDS.TEMP ? tempListMeta.id : playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD || !playMusicInfo.musicInfo) return
    if (playInfo.playIndex == -1) return

    router.push(getMusicLocationRoute(listId, playInfo.playIndex))
  }

  return {
    handleToMusicLocation,
  }
}
