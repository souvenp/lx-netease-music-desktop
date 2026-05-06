import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import musicDetailApi from './musicDetail'

export default {
  async getAlbum(albumId, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('Get album detail failed'))
    const requestObj = httpFetch(`https://music.163.com/weapi/v1/album/${albumId}`, {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        origin: 'https://music.163.com',
        Referer: `https://music.163.com/album?id=${albumId}`,
      },
      form: weapi({}),
    })
    try {
      const { body, statusCode } = await requestObj.promise
      if (statusCode !== 200 || body.code !== 200 || !body.album) throw new Error('Get album detail failed')
      const list = musicDetailApi.filterList({
        songs: body.songs || [],
        privileges: (body.songs || []).map(song => song.privilege).filter(Boolean),
      })
      return {
        source: 'wy',
        list,
        info: body.album,
      }
    } catch (error) {
      return this.getAlbum(albumId, retryNum + 1)
    }
  },
}
