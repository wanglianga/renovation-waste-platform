<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'

const { get } = useApi()
const router = useRouter()

interface Execution {
  id: number
  dispatch_id: number
  driver_id: number
  load_photos: string | null
  gross_weight: number | null
  tare_weight: number | null
  net_weight: number | null
  weigh_photos: string | null
  unload_time: string | null
  status: 'loading' | 'weighing' | 'transporting' | 'unloaded' | 'completed'
  created_at: string
  appointment_id: number | null
  dispatch_time: string | null
  dispatch_status: string | null
  waste_type: string
  scheduled_time: string | null
  building_location: string
  plate_number: string
}

const executions = ref<Execution[]>([])
const activeTab = ref<string>('')
const loading = ref(true)

const tabs = [
  { value: '', label: '全部' },
  { value: 'loading', label: '装车中' },
  { value: 'weighing', label: '过磅中' },
  { value: 'transporting', label: '运输中' },
  { value: 'unloaded', label: '已卸货' },
  { value: 'completed', label: '已完成' },
]

const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

const statusLabel: Record<string, string> = {
  loading: '装车中',
  weighing: '过磅中',
  transporting: '运输中',
  unloaded: '已卸货',
  completed: '已完成',
}

const statusBadgeClass: Record<string, string> = {
  loading: 'badge-pending',
  weighing: 'badge-active',
  transporting: 'badge-approved',
  unloaded: 'badge-completed',
  completed: 'badge-completed',
}

const filteredExecutions = computed(() =>
  executions.value.filter((e) => !activeTab.value || e.status === activeTab.value)
)

async function fetchExecutions() {
  loading.value = true
  try {
    const data = await get<Execution[]>('/executions')
    executions.value = data
  } catch {
    executions.value = []
  } finally {
    loading.value = false
  }
}

function goDetail(id: number) {
  router.push(`/execution/${id}`)
}

onMounted(fetchExecutions)
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-6">清运执行</h2>

    <div class="flex gap-2 mb-4">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          activeTab === tab.value ? 'bg-primary-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
        ]"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="card overflow-hidden p-0">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">位置</th>
            <th class="table-header">垃圾类型</th>
            <th class="table-header">车牌号</th>
            <th class="table-header">净重(吨)</th>
            <th class="table-header">状态</th>
            <th class="table-header">创建时间</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="e in filteredExecutions" :key="e.id" class="hover:bg-gray-50">
            <td class="table-cell">{{ e.building_location }}</td>
            <td class="table-cell">{{ wasteTypeLabel[e.waste_type] || e.waste_type }}</td>
            <td class="table-cell">{{ e.plate_number }}</td>
            <td class="table-cell">{{ e.net_weight ?? '-' }}</td>
            <td class="table-cell">
              <span :class="statusBadgeClass[e.status] || 'badge-pending'">
                {{ statusLabel[e.status] || e.status }}
              </span>
            </td>
            <td class="table-cell">{{ e.created_at?.slice(0, 10) }}</td>
            <td class="table-cell">
              <button class="text-primary-700 hover:underline text-sm" @click="goDetail(e.id)">查看</button>
            </td>
          </tr>
          <tr v-if="filteredExecutions.length === 0">
            <td colspan="7" class="table-cell text-center text-gray-400 py-8">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
