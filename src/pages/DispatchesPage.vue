<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { Search } from 'lucide-vue-next'

const { get } = useApi()
const router = useRouter()

interface Dispatch {
  id: number
  appointment_id: number
  company_id: number
  vehicle_id: number | null
  driver_id: number | null
  dispatch_time: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  waste_type: string
  scheduled_time: string
  building_location: string
  appointment_status: string
  plate_number: string | null
  vehicle_type: string | null
  driver_name: string | null
  driver_phone: string | null
  owner_name: string
}

const dispatches = ref<Dispatch[]>([])
const search = ref('')
const loading = ref(true)

const filteredDispatches = computed(() => {
  if (!search.value) return dispatches.value
  const q = search.value.toLowerCase()
  return dispatches.value.filter(d =>
    d.owner_name?.toLowerCase().includes(q) ||
    d.building_location?.toLowerCase().includes(q) ||
    d.plate_number?.toLowerCase().includes(q)
  )
})

const statusBadge: Record<string, string> = {
  pending: 'badge-pending',
  in_progress: 'badge-active',
  completed: 'badge-completed',
  cancelled: 'badge-rejected',
}
const statusLabel: Record<string, string> = {
  pending: '待派车',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
}
const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

async function fetchDispatches() {
  loading.value = true
  try {
    const data = await get<Dispatch[]>('/dispatches')
    dispatches.value = data
  } catch {
    dispatches.value = []
  } finally {
    loading.value = false
  }
}

function goDetail(id: number) {
  router.push(`/dispatch/${id}`)
}

onMounted(fetchDispatches)
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-6">清运调度</h2>

    <div class="card mb-4">
      <div class="relative">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="search" placeholder="搜索业主/位置/车牌..." class="input-field pl-9" />
      </div>
    </div>

    <div class="card overflow-hidden p-0">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">业主</th>
            <th class="table-header">位置</th>
            <th class="table-header">垃圾类型</th>
            <th class="table-header">预约时间</th>
            <th class="table-header">车辆/司机</th>
            <th class="table-header">状态</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="d in filteredDispatches" :key="d.id" class="hover:bg-gray-50">
            <td class="table-cell">{{ d.owner_name }}</td>
            <td class="table-cell">{{ d.building_location }}</td>
            <td class="table-cell">{{ wasteTypeLabel[d.waste_type] || d.waste_type }}</td>
            <td class="table-cell">{{ d.scheduled_time }}</td>
            <td class="table-cell">
              <span v-if="d.plate_number">{{ d.plate_number }} / {{ d.driver_name }}</span>
              <span v-else class="text-gray-400">未分配</span>
            </td>
            <td class="table-cell"><span :class="statusBadge[d.status]">{{ statusLabel[d.status] }}</span></td>
            <td class="table-cell">
              <button class="text-primary-700 hover:underline text-sm" @click="goDetail(d.id)">
                {{ d.status === 'pending' ? '派车' : '查看' }}
              </button>
            </td>
          </tr>
          <tr v-if="filteredDispatches.length === 0">
            <td colspan="7" class="table-cell text-center text-gray-400 py-8">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
