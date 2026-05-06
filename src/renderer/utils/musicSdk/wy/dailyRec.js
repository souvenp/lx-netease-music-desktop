import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import musicDetailApi from './musicDetail'

const csrfToken = cookie => (cookie.match(/_csrf=([^;]+)/) || [])[1] || ''
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export default {
  async getList(cookie, retryNum = 0) {
    if (!cookie) throw new Error('Cookie is required')
    if (retryNum > 2) throw new Error('try max num')

    try {
      const { body, statusCode } = await httpFetch('https://music.163.com/weapi/v3/discovery/recommend/songs', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({
          offset: 0,
          total: true,
          limit: 30,
          csrf_token: csrfToken(cookie),
        }),
      }).promise

      if (statusCode !== 200 || body.code !== 200 || !body.data?.dailySongs) {
        return this.getList(cookie, retryNum + 1)
      }

      const ids = body.data.dailySongs.map(song => song.id).filter(Boolean)
      if (!ids.length) return { list: [], source: 'wy' }
      return musicDetailApi.getList(ids)
    } catch (err) {
      await sleep(300)
      return this.getList(cookie, retryNum + 1)
    }
  },

  async getRecPlaylists(cookie, retryNum = 0) {
    if (!cookie) throw new Error('Cookie is required')
    if (retryNum > 2) throw new Error('try max num')
    try {
      const { body, statusCode } = await httpFetch('https://music.163.com/weapi/v1/discovery/recommend/resource', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({
          csrf_token: csrfToken(cookie),
        }),
      }).promise
      if (statusCode !== 200 || body.code !== 200) return this.getRecPlaylists(cookie, retryNum + 1)
      return body.recommend || []
    } catch (err) {
      await sleep(300)
      return this.getRecPlaylists(cookie, retryNum + 1)
    }
  },

  async getHeartbeatModeList(cookie, playlistId, songId, retryNum = 0) {
    if (!cookie) throw new Error('Cookie is required')
    if (retryNum > 2) throw new Error('try max num')
    try {
      const { body, statusCode } = await httpFetch(`https://music.163.com/weapi/playmode/intelligence/list?csrf_token=${csrfToken(cookie)}`, {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          origin: 'https://music.163.com',
          Referer: 'https://music.163.com',
          cookie,
        },
        form: weapi({
          playlistId,
          songId,
          type: 'fromPlayOne',
          startMusicId: songId,
          count: '150',
          csrf_token: csrfToken(cookie),
        }),
      }).promise
      if (statusCode !== 200 || body.code !== 200) return this.getHeartbeatModeList(cookie, playlistId, songId, retryNum + 1)
      const ids = (body.data || []).map(item => item.id || item.songInfo?.id).filter(Boolean)
      if (!ids.length) return { list: [], source: 'wy' }
      return musicDetailApi.getList(ids)
    } catch (err) {
      await sleep(300)
      return this.getHeartbeatModeList(cookie, playlistId, songId, retryNum + 1)
    }
  },

  async dislike(cookie, songId) {
    if (!cookie) throw new Error('Cookie is required')
    const { body, statusCode } = await httpFetch('https://music.163.com/weapi/v2/discovery/recommend/dislike', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        resId: songId,
        resType: 4,
        sceneType: 1,
        csrf_token: csrfToken(cookie),
      }),
    }).promise
    if (statusCode !== 200 || body.code !== 200) throw new Error(body?.message || 'Dislike daily recommend failed')
    const nextId = body.data?.id
    if (!nextId) return null
    const detail = await musicDetailApi.getList([nextId])
    return detail.list?.[0] || null
  },
}
