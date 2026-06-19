<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'
import { Plus, Search } from 'lucide-vue-next'

const { isRole } = useAuth()
const { get, put } = useApi()
const router = useRouter()

interface Appointment {
  id: number
  filing_id: number
  owner_id: number
  waste_type: 'construction' | 'furniture' | 'hazardous'
  bag_count: number | null
  furniture_count: number | null
  scheduled_time: string
  building_location: string
  status: 'pending' | 'approved' | 'rejected' | 'dispatched' | 'executing' | 'completed' | 'cancelled'
  route_approved: boolean | null
  elevator_approved: boolean | null
  approved_by: number | null
  created_at: string
  filing_waste_types: string
  filing_status: string
  approved_route: string | null
  building_name: string
  owner_name: string
  dispatch_id: number | null
}

const appointments = ref<Appointment[]>([])
const search = ref('')
const statusFilter = ref('')
const loading = ref(true)

const statusBadge: Record<string, string> = {
  pending: 'badge-pending',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
  dispatched: 'badge-active',
  executing: 'badge-active',
  completed: 'badge-completed',
  cancelled: 'badge-rejected',
}
const statusLabel: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  dispatched: '已派车',
  executing: '执行中',
  completed: '已完成',
  cancelled: '已取消',
}
const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

const filteredAppointments = computed(() =>
  appointments.value.filter((a) => {
    const matchSearch = !search.value || a.owner_name.includes(search.value) || a.building_name.includes(search.value)
    const matchStatus = !statusFilter.value || a.status === statusFilter.value
    return matchSearch && matchStatus
  })
)

async function fetchAppointments() {
  loading.value = true
  try {
    const data = await get<Appointment[]>('/appointments')
    appointments.value = data
  } catch {
    appointments.value = []
  } finally {
    loading.value = false
  }
}

async function approveAppointment(id: number) {
  try {
    await put(`/appointments/${id}/approve`, { route_approved: true, elevator_approved: true })
    await fetchAppointments()
  } catch (e) {
    console.error(e)
  }
}

async function rejectAppointment(id: number) {
  try {
    await put(`/appointments/${id}/reject`, {})
    await fetchAppointments()
  } catch (e) {
    console.error(e)
  }
}

function goDetail(id: number) {
  router.push(`/appointments/${id}`)
}

onMounted(fetchAppointments)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-900">清运预约</h2>
      <button v-if="isRole('owner')" class="btn-primary flex items-center gap-1" @click="router.push('/appointments/new')">
        <Plus :size="16" /> 新建预约
      </button>
    </div>

    <div class="card mb-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="search" placeholder="搜索业主/楼栋..." class="input-field pl-9" />
        </div>
        <select v-model="statusFilter" class="input-field w-auto">
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
          <option value="dispatched">已派车</option>
          <option value="executing">执行中</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
    </div>

    <div class="card overflow-hidden p-0">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">业主</th>
            <th class="table-header">楼栋</th>
            <th class="table-header">位置</th>
            <th class="table-header">垃圾类型</th>
            <th class="table-header">数量</th>
            <th class="table-header">预约时间</th>
            <th class="table-header">状态</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="apt in filteredAppointments" :key="apt.id" class="hover:bg-gray-50">
            <td class="table-cell">{{ apt.owner_name }}</td>
            <td class="table-cell">{{ apt.building_name }}</td>
            <td class="table-cell">{{ apt.building_location }}</td>
            <td class="table-cell">{{ wasteTypeLabel[apt.waste_type] || apt.waste_type }}</td>
            <td class="table-cell">
              <span v-if="apt.waste_type === 'furniture'">{{ apt.furniture_count }}件</span>
              <span v-else>{{ apt.bag_count }}袋</span>
            </td>
            <td class="table-cell">{{ apt.scheduled_time }}</td>
            <td class="table-cell"><span :class="statusBadge[apt.status]">{{ statusLabel[apt.status] }}</span></td>
            <td class="table-cell">
              <div class="flex items-center gap-2">
                <button class="text-primary-700 hover:underline text-sm" @click="goDetail(apt.id)">查看</button>
                <template v-if="isRole('property') && apt.status === 'pending'">
                  <button class="text-green-600 hover:underline text-sm" @click="approveAppointment(apt.id)">通过</button>
                  <button class="text-red-600 hover:underline text-sm" @click="rejectAppointment(apt.id)">驳回</button>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="filteredAppointments.length === 0">
            <td colspan="8" class="table-cell text-center text-gray-400 py-8">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
