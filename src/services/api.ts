import axios, { AxiosError } from 'axios'
import { parseCookies, setCookie } from 'nookies'
import { signOut } from '../contexts/AuthContext'
import { AuthTokenError } from './erros/AuthTokenError'

let isRefreshing = false
let failedRequestsQueue = []

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx)

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  })

  api.interceptors.response.use(
    response => {
      return response
    },
    error => {
      if (error.response.status === 401) {
        if (error.response.data?.code === 'token.expired') {
          cookies = parseCookies(ctx)
          const { 'nextauth.refreshToken': refreshToken } = cookies
          const orignalConfig = error.config

          if (!isRefreshing) {
            isRefreshing = true

            api
              .post('/refresh', {
                refreshToken
              })
              .then(reponse => {
                const { token } = reponse.data

                setCookie(ctx, 'nextauth.token', token, {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: '/' // definir onde posso user esses cookies, apenas / é global
                })

                setCookie(
                  ctx,
                  'nextauth.refreshToken',
                  reponse.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30, // 30 days
                    path: '/' // definir onde posso user esses cookies, apenas / é global
                  }
                )

                api.defaults.headers['Authorization'] = `Bearer ${token}`

                failedRequestsQueue.forEach(request => request.onSuccess(token))
                failedRequestsQueue = []
              })
              .catch(err => {
                failedRequestsQueue.forEach(request => request.onFailure(err))
                failedRequestsQueue = []

                if (process.browser) {
                  signOut()
                }
              })
              .finally(() => {
                isRefreshing = false
              })
          }

          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token: string) => {
                orignalConfig.headers['Authorization'] = `Bearer ${token}`

                resolve(api(orignalConfig))
              },
              onFailure: (err: AxiosError) => {
                reject(err)
              }
            })
          })
        } else {
          if (process.browser) {
            signOut()
          } else {
            return Promise.reject(new AuthTokenError())
          }
        }
      }

      return Promise.reject(error)
    }
  )

  return api
}
