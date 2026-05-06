import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import { formatPlayTime, sizeFormate } from '../../index'
import { formatSingerName } from '../utils'

const headers = referer => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  origin: 'https://music.163.com',
  Referer: referer || 'https://music.163.com',
})

export default {
  /**
   * 获取歌手信息
   * @param {*} id
   */
  getInfo(id, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('get singer info faild.'))
    return httpFetch('https://music.163.com/weapi/artist/head/info/get', {
      method: 'post',
      headers: headers(`https://music.163.com/artist?id=${id}`),
      form: weapi({ id }),
    }).promise.then(({ body, statusCode }) => {
      const data = body?.data ?? body
      const artist = data?.artist
      const user = data?.user ?? {}
      if (statusCode !== 200 || body?.code != 200 || !artist?.id) throw new Error('get singer info faild.')
      return {
        source: 'wy',
        id: artist.id,
        info: {
          name: artist.name,
          alias: artist.alias || [],
          desc: artist.briefDesc,
          avatar: user.avatarUrl || artist.picUrl,
          cover: artist.cover || artist.picUrl || user.backgroundUrl || user.avatarUrl,
          gender: user.gender === 1 ? 'man' : 'woman',
        },
        count: {
          music: artist.musicSize,
          album: artist.albumSize,
        },
      }
    }).catch(err => {
      console.log(err)
      return this.getInfo(id, retryNum + 1)
    })
  },
  /**
   * 获取歌手歌曲列表
   * @param {*} id
   * @param {*} page
   * @param {*} limit
   */
  getSongList(id, page = 1, limit = 100, order = 'hot', retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('get singer song list faild.'))
    if (page === 1) page = 0
    return httpFetch('https://music.163.com/weapi/v1/artist/songs', {
      method: 'post',
      headers: headers(`https://music.163.com/artist?id=${id}`),
      form: weapi({
        id,
        private_cloud: 'true',
        work_type: 1,
        order,
        limit,
        offset: limit * page,
      }),
    }).promise.then(({ body, statusCode }) => {
      if (statusCode !== 200 || !body?.songs || body.code != 200) throw new Error('get singer song list faild.')

      const list = this.filterSongList(body.songs)
      return {
        list,
        limit,
        page,
        total: body.total,
        source: 'wy',
      }
    }).catch(err => {
      console.log(err)
      return this.getSongList(id, page, limit, order, retryNum + 1)
    })
  },
  /**
   * 获取歌手专辑列表
   * @param {*} id
   * @param {*} page
   * @param {*} limit
   */
  getAlbumList(id, page = 1, limit = 10, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('get singer album list faild.'))
    if (page === 1) page = 0
    return httpFetch(`https://music.163.com/weapi/artist/albums/${id}`, {
      method: 'post',
      headers: headers(`https://music.163.com/artist/album?id=${id}`),
      form: weapi({
        limit,
        offset: limit * page,
        total: true,
      }),
    }).promise.then(({ body, statusCode }) => {
      if (statusCode !== 200 || !body?.hotAlbums || body.code != 200) throw new Error('get singer album list faild.')

      const list = this.filterAlbumList(body.hotAlbums)
      return {
        source: 'wy',
        list,
        limit,
        page,
        total: body.artist?.albumSize ?? list.length,
      }
    }).catch(err => {
      console.log(err)
      return this.getAlbumList(id, page, limit, retryNum + 1)
    })
  },
  filterAlbumList(raw) {
    const list = []
    raw.forEach(item => {
      if (!item.id) return
      const artists = item.artists || (item.artist ? [item.artist] : [])
      list.push({
        id: item.id,
        count: item.size ?? item.songCount ?? 0,
        info: {
          name: item.name,
          author: formatSingerName(artists),
          img: item.picUrl,
          desc: null,
        },
      })
    })
    return list
  },
  filterSongList(raw) {
    const list = []
    raw.forEach(item => {
      if (!item.id) return

      const types = []
      const _types = {}
      const artists = item.artists || item.ar || []
      const album = item.album || item.al || {}
      const lMusic = item.lMusic || item.l
      const hMusic = item.hMusic || item.h
      const sqMusic = item.sqMusic || item.sq
      const hrMusic = item.hrMusic || item.hr
      const addType = (type, musicInfo) => {
        if (_types[type]) return
        const size = musicInfo?.size ? sizeFormate(musicInfo.size) : null
        types.push({ type, size })
        _types[type] = { size }
      }

      if (lMusic) addType('128k', lMusic)
      if (hMusic) addType('320k', hMusic)
      if (sqMusic) addType('flac', sqMusic)
      if (hrMusic) addType('flac24bit', hrMusic)

      if (!types.length) {
        const maxbr = item.privilege?.maxbr
        if (maxbr >= 128000) addType('128k', lMusic)
        if (maxbr >= 320000) addType('320k', hMusic)
        if (maxbr >= 999000) addType('flac', sqMusic)
        if (item.privilege?.maxBrLevel == 'hires') addType('flac24bit', hrMusic)
      }

      const rawDuration = item.duration ?? item.dt ?? 0
      const interval = formatPlayTime(rawDuration > 10000 ? rawDuration / 1000 : rawDuration)

      list.push({
        singer: formatSingerName(artists),
        artists,
        name: item.name,
        alias: item.alias?.join(' / ') || item.alia?.join(' / ') || '',
        albumName: album.name ?? '',
        albumId: album.id,
        fee: item.fee,
        originCoverType: item.originCoverType,
        mv: item.mv,
        privilege: item.privilege,
        songmid: item.id,
        source: 'wy',
        interval,
        img: album.picUrl ?? '',
        lrc: null,
        otherSource: null,
        types,
        _types,
        typeUrl: {},
      })
    })
    return list
  },
}
