import { httpFetch } from '../../request'
import { appSetting } from '@renderer/store/setting'
import { weapi } from './utils/crypto'

const csrfToken = cookie => (cookie.match(/_csrf=([^;]+)/) || [])[1] || ''

const qualityPrefer = type => {
  const prefer = {
    level: 'standard',
    encodeType: 'flac',
  }

  switch (type) {
    case '128k':
      prefer.level = 'standard'
      break
    case '320k':
      prefer.level = 'exhigh'
      break
    case 'flac':
      prefer.level = 'lossless'
      prefer.encodeType = 'aac'
      break
    case 'flac24bit':
      prefer.level = 'hires'
      prefer.encodeType = 'flac'
      break
    default:
      prefer.level = 'exhigh'
      break
  }

  return prefer
}

export const getMusicUrl = (songInfo, type, retryNum = 0) => {
  const requestObj = {}
  if (retryNum > 2) {
    requestObj.promise = Promise.reject(new Error('try max num'))
    requestObj.cancelHttp = () => {}
    return requestObj
  }

  const cookie = appSetting['common.wy_cookie'].trim()
  if (!cookie) {
    requestObj.promise = Promise.reject(new Error('Netease cookie is empty'))
    requestObj.cancelHttp = () => {}
    return requestObj
  }

  const songId = songInfo.songmid || songInfo.meta?.songId
  const prefer = qualityPrefer(type)
  const req = httpFetch('https://music.163.com/weapi/song/enhance/player/url/v1', {
    method: 'post',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      origin: 'https://music.163.com',
      Referer: 'https://music.163.com',
      cookie,
    },
    form: weapi({
      ids: `[${songId}]`,
      level: prefer.level,
      encodeType: prefer.encodeType,
      csrf_token: csrfToken(cookie),
    }),
  })

  requestObj.cancelHttp = req.cancelHttp
  requestObj.promise = req.promise.then(({ body, statusCode }) => {
    if (statusCode !== 200 || body.code !== 200) throw new Error('Cookie request failed')
    const data = body.data?.[0]
    if (!data?.url) {
      if (data?.fee === 1 || data?.fee === 4) throw new Error('VIP song cannot be played with current cookie')
      throw new Error('No Netease cookie url returned')
    }
    return {
      type,
      url: data.url,
      level: data.level,
    }
  }).catch(err => {
    if (/VIP|No Netease cookie url/.test(err.message)) throw err
    const next = getMusicUrl(songInfo, type, retryNum + 1)
    requestObj.cancelHttp = next.cancelHttp
    return next.promise
  })

  return requestObj
}
