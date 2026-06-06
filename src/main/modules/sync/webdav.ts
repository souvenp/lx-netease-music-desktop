import { request } from 'undici'

const getAuthHeader = () => {
  const { 'sync.webdav.username': username, 'sync.webdav.password': password } = global.lx.appSetting
  if (!username) return {}
  return {
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  }
}

const encodePath = (path: string) => {
  return path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

const createUrl = (path: string) => {
  const baseUrl = global.lx.appSetting['sync.webdav.url'].trim()
  if (!baseUrl) throw new Error('WebDAV 未配置服务器地址')
  const normalizedPath = encodePath(path)
  return `${baseUrl.replace(/\/+$/, '')}/${normalizedPath}`
}

const requestWebdav = async(path: string, method: string, options: {
  body?: string
  headers?: Record<string, string>
} = {}) => {
  return request(createUrl(path), {
    method,
    body: options.body,
    headers: {
      ...getAuthHeader(),
      ...options.headers,
    },
  })
}

const assertStatus = (statusCode: number, expected: number[], action: string) => {
  if (expected.includes(statusCode)) return
  throw new Error(`${action}失败，服务器返回状态码 ${statusCode}`)
}

export const testConnection = async() => {
  if (!global.lx.appSetting['sync.webdav.username']) throw new Error('WebDAV 未配置用户名')
  const res = await requestWebdav('/', 'PROPFIND', {
    headers: {
      depth: '0',
    },
  })
  assertStatus(res.statusCode, [200, 207], '测试连接')
}

const ensureDirectoryExists = async(dirPath: string) => {
  const segments = dirPath.split('/').filter(Boolean)
  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    const res = await requestWebdav(currentPath, 'MKCOL')
    if ([201, 405].includes(res.statusCode)) continue
    throw new Error(`创建目录 ${currentPath} 失败，服务器返回状态码 ${res.statusCode}`)
  }
}

export const uploadFile = async(path: string, content: string) => {
  const dirPath = path.substring(0, path.lastIndexOf('/'))
  await ensureDirectoryExists(dirPath)
  const res = await requestWebdav(path, 'PUT', {
    body: content,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
  assertStatus(res.statusCode, [200, 201, 204], '上传文件')
}

export const downloadFile = async(path: string): Promise<string | null> => {
  const res = await requestWebdav(path, 'GET')
  if ([404, 409].includes(res.statusCode)) return null
  assertStatus(res.statusCode, [200], '下载文件')
  return res.body.text()
}
