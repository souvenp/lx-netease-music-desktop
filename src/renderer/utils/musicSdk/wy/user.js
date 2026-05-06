import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'

const csrfToken = cookie => (cookie.match(/_csrf=([^;]+)/) || [])[1] || ''

const headers = cookie => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  origin: 'https://music.163.com',
  Referer: 'https://music.163.com',
  cookie,
})

export default {
  async getAccount(cookie) {
    if (!cookie) throw new Error('Cookie is required')
    const { body, statusCode } = await httpFetch('https://music.163.com/weapi/nuser/account/get', {
      method: 'post',
      headers: headers(cookie),
      form: weapi({
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200 || !body.account) throw new Error('Invalid Netease cookie')
    return {
      uid: String(body.account.id),
      vipType: body.account.vipType || 0,
    }
  },

  async getUid(cookie) {
    const account = await this.getAccount(cookie)
    return account.uid
  },

  async getLikedSongList(uid, cookie) {
    const { body, statusCode } = await httpFetch('https://music.163.com/weapi/song/like/get', {
      method: 'post',
      headers: headers(cookie),
      form: weapi({
        uid: String(uid),
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error('Get liked songs failed')
    return body.ids || []
  },

  async likeSong(songId, like, cookie) {
    const { body, statusCode } = await httpFetch('https://music.163.com/weapi/song/like', {
      method: 'post',
      headers: headers(cookie),
      form: weapi({
        trackId: songId,
        like,
        time: 3,
        alg: 'itembased',
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error(body?.message || 'Like song failed')
    return body
  },

  async followSinger(id, isFollow, cookie) {
    if (!cookie) throw new Error('Cookie is required')
    const action = isFollow ? 'sub' : 'unsub'
    const { body, statusCode } = await httpFetch(`https://music.163.com/weapi/artist/${action}`, {
      method: 'post',
      headers: headers(cookie),
      form: weapi({
        artistId: id,
        artistIds: `['${id}']`,
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error(body?.message || 'Follow artist failed')
    return body
  },

  async subAlbum(id, isSub, cookie) {
    if (!cookie) throw new Error('Cookie is required')
    const action = isSub ? 'sub' : 'unsub'
    const { body, statusCode } = await httpFetch(`https://music.163.com/weapi/album/${action}`, {
      method: 'post',
      headers: headers(cookie),
      form: weapi({
        id,
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error(body?.message || 'Subscribe album failed')
    return body
  },

  async subPlaylist(id, isSub, cookie) {
    if (!cookie) throw new Error('Cookie is required')
    const action = isSub ? 'subscribe' : 'unsubscribe'
    const { body, statusCode } = await httpFetch(`https://music.163.com/weapi/playlist/${action}`, {
      method: 'post',
      headers: headers(cookie),
      form: weapi({
        id,
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error(body?.message || 'Subscribe playlist failed')
    return body
  },

  async scrobble(songId, sourceId, duration, cookie) {
    if (!cookie) throw new Error('Cookie is required')
    const { body, statusCode } = await httpFetch('https://music.163.com/weapi/feedback/weblog', {
      method: 'post',
      headers: headers(cookie),
      form: weapi({
        logs: JSON.stringify([{
          action: 'play',
          json: {
            id: songId,
            download: 0,
            type: 'song',
            sourceId: String(sourceId || 0),
            time: Math.floor(duration),
            end: 'playend',
            wifi: 0,
          },
        }]),
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error(body?.message || 'Scrobble failed')
    return body
  },

  async getUserPlaylists(uid, cookie) {
    const { body, statusCode } = await httpFetch('https://music.163.com/weapi/user/playlist', {
      method: 'post',
      headers: {
        ...headers(cookie),
        Referer: `https://music.163.com/user/home?id=${uid}`,
      },
      form: weapi({
        uid,
        limit: 1000,
        offset: 0,
        includeVideo: true,
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error('Get user playlists failed')
    return body.playlist || []
  },

  async getSublist(cookie, limit = 100, offset = 0) {
    const { body, statusCode } = await httpFetch('https://music.163.com/weapi/artist/sublist', {
      method: 'post',
      headers: headers(cookie),
      form: weapi({
        limit,
        offset,
        total: true,
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error('Get followed artists failed')
    return body.data || []
  },

  async getAllSublist(cookie) {
    let allArtists = []
    let offset = 0
    const limit = 100
    while (true) {
      const artists = await this.getSublist(cookie, limit, offset)
      allArtists = allArtists.concat(artists)
      if (artists.length < limit) break
      offset += limit
    }
    return allArtists
  },

  async getSubAlbumList(cookie, limit = 100, offset = 0) {
    const { body, statusCode } = await httpFetch('https://music.163.com/weapi/album/sublist', {
      method: 'post',
      headers: headers(cookie),
      form: weapi({
        limit,
        offset,
        total: true,
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error('Get subscribed albums failed')
    return body.data || []
  },

  async getAllSubAlbumList(cookie) {
    let allAlbums = []
    let offset = 0
    const limit = 100
    while (true) {
      const albums = await this.getSubAlbumList(cookie, limit, offset)
      allAlbums = allAlbums.concat(albums)
      if (albums.length < limit) break
      offset += limit
    }
    return allAlbums
  },
}
