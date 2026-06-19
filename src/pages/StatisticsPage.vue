<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { TrendingUp, Weight, Truck, Receipt } from 'lucide-vue-next'

const { get } = useApi()

interface StatOverview {
  filings: { total: number; byStatus: Array<{ status: string; count: number }> }
  appointments: { total: number; byStatus: Array<{ status: string; count: number }> }
  dispatches: { total: number }
  executions: { total: number; totalWeight: number }
  disposals: { total: number }
  settlements: { total: number; byStatus: Array<{ status: string; count: number; total: number }> }
}

interface TrendItem {
  period: string
  count: number
  weight?: number
}

interface TrendData {
  filings: TrendItem[]
  appointments: TrendItem[]
  executions: TrendItem[]
}

const overview = ref<StatOverview | null>(null)
const trend = ref<TrendData | null>(null)
const loading = ref(true)
const trendType = ref<'daily' | 'weekly'>('daily')
const trendDays = ref(30)

const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

const filingStatusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
}

const appointmentStatusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  dispatched: '已派车',
  executing: '执行中',
  completed: '已完成',
  cancelled: '已取消',
}

const overviewCards = computed(() => {
  if (!overview.value) return []
  return [
    { label: '备案总数', value: overview.value.filings.total, icon: TrendingUp, color: 'text-primary-600 bg-primary-50' },
    { label: '清运总量(吨)', value: overview.value.executions.totalWeight, icon: Weight, color: 'text-amber-600 bg-amber-50' },
    { label: '预约总数', value: overview.value.appointments.total, icon: Truck, color: 'text-blue-600 bg-blue-50' },
    { label: '费用总额(元)', value: overview.value.settlements.total, icon: Receipt, color: 'text-green-600 bg-green-50' },
  ]
})

const filingStatusData = computed(() => {
  if (!overview.value) return []
  return overview.value.filings.byStatus.map(s => ({
    label: filingStatusLabels[s.status] || s.status,
    count: s.count,
  }))
})

const appointmentStatusData = computed(() => {
  if (!overview.value) return []
  return overview.value.appointments.byStatus.map(s => ({
    label: appointmentStatusLabels[s.status] || s.status,
    count: s.count,
  }))
})

const maxFilingsTrend = computed(() =>
  Math.max(...(trend.value?.filings.map(d => d.count) || [1]), 1)
)

const maxExecutionsTrend = computed(() =>
  Math.max(...(trend.value?.executions.map(d => d.weight || 0) || [1]), 1)
)

async function fetchData() {
  loading.value = true
  try {
    const [overviewRes, trendRes] = await Promise.all([
      get<StatOverview>('/statistics/overview'),
      get<TrendData>(`/statistics/trend?type=${trendType.value}&days=${trendDays.value}`),
    ])
    overview.value = overviewRes
    trend.value = trendRes
  } catch {
    overview.value = null
    trend.value = null
  } finally {
    loading.value = false
  }
}

function changeTrend() {
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-6">统计分析</h2>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <div v-else-if="!overview" class="text-center text-gray-400 py-12">暂无统计数据</div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="card in overviewCards" :key="card.label" class="card flex items-center gap-4">
          <div :class="['p-3 rounded-lg', card.color.split(' ').slice(1).join(' ')]">
            <component :is="card.icon" :size="24" :class="card.color.split(' ')[0]" />
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ card.value }}</div>
            <div class="text-sm text-gray-500">{{ card.label }}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">备案状态分布</h3>
          <div class="space-y-3">
            <div v-for="item in filingStatusData" :key="item.label" class="flex items-center gap-4">
              <span class="text-sm text-gray-600 w-20">{{ item.label }}</span>
              <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div
                  class="bg-primary-500 h-full rounded-full flex items-center justify-end pr-2"
                  :style="{ width: Math.max((item.count / Math.max(...filingStatusData.map(d => d.count), 1)) * 100, 10) + '%' }"
                >
                  <span class="text-xs text-white font-medium">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold mb-4">预约状态分布</h3>
          <div class="space-y-3">
            <div v-for="item in appointmentStatusData" :key="item.label" class="flex items-center gap-4">
              <span class="text-sm text-gray-600 w-20">{{ item.label }}</span>
              <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div
                  class="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                  :style="{ width: Math.max((item.count / Math.max(...appointmentStatusData.map(d => d.count), 1)) * 100, 10) + '%' }"
                >
                  <span class="text-xs text-white font-medium">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">趋势统计</h3>
          <div class="flex items-center gap-2">
            <select v-model="trendType" class="input-field w-auto text-sm" @change="changeTrend">
              <option value="daily">按日</option>
              <option value="weekly">按周</option>
            </select>
            <select v-model.number="trendDays" class="input-field w-auto text-sm" @change="changeTrend">
              <option :value="7">近7天</option>
              <option :value="30">近30天</option>
              <option :value="90">近90天</option>
            </select>
          </div>
        </div>

        <div v-if="trend && trend.filings.length > 0">
          <h4 class="text-sm font-medium text-gray-600 mb-3">备案趋势</h4>
          <div class="flex items-end gap-2 h-40 mb-6">
            <div v-for="item in trend.filings" :key="item.period" class="flex-1 flex flex-col items-center">
              <div class="w-full relative" style="height: 120px">
                <div
                  class="absolute bottom-0 w-full bg-primary-500 rounded-t transition-all duration-500"
                  :style="{ height: (item.count / maxFilingsTrend * 100) + '%' }"
                />
              </div>
              <span class="text-xs text-gray-400 mt-1 truncate w-full text-center">{{ item.period.slice(-5) }}</span>
            </div>
          </div>
        </div>

        <div v-if="trend && trend.executions.length > 0">
          <h4 class="text-sm font-medium text-gray-600 mb-3">清运量趋势(吨)</h4>
          <div class="flex items-end gap-2 h-40">
            <div v-for="item in trend.executions" :key="item.period" class="flex-1 flex flex-col items-center">
              <div class="w-full relative" style="height: 120px">
                <div
                  class="absolute bottom-0 w-full bg-amber-500 rounded-t transition-all duration-500"
                  :style="{ height: ((item.weight || 0) / maxExecutionsTrend * 100) + '%' }"
                />
              </div>
              <span class="text-xs text-gray-400 mt-1 truncate w-full text-center">{{ item.period.slice(-5) }}</span>
              <span class="text-xs font-medium text-gray-700">{{ (item.weight || 0).toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <div v-if="!trend || (trend.filings.length === 0 && trend.executions.length === 0)" class="text-center text-gray-400 py-8">
          暂无趋势数据
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">结算概况</h3>
        <div class="space-y-3">
          <div v-for="item in overview.settlements.byStatus" :key="item.status" class="flex items-center gap-4">
            <span class="text-sm text-gray-600 w-20">
              {{ item.status === 'pending' ? '待结算' : item.status === 'paid' ? '已支付' : '已完成' }}
            </span>
            <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div
                :class="['h-full rounded-full flex items-center justify-end pr-2', item.status === 'pending' ? 'bg-yellow-500' : item.status === 'paid' ? 'bg-green-500' : 'bg-gray-400']"
                :style="{ width: Math.max((item.count / Math.max(...overview.settlements.byStatus.map(d => d.count), 1)) * 100, 10) + '%' }"
              >
                <span class="text-xs text-white font-medium">{{ item.count }}笔 / ¥{{ item.total }}</span>
              </div>
            </div>
          </div>
          <div v-if="overview.settlements.byStatus.length === 0" class="text-center text-gray-400 py-4">
            暂无结算数据
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
