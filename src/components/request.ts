import { logger } from 'node-karin'
import fetch from 'node-fetch'

class Request {
  createOptions (
    method: any,
    options: { headers?: Record<string, string>; body?: any } = {}
  ) {
    const { headers = {}, body } = options
    const Headers = body
      ? { 'Content-Type': 'application/json', ...headers }
      : { ...headers }
    return {
      method,
      headers: Headers,
      body: body ? JSON.stringify(body) : undefined,
    }
  }

  async HandleRequest (response: { json: () => any; text: () => any }, responseType: string) {
    if (responseType === 'raw') return response
    try {
      if (responseType === 'json') {
        return await response.json()
      } else {
        return await response.text()
      }
    } catch (error) {
      logger.error('[karin-plugin-gamepush] 解析响应失败', error)
      return false
    }
  }

  async request (method: string, url: string, options: { body?: any; responseType?: string; headers?: Record<string, string>; log?: boolean; gameName?: string } = {}) {
    const { body, responseType = 'json', headers = {}, log = true, gameName } = options
    const requestOptions = this.createOptions(method, { body, headers })
    const gamePrefix = gameName ? `[karin-plugin-gamepush][${gameName}]` : '[karin-plugin-gamepush]'
    try {
      if (log) {
        logger.debug(`${gamePrefix} ${method}请求URL:`, url)
      }
      const response = await fetch(url, requestOptions)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      return await this.HandleRequest(response, responseType)
    } catch (error: any) {
      const gamePrefix = gameName ? `[karin-plugin-gamepush][${gameName}]` : '[karin-plugin-gamepush]'
      if (log) logger.error(`${gamePrefix} ${method}请求失败:`, error.message)
      return false
    }
  }

  async get (url: string, options: { headers?: Record<string, string>; responseType?: string; log?: boolean; gameName?: string } = {}) {
    return this.request('GET', url, options)
  }

  async post (url: string, options: { body?: any; headers?: Record<string, string>; responseType?: string; log?: boolean; gameName?: string } = {}) {
    return this.request('POST', url, options)
  }
}

export default new Request()
