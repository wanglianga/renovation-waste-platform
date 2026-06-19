import { ref, computed } from 'vue'
import router from '@/router'

export type UserRole = 'owner' | 'property' | 'transport' | 'driver' | 'disposal'

export interface User {
  id: number
  phone: string
  name: string
  role: UserRole
  company_id: number | null
}

const user = ref<User | null>(null)

function loadUser() {
  const raw = localStorage.getItem('user')
  if (raw) {
    try {
      user.value = JSON.parse(raw)
    } catch {
      user.value = null
    }
  }
}

loadUser()

export function useAuth() {
  const isLoggedIn = computed(() => !!user.value)
  const userRole = computed(() => user.value?.role ?? null)

  function login(token: string, userData: User) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    user.value = userData
    router.push('/dashboard')
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    user.value = null
    router.push('/login')
  }

  function isRole(...roles: UserRole[]): boolean {
    return !!user.value && roles.includes(user.value.role)
  }

  return {
    user,
    isLoggedIn,
    userRole,
    login,
    logout,
    isRole,
  }
}
