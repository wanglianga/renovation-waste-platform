<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { ArrowLeft } from 'lucide-vue-next'

const { get, post, put } = useApi()
const route = useRoute()
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
  max_weight: number | null
  owner_phone: string | null
}

interface Vehicle {
  id: number
  plate_number: string
  vehicle_type: string
  max_weight: number
  company_id: number
}

interface Driver {
  id: number
  phone: string
  name: string
  role: string
  company_id: number
}

const dispatch = ref<Dispatch | null>(null)
const vehicles = ref<Vehicle[]>([])
const drivers = ref<Driver[]>([])
const selectedVehicleId = ref<number | null>(null)
const selectedDriverId = ref<number | null>(null)
const dispatchTime = ref('')
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}
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

async function fetchData() {
  loading.value = true
  try {
    const [dispatchData, vehiclesData, driversData] = await Promise.all([
      get<Dispatch>(`/dispatches/${route.params.id}`),
      get<Vehicle[]>('/base/vehicles'),
      get<Driver[]>('/base/drivers'),
    ])
    dispatch.value = dispatchData
    vehicles.value = vehiclesData
    drivers.value = driversData
    if (dispatchData.vehicle_id) selectedVehicleId.value = dispatchData.vehicle_id
    if (dispatchData.driver_id) selectedDriverId.value = dispatchData.driver_id
    if (dispatchData.dispatch_time) dispatchTime.value = dispatchData.dispatch_time
  } catch {
    dispatch.value = null
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!selectedVehicleId.value || !selectedDriverId.value) {
    error.value = '请选择车辆和司机'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await post('/dispatches', {
      appointment_id: dispatch.value?.appointment_id,
      vehicle_id: selectedVehicleId.value,
      driver_id: selectedDriverId.value,
      dispatch_time: dispatchTime.value || undefined,
    })
    router.push('/dispatch')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '派车失败'
  } finally {
    submitting.value = false
  }
}

async function handleUpdate() {
  if (!selectedVehicleId.value || !selectedDriverId.value) {
    error.value = '请选择车辆和司机'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await put(`/dispatches/${route.params.id}`, {
      vehicle_id: selectedVehicleId.value,
      driver_id: selectedDriverId.value,
      dispatch_time: dispatchTime.value || undefined,
      status: dispatch.value?.status,
    })
    router.push('/dispatch')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '更新失败'
  } finally {
    submitting.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <button class="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4" @click="router.push('/dispatch')">
      <ArrowLeft :size="16" /> 返回列表
    </button>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <div v-else-if="dispatch" class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">调度信息</h3>
          <span :class="statusBadge[dispatch.status]">{{ statusLabel[dispatch.status] }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">业主姓名：</span>{{ dispatch.owner_name }}</div>
          <div><span class="text-gray-500 text-sm">联系电话：</span>{{ dispatch.owner_phone || '-' }}</div>
          <div><span class="text-gray-500 text-sm">位置：</span>{{ dispatch.building_location }}</div>
          <div><span class="text-gray-500 text-sm">垃圾类型：</span>{{ wasteTypeLabel[dispatch.waste_type] || dispatch.waste_type }}</div>
          <div><span class="text-gray-500 text-sm">预约时间：</span>{{ dispatch.scheduled_time }}</div>
          <div><span class="text-gray-500 text-sm">创建时间：</span>{{ dispatch.created_at }}</div>
        </div>
      </div>

      <div v-if="dispatch.status === 'pending'" class="card">
        <h3 class="text-lg font-semibold mb-4">派车操作</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">选择车辆 *</label>
            <select v-model="selectedVehicleId" class="input-field">
              <option :value="null" disabled>请选择车辆</option>
              <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.plate_number }} ({{ v.vehicle_type }} / {{ v.max_weight }}kg)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">选择司机 *</label>
            <select v-model="selectedDriverId" class="input-field">
              <option :value="null" disabled>请选择司机</option>
              <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }} ({{ d.phone }})</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">派车时间</label>
            <input v-model="dispatchTime" type="datetime-local" class="input-field" />
          </div>
          <div v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error }}</div>
          <button class="btn-primary" :disabled="submitting" @click="handleCreate">
            {{ submitting ? '派车中...' : '确认派车' }}
          </button>
        </div>
      </div>

      <div v-else class="space-y-6">
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">派车信息</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span class="text-gray-500 text-sm">车牌号：</span>{{ dispatch.plate_number || '-' }}</div>
            <div><span class="text-gray-500 text-sm">车辆类型：</span>{{ dispatch.vehicle_type || '-' }}</div>
            <div><span class="text-gray-500 text-sm">最大载重：</span>{{ dispatch.max_weight ? dispatch.max_weight + 'kg' : '-' }}</div>
            <div><span class="text-gray-500 text-sm">司机：</span>{{ dispatch.driver_name || '-' }}</div>
            <div><span class="text-gray-500 text-sm">司机电话：</span>{{ dispatch.driver_phone || '-' }}</div>
            <div><span class="text-gray-500 text-sm">派车时间：</span>{{ dispatch.dispatch_time || '-' }}</div>
          </div>
        </div>

        <div v-if="dispatch.status === 'in_progress'" class="card">
          <h3 class="text-lg font-semibold mb-4">修改派车</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">选择车辆 *</label>
              <select v-model="selectedVehicleId" class="input-field">
                <option :value="null" disabled>请选择车辆</option>
                <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.plate_number }} ({{ v.vehicle_type }} / {{ v.max_weight }}kg)</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">选择司机 *</label>
              <select v-model="selectedDriverId" class="input-field">
                <option :value="null" disabled>请选择司机</option>
                <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }} ({{ d.phone }})</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">派车时间</label>
              <input v-model="dispatchTime" type="datetime-local" class="input-field" />
            </div>
            <div v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error }}</div>
            <button class="btn-primary" :disabled="submitting" @click="handleUpdate">
              {{ submitting ? '更新中...' : '更新派车' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-gray-400 py-12">未找到调度记录</div>
  </div>
</template>
