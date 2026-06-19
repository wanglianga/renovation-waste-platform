<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, type UserRole } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'
import { ClipboardList, CheckCircle2, Clock, Truck } from 'lucide-vue-next'

const { user, isRole } = useAuth()
const { get } = useApi()
const router = useRouter()

interface StatOverview {
  filings: { total: number; byStatus: Array<{ status: string; count: number }> }
  appointments: { total: number; byStatus: Array<{ status: string; count: number }> }
  dispatches: { total: number }
  executions: { total: number; totalWeight: number }
  disposals: { total: number }
  settlements: { total: number; byStatus: Array<{ status: string; count: number; total: number }> }
}

const stats = ref<StatOverview | null>(null)
const loading = ref(true)

const pendingFilings = computed(() => {
  if (!stats.value) return 0
  const p = stats.value.filings.byStatus.find(s => s.status === 'pending')
  return p?.count ?? 0
})

const pendingAppointments = computed(() => {
  if (!stats.value) return 0
  const p = stats.value.appointments.byStatus.find(s => s.status === 'pending')
  return p?.count ?? 0
})

const activeAppointments = computed(() => {
  if (!stats.value) return 0
  const active = stats.value.appointments.byStatus.filter(s =>
    ['approved', 'dispatched', 'executing'].includes(s.status)
  )
  return active.reduce((sum, s) => sum + s.count, 0)
})

const completedAppointments = computed(() => {
  if (!stats.value) return 0
  const c = stats.value.appointments.byStatus.find(s => s.status === 'completed')
  return c?.count ?? 0
})

const pendingSettlements = computed(() => {
  if (!stats.value) return 0
  const p = stats.value.settlements.byStatus.find(s => s.status === 'pending')
  return p?.count ?? 0
})

const statCards = computed(() => {
  if (isRole('owner')) {
    return [
      { label: '待审核预约', value: pendingAppointments.value, icon: ClipboardList, color: 'text-yellow-600 bg-yellow-50' },
      { label: '进行中', value: activeAppointments.value, icon: Clock, color: 'text-blue-600 bg-blue-50' },
      { label: '已完成', value: completedAppointments.value, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
      { label: '待结算', value: pendingSettlements.value, icon: Truck, color: 'text-primary-600 bg-primary-50' },
    ]
  }
  if (isRole('property')) {
    return [
      { label: '待审备案', value: pendingFilings.value, icon: ClipboardList, color: 'text-yellow-600 bg-yellow-50' },
      { label: '待审预约', value: pendingAppointments.value, icon: Clock, color: 'text-blue-600 bg-blue-50' },
      { label: '已完成', value: completedAppointments.value, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
      { label: '备案总数', value: stats.value?.filings.total ?? 0, icon: Truck, color: 'text-primary-600 bg-primary-50' },
    ]
  }
  if (isRole('transport')) {
    return [
      { label: '调度总数', value: stats.value?.dispatches.total ?? 0, icon: ClipboardList, color: 'text-yellow-600 bg-yellow-50' },
      { label: '执行中', value: stats.value?.executions.total ?? 0, icon: Clock, color: 'text-blue-600 bg-blue-50' },
      { label: '总清运量(吨)', value: stats.value?.executions.totalWeight ?? 0, icon: Truck, color: 'text-green-600 bg-green-50' },
      { label: '结算总额(元)', value: stats.value?.settlements.total ?? 0, icon: CheckCircle2, color: 'text-primary-600 bg-primary-50' },
    ]
  }
  if (isRole('driver')) {
    return [
      { label: '待装车', value: stats.value?.executions.total ?? 0, icon: ClipboardList, color: 'text-yellow-600 bg-yellow-50' },
      { label: '总清运量(吨)', value: stats.value?.executions.totalWeight ?? 0, icon: Truck, color: 'text-green-600 bg-green-50' },
      { label: '已完成', value: completedAppointments.value, icon: CheckCircle2, color: 'text-blue-600 bg-blue-50' },
    ]
  }
  return [
    { label: '待接收', value: stats.value?.disposals.total ?? 0, icon: ClipboardList, color: 'text-yellow-600 bg-yellow-50' },
    { label: '总消纳量(吨)', value: stats.value?.executions.totalWeight ?? 0, icon: Truck, color: 'text-green-600 bg-green-50' },
    { label: '结算总额(元)', value: stats.value?.settlements.total ?? 0, icon: CheckCircle2, color: 'text-primary-600 bg-primary-50' },
  ]
})

const quickActions = computed(() => {
  const actions: Array<{ label: string; path: string; color: string }> = []
  if (isRole('owner')) {
    actions.push({ label: '新建备案', path: '/filings/new', color: 'btn-primary' })
    actions.push({ label: '新建预约', path: '/appointments/new', color: 'btn-accent' })
  }
  if (isRole('property')) {
    actions.push({ label: '审核备案', path: '/filings', color: 'btn-primary' })
    actions.push({ label: '审核预约', path: '/appointments', color: 'btn-accent' })
  }
  if (isRole('transport')) {
    actions.push({ label: '清运调度', path: '/dispatch', color: 'btn-primary' })
  }
  if (isRole('driver')) {
    actions.push({ label: '查看任务', path: '/execution', color: 'btn-primary' })
  }
  if (isRole('disposal')) {
    actions.push({ label: '消纳接收', path: '/disposal', color: 'btn-primary' })
  }
  return actions
})

const roleGreetings: Record<UserRole, string> = {
  owner: '业主',
  property: '物业管理人员',
  transport: '清运公司',
  driver: '司机',
  disposal: '消纳场',
}

async function fetchDashboard() {
  loading.value = true
  try {
    stats.value = await get<StatOverview>('/statistics/overview')
  } catch {
    stats.value = null
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-xl font-bold text-gray-900">
        您好，{{ user?.name || roleGreetings[user!.role] }}
      </h2>
      <p class="text-gray-500 text-sm mt-1">欢迎回到工作台</p>
    </div>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div v-for="card in statCards" :key="card.label" class="card flex items-center gap-4">
          <div :class="['p-3 rounded-lg', card.color.split(' ').slice(1).join(' ')]">
            <component :is="card.icon" :size="24" :class="card.color.split(' ')[0]" />
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ card.value }}</div>
            <div class="text-sm text-gray-500">{{ card.label }}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 card">
          <h3 class="font-semibold text-gray-900 mb-4">数据概览</h3>
          <div v-if="!stats" class="text-center text-gray-400 py-8">暂无数据</div>
          <div v-else class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-700">装修备案</span>
              <span class="text-sm font-medium">{{ stats.filings.total }} 条</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-700">清运预约</span>
              <span class="text-sm font-medium">{{ stats.appointments.total }} 条</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-700">清运执行</span>
              <span class="text-sm font-medium">{{ stats.executions.total }} 次 / {{ stats.executions.totalWeight }} 吨</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-700">消纳处置</span>
              <span class="text-sm font-medium">{{ stats.disposals.total }} 条</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-700">费用结算</span>
              <span class="text-sm font-medium">¥{{ stats.settlements.total }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="font-semibold text-gray-900 mb-4">快捷操作</h3>
          <div class="space-y-3">
            <button
              v-for="action in quickActions"
              :key="action.path"
              :class="[action.color, 'w-full text-center']"
              @click="router.push(action.path)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
