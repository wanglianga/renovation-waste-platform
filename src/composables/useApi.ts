import router from '@/router'

const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  error?: string
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
    throw new Error('未授权，请重新登录')
  }

  const json: ApiResponse<T> = await res.json()

  if (!res.ok) {
    throw new Error(json.error || `请求失败: ${res.status}`)
  }

  if (!json.success) {
    throw new Error(json.error || '请求失败')
  }

  return json.data
}

export function useApi() {
  const get = <T>(path: string) => request<T>('GET', path)
  const post = <T>(path: string, body: unknown) => request<T>('POST', path, body)
  const put = <T>(path: string, body: unknown) => request<T>('PUT', path, body)

  async function uploadFile(file: File): Promise<{ path: string; originalName: string }> {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error || '上传失败')
    }
    return json.data
  }

  return { get, post, put, uploadFile }
}
