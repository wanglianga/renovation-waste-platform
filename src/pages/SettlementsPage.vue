<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { Search } from 'lucide-vue-next'

const { get } = useApi()
const router = useRouter()

interface Settlement {
  id: number
  disposal_id: number
  transport_fee: number
  disposal_fee: number
  total_fee: number
  waste_type: string
  weight: number
  status: 'pending' | 'paid' | 'completed'
  created_at: string
  confirm_time: string
  weighbill_photo: string
  receipt_photo: string
  disposal_confirm_fee: number
  execution_net_weight: number
  appointment_waste_type: string
  scheduled_time: string
  building_location: string
  plate_number: string
  driver_name: string
  owner_name: string
}

const settlements = ref<Settlement[]>([])
const search = ref('')
const statusFilter = ref('')
const loading = ref(true)

const statusBadge: Record<string, string> = {
  pending: 'badge-pending',
  paid: 'badge-approved',
  completed: 'badge-completed',
}
const statusLabel: Record<string, string> = {
  pending: '待结算',
  paid: '已支付',
  completed: '已完成',
}
const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

const filtered = computed(() => {
  return settlements.value.filter((s) => {
    if (statusFilter.value && s.status !== statusFilter.value) return false
    if (search.value) {
      const q = search.value.toLowerCase()
      return (
        s.owner_name?.toLowerCase().includes(q) ||
        s.building_location?.toLowerCase().includes(q) ||
        s.plate_number?.toLowerCase().includes(q) ||
        s.driver_name?.toLowerCase().includes(q)
      )
    }
    return true
  })
})

const totalTransport = computed(() => filtered.value.reduce((sum, s) => sum + (s.transport_fee || 0), 0))
const totalDisposal = computed(() => filtered.value.reduce((sum, s) => sum + (s.disposal_fee || 0), 0))
const totalFees = computed(() => filtered.value.reduce((sum, s) => sum + (s.total_fee || 0), 0))

async function fetchSettlements() {
  loading.value = true
  try {
    const res = await get<Settlement[]>('/settlements')
    settlements.value = Array.isArray(res) ? res : []
  } catch {
    settlements.value = []
  } finally {
    loading.value = false
  }
}

function goDetail(id: number) {
  router.push(`/settlement/${id}`)
}

onMounted(fetchSettlements)
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-6">结算对账</h2>

    <div class="card mb-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="search" placeholder="搜索业主/位置/车牌/司机..." class="input-field pl-9" />
        </div>
        <select v-model="statusFilter" class="input-field w-full sm:w-40">
          <option value="">全部状态</option>
          <option value="pending">待结算</option>
          <option value="paid">已支付</option>
          <option value="completed">已完成</option>
        </select>
      </div>
    </div>

    <div class="card mb-4">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-sm text-gray-500">运输费合计</div>
          <div class="text-lg font-bold text-gray-900">¥{{ totalTransport.toFixed(2) }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-500">消纳费合计</div>
          <div class="text-lg font-bold text-gray-900">¥{{ totalDisposal.toFixed(2) }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-500">总计</div>
          <div class="text-lg font-bold text-primary-700">¥{{ totalFees.toFixed(2) }}</div>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden p-0">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">业主</th>
            <th class="table-header">位置</th>
            <th class="table-header">垃圾类型</th>
            <th class="table-header">重量(吨)</th>
            <th class="table-header">消纳费</th>
            <th class="table-header">运输费</th>
            <th class="table-header">合计</th>
            <th class="table-header">状态</th>
            <th class="table-header">创建时间</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="s in filtered" :key="s.id" class="hover:bg-gray-50">
            <td class="table-cell">{{ s.owner_name }}</td>
            <td class="table-cell">{{ s.building_location }}</td>
            <td class="table-cell">{{ wasteTypeLabel[s.waste_type] || s.waste_type }}</td>
            <td class="table-cell">{{ s.weight }}</td>
            <td class="table-cell">¥{{ s.disposal_fee }}</td>
            <td class="table-cell">¥{{ s.transport_fee }}</td>
            <td class="table-cell font-medium">¥{{ s.total_fee }}</td>
            <td class="table-cell"><span :class="statusBadge[s.status]">{{ statusLabel[s.status] }}</span></td>
            <td class="table-cell">{{ s.created_at }}</td>
            <td class="table-cell">
              <button class="text-primary-700 hover:underline text-sm" @click="goDetail(s.id)">查看</button>
            </td>
          </tr>
          <tr v-if="filtered.length === 0 && !loading">
            <td colspan="10" class="table-cell text-center text-gray-400 py-8">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
