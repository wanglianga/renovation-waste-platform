<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'
import { ArrowLeft } from 'lucide-vue-next'

const { isRole } = useAuth()
const { get, put } = useApi()
const route = useRoute()
const router = useRouter()

interface Dispatch {
  id: number
  plate_number: string
  vehicle_type: string
  driver_name: string
  driver_phone: string
}

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
  building_address: string
  elevator_name: string
  renovation_start: string
  renovation_end: string
  elevator_hours: string
  owner_phone: string
  dispatch: Dispatch | null
}

const appointment = ref<Appointment | null>(null)
const loading = ref(true)
const submitting = ref(false)
const routeApproved = ref(true)
const elevatorApproved = ref(true)

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

async function fetchAppointment() {
  loading.value = true
  try {
    const data = await get<Appointment>(`/appointments/${route.params.id}`)
    appointment.value = data
  } catch {
    appointment.value = null
  } finally {
    loading.value = false
  }
}

async function approveAppointment() {
  submitting.value = true
  try {
    await put(`/appointments/${route.params.id}/approve`, {
      route_approved: routeApproved.value,
      elevator_approved: elevatorApproved.value,
    })
    router.push('/appointments')
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function rejectAppointment() {
  submitting.value = true
  try {
    await put(`/appointments/${route.params.id}/reject`, {})
    router.push('/appointments')
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

onMounted(fetchAppointment)
</script>

<template>
  <div>
    <button class="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4" @click="router.push('/appointments')">
      <ArrowLeft :size="16" /> 返回列表
    </button>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <div v-else-if="appointment" class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">预约信息</h3>
          <span :class="statusBadge[appointment.status]">{{ statusLabel[appointment.status] }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">业主姓名：</span>{{ appointment.owner_name }}</div>
          <div><span class="text-gray-500 text-sm">联系电话：</span>{{ appointment.owner_phone }}</div>
          <div><span class="text-gray-500 text-sm">楼栋：</span>{{ appointment.building_name }}</div>
          <div><span class="text-gray-500 text-sm">地址：</span>{{ appointment.building_address }}</div>
          <div><span class="text-gray-500 text-sm">具体位置：</span>{{ appointment.building_location }}</div>
          <div><span class="text-gray-500 text-sm">垃圾类型：</span>{{ wasteTypeLabel[appointment.waste_type] || appointment.waste_type }}</div>
          <div v-if="appointment.waste_type === 'furniture'"><span class="text-gray-500 text-sm">家具数量：</span>{{ appointment.furniture_count }}件</div>
          <div v-else><span class="text-gray-500 text-sm">袋数：</span>{{ appointment.bag_count }}袋</div>
          <div><span class="text-gray-500 text-sm">预约时间：</span>{{ appointment.scheduled_time }}</div>
          <div><span class="text-gray-500 text-sm">申请日期：</span>{{ appointment.created_at }}</div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">关联备案</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">备案编号：</span>{{ appointment.filing_id }}</div>
          <div><span class="text-gray-500 text-sm">备案状态：</span>{{ appointment.filing_status }}</div>
          <div><span class="text-gray-500 text-sm">备案垃圾类型：</span>{{ appointment.filing_waste_types }}</div>
          <div v-if="appointment.approved_route"><span class="text-gray-500 text-sm">审批路线：</span>{{ appointment.approved_route }}</div>
          <div v-if="appointment.renovation_start"><span class="text-gray-500 text-sm">装修开始：</span>{{ appointment.renovation_start }}</div>
          <div v-if="appointment.renovation_end"><span class="text-gray-500 text-sm">装修结束：</span>{{ appointment.renovation_end }}</div>
          <div v-if="appointment.elevator_name"><span class="text-gray-500 text-sm">电梯：</span>{{ appointment.elevator_name }}</div>
          <div v-if="appointment.elevator_hours"><span class="text-gray-500 text-sm">电梯使用时段：</span>{{ appointment.elevator_hours }}</div>
        </div>
      </div>

      <div v-if="appointment.dispatch" class="card">
        <h3 class="text-lg font-semibold mb-4">派车信息</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">车牌号：</span>{{ appointment.dispatch.plate_number }}</div>
          <div><span class="text-gray-500 text-sm">车辆类型：</span>{{ appointment.dispatch.vehicle_type }}</div>
          <div><span class="text-gray-500 text-sm">司机姓名：</span>{{ appointment.dispatch.driver_name }}</div>
          <div><span class="text-gray-500 text-sm">司机电话：</span>{{ appointment.dispatch.driver_phone }}</div>
        </div>
      </div>

      <div v-if="isRole('property') && appointment.status === 'pending'" class="card">
        <h3 class="text-lg font-semibold mb-4">审核操作</h3>
        <div class="space-y-3 mb-4">
          <label class="flex items-center gap-2">
            <input v-model="routeApproved" type="checkbox" class="rounded" />
            <span class="text-sm text-gray-700">批准清运路线</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="elevatorApproved" type="checkbox" class="rounded" />
            <span class="text-sm text-gray-700">批准使用电梯</span>
          </label>
        </div>
        <div class="flex gap-3">
          <button class="btn-primary" :disabled="submitting" @click="approveAppointment">通过</button>
          <button class="btn-danger" :disabled="submitting" @click="rejectAppointment">驳回</button>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-gray-400 py-12">未找到该预约</div>
  </div>
</template>
