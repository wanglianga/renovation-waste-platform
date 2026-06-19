<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { Search } from 'lucide-vue-next'

const { get } = useApi()
const router = useRouter()

interface Disposal {
  id: number
  execution_id: number
  disposal_site_id: number
  confirm_time: string | null
  weighbill_photo: string | null
  receipt_photo: string | null
  disposal_fee: number | null
  status: 'pending' | 'confirmed' | 'settled'
  created_at: string
  gross_weight: number | null
  net_weight: number | null
  execution_status: string | null
  load_photos: string[] | null
  weigh_photos: string[] | null
  appointment_id: number | null
  waste_type: string
  scheduled_time: string | null
  building_location: string | null
  plate_number: string
  driver_name: string
}

const disposals = ref<Disposal[]>([])
const search = ref('')
const statusFilter = ref('')
const loading = ref(true)

const statusBadge: Record<string, string> = {
  pending: 'badge-pending',
  confirmed: 'badge-approved',
  settled: 'badge-completed',
}
const statusLabel: Record<string, string> = {
  pending: '待接收',
  confirmed: '已消纳',
  settled: '已结算',
}
const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

const filteredDisposals = computed(() => {
  let list = disposals.value
  if (statusFilter.value) {
    list = list.filter(d => d.status === statusFilter.value)
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(d =>
      d.plate_number?.toLowerCase().includes(q) ||
      d.driver_name?.toLowerCase().includes(q)
    )
  }
  return list
})

async function fetchDisposals() {
  loading.value = true
  try {
    const res = await get<Disposal[]>('/disposals')
    disposals.value = res
  } catch {
    disposals.value = []
  } finally {
    loading.value = false
  }
}

function goDetail(id: number) {
  router.push(`/disposal/${id}`)
}

onMounted(fetchDisposals)
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-6">消纳接收</h2>

    <div class="card mb-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="search" placeholder="搜索车牌/司机..." class="input-field pl-9" />
        </div>
        <select v-model="statusFilter" class="input-field w-auto">
          <option value="">全部状态</option>
          <option value="pending">待接收</option>
          <option value="confirmed">已消纳</option>
          <option value="settled">已结算</option>
        </select>
      </div>
    </div>

    <div class="card overflow-hidden p-0">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">车牌号</th>
            <th class="table-header">司机</th>
            <th class="table-header">垃圾类型</th>
            <th class="table-header">净重(吨)</th>
            <th class="table-header">状态</th>
            <th class="table-header">日期</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="d in filteredDisposals" :key="d.id" class="hover:bg-gray-50">
            <td class="table-cell">{{ d.plate_number }}</td>
            <td class="table-cell">{{ d.driver_name }}</td>
            <td class="table-cell">{{ wasteTypeLabel[d.waste_type] || d.waste_type }}</td>
            <td class="table-cell">{{ d.net_weight ?? '-' }}</td>
            <td class="table-cell"><span :class="statusBadge[d.status]">{{ statusLabel[d.status] }}</span></td>
            <td class="table-cell">{{ d.created_at }}</td>
            <td class="table-cell">
              <button class="text-primary-700 hover:underline text-sm" @click="goDetail(d.id)">查看</button>
            </td>
          </tr>
          <tr v-if="filteredDisposals.length === 0">
            <td colspan="7" class="table-cell text-center text-gray-400 py-8">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
