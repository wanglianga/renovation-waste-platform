<script setup lang="ts">
import { ref } from 'vue'
import { User, Building2, Truck, Car, Recycle } from 'lucide-vue-next'
import { useAuth, type UserRole } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'

const { login } = useAuth()
const { post } = useApi()

const selectedRole = ref<UserRole | null>(null)
const phone = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

interface RoleOption {
  value: UserRole
  label: string
  icon: typeof User
  color: string
}

const roles: RoleOption[] = [
  { value: 'owner', label: '业主', icon: User, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'property', label: '物业', icon: Building2, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { value: 'transport', label: '清运公司', icon: Truck, color: 'bg-green-50 text-green-600 border-green-200' },
  { value: 'driver', label: '司机', icon: Car, color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { value: 'disposal', label: '消纳场', icon: Recycle, color: 'bg-teal-50 text-teal-600 border-teal-200' },
]

const demoAccounts: Record<string, { phone: string; password: string }> = {
  owner: { phone: '13800000001', password: '123456' },
  property: { phone: '13800000002', password: '123456' },
  transport: { phone: '13800000003', password: '123456' },
  driver: { phone: '13800000004', password: '123456' },
  disposal: { phone: '13800000005', password: '123456' },
}

function selectRole(role: UserRole) {
  selectedRole.value = role
  const demo = demoAccounts[role]
  if (demo) {
    phone.value = demo.phone
    password.value = demo.password
  }
  error.value = ''
}

async function handleLogin() {
  if (!selectedRole.value) {
    error.value = '请选择角色'
    return
  }
  if (!phone.value || !password.value) {
    error.value = '请填写手机号和密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res = await post<{ token: string; user: { id: number; phone: string; name: string; role: UserRole; company_id: number | null } }>('/auth/login', {
      phone: phone.value,
      password: password.value,
    })
    login(res.token, res.user)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-primary-800">装修垃圾清运预约与消纳结算平台</h1>
        <p class="text-primary-600 mt-2">请选择您的角色并登录</p>
      </div>

      <div class="card">
        <div class="grid grid-cols-5 gap-2 mb-6">
          <button
            v-for="role in roles"
            :key="role.value"
            :class="[
              'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200',
              selectedRole === role.value
                ? 'border-primary-600 ring-2 ring-primary-200 ' + role.color
                : 'border-gray-200 hover:border-gray-300 bg-gray-50 text-gray-600',
            ]"
            @click="selectRole(role.value)"
          >
            <component :is="role.icon" :size="24" />
            <span class="text-xs font-medium">{{ role.label }}</span>
          </button>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="请输入手机号"
              class="input-field"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              v-model="password"
              type="password"
              placeholder="请输入密码"
              class="input-field"
            />
          </div>

          <div v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="btn-primary w-full"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>

        <div class="mt-4 pt-4 border-t border-gray-200">
          <p class="text-xs text-gray-400 text-center">演示账号：选择角色后自动填入</p>
        </div>
      </div>
    </div>
  </div>
</template>
