<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'
import { ArrowLeft, Upload, MapPinOff } from 'lucide-vue-next'

const { isRole } = useAuth()
const { get, post, put, uploadFile } = useApi()
const route = useRoute()
const router = useRouter()

interface Vehicle {
  id: number
  plate_number: string
  vehicle_type: string
  max_weight: number
}

interface Driver {
  id: number
  name: string
  phone: string
}

interface EntryBlockage {
  id: number
  execution_id: number
  appointment_id: number
  driver_id: number
  blockage_type: string
  description: string | null
  arrival_time: string
  photos: string | null
  status: string
  rearranged_dispatch_id: number | null
  rearranged_time: string | null
  empty_run_fee: number
  empty_run_settled: number
  property_responsibility: string | null
  property_traced_by: number | null
  owner_notified: number
  created_at: string
  waste_type: string
  scheduled_time: string
  building_location: string
  driver_name: string
  driver_phone: string
  building_name: string
  building_address: string
  plate_number: string
  vehicle_type: string
  trace_user_name: string | null
  owner_id: number
}

const item = ref<EntryBlockage | null>(null)
const loading = ref(true)
const submitting = ref(false)

const uploadingPhoto = ref(false)
const reportBlockageType = ref<'elevator_repair' | 'garage_height' | 'road_restriction' | 'owner_absent' | 'other'>('elevator_repair')
const reportDescription = ref('')
const reportArrivalTime = ref('')
const reportPhotoPaths = ref<string[]>([])

const rearrangeVehicleId = ref<number | null>(null)
const rearrangeDriverId = ref<number | null>(null)
const rearrangeDispatchTime = ref('')
const rearrangeResponsibility = ref<'none' | 'property' | 'owner' | 'third_party'>('none')

const settleEmptyRunFee = ref(0)

const traceResponsibility = ref<'none' | 'property' | 'owner' | 'third_party'>('none')

const vehicles = ref<Vehicle[]>([])
const drivers = ref<Driver[]>([])

const blockageTypeLabel: Record<string, string> = {
  elevator_repair: '电梯维修',
  garage_height: '车库限高',
  road_restriction: '道路管制',
  owner_absent: '业主未在家',
  other: '其他原因',
}

const statusLabel: Record<string, string> = {
  reported: '待处理',
  rearranged: '已重新安排',
  settled: '已结算',
}

const statusBadge: Record<string, string> = {
  reported: 'badge-pending',
  rearranged: 'badge-active',
  settled: 'badge-completed',
}

const responsibilityLabel: Record<string, string> = {
  none: '无责任归属',
  property: '物业责任',
  owner: '业主责任',
  third_party: '第三方责任',
}

const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

function parsePhotos(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function fetchItem() {
  loading.value = true
  try {
    const data = await get<EntryBlockage>(`/incidents/entry-blockages/${route.params.id}`)
    item.value = data
  } catch {
    item.value = null
  } finally {
    loading.value = false
  }
}

async function fetchBaseData() {
  try {
    const [vData, dData] = await Promise.all([
      get<Vehicle[]>('/base/vehicles'),
      get<Driver[]>('/base/drivers'),
    ])
    vehicles.value = vData
    drivers.value = dData
  } catch {
    vehicles.value = []
    drivers.value = []
  }
}

async function handlePhotoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  uploadingPhoto.value = true
  try {
    for (const file of Array.from(input.files)) {
      const result = await uploadFile(file)
      reportPhotoPaths.value.push(result.path)
    }
  } catch (e) {
    console.error(e)
  } finally {
    uploadingPhoto.value = false
    input.value = ''
  }
}

async function submitReport() {
  if (!reportArrivalTime.value) return
  submitting.value = true
  try {
    await post('/incidents/entry-blockages', {
      execution_id: Number(route.query.execution_id),
      blockage_type: reportBlockageType.value,
      description: reportDescription.value || null,
      arrival_time: reportArrivalTime.value,
      photos: JSON.stringify(reportPhotoPaths.value),
    })
    router.push('/incidents')
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function submitRearrange() {
  if (!rearrangeVehicleId.value || !rearrangeDriverId.value || !rearrangeDispatchTime.value) return
  submitting.value = true
  try {
    await put(`/incidents/entry-blockages/${route.params.id}/rearrange`, {
      vehicle_id: rearrangeVehicleId.value,
      driver_id: rearrangeDriverId.value,
      dispatch_time: rearrangeDispatchTime.value,
      property_responsibility: rearrangeResponsibility.value,
    })
    await fetchItem()
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function submitSettleEmptyRun() {
  submitting.value = true
  try {
    await put(`/incidents/entry-blockages/${route.params.id}/settle-empty-run`, {
      empty_run_fee: settleEmptyRunFee.value,
    })
    await fetchItem()
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function submitTrace() {
  submitting.value = true
  try {
    await put(`/incidents/entry-blockages/${route.params.id}/trace`, {
      property_responsibility: traceResponsibility.value,
    })
    await fetchItem()
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchItem()
  if (isRole('transport')) {
    fetchBaseData()
  }
})
</script>

<template>
  <div>
    <button class="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4" @click="router.push('/incidents')">
      <ArrowLeft :size="16" /> 返回列表
    </button>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <div v-else-if="!item && !route.query.execution_id" class="text-center text-gray-400 py-12">未找到记录</div>

    <div v-else class="space-y-6">
      <div v-if="route.query.execution_id && !item" class="card">
        <div class="flex items-center gap-2 mb-4">
          <MapPinOff class="text-red-500" :size="20" />
          <h3 class="text-lg font-semibold">上报进场受阻</h3>
        </div>
        <p class="text-gray-600 text-sm mb-4">电梯维修、地下车库限高、道路管制或业主未在家导致装车失败时，请记录到场时间、现场照片和无法进场原因。</p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">受阻原因</label>
            <select v-model="reportBlockageType" class="input-field">
              <option value="elevator_repair">电梯维修</option>
              <option value="garage_height">地下车库限高</option>
              <option value="road_restriction">道路管制</option>
              <option value="owner_absent">业主未在家</option>
              <option value="other">其他原因</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">到场时间</label>
            <input v-model="reportArrivalTime" type="datetime-local" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">补充说明</label>
            <textarea v-model="reportDescription" class="input-field" rows="3" placeholder="描述无法进场的情况"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">现场照片</label>
            <div class="flex flex-wrap items-center gap-4">
              <label class="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500 cursor-pointer transition-colors">
                <Upload :size="20" />
                <span class="text-xs mt-1">{{ uploadingPhoto ? '上传中' : '上传' }}</span>
                <input type="file" accept="image/*" multiple class="hidden" :disabled="uploadingPhoto" @change="handlePhotoUpload" />
              </label>
              <div v-for="photo in reportPhotoPaths" :key="photo" class="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                <img :src="photo" class="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          <button class="btn-primary" :disabled="submitting || !reportArrivalTime" @click="submitReport">
            {{ submitting ? '提交中...' : '上报进场受阻' }}
          </button>
        </div>
      </div>

      <template v-if="item">
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <MapPinOff class="text-red-500" :size="20" />
              <h3 class="text-lg font-semibold">进场受阻详情</h3>
            </div>
            <span :class="statusBadge[item.status] || 'badge-pending'">{{ statusLabel[item.status] || item.status }}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span class="text-gray-500 text-sm">受阻原因：</span>{{ blockageTypeLabel[item.blockage_type] || item.blockage_type }}</div>
            <div><span class="text-gray-500 text-sm">到场时间：</span>{{ item.arrival_time?.slice(0, 16)?.replace('T', ' ') }}</div>
            <div><span class="text-gray-500 text-sm">位置：</span>{{ item.building_location }}</div>
            <div><span class="text-gray-500 text-sm">楼栋：</span>{{ item.building_name || '-' }}</div>
            <div><span class="text-gray-500 text-sm">地址：</span>{{ item.building_address || '-' }}</div>
            <div><span class="text-gray-500 text-sm">司机：</span>{{ item.driver_name }} {{ item.driver_phone }}</div>
            <div><span class="text-gray-500 text-sm">车牌号：</span>{{ item.plate_number || '-' }}</div>
            <div><span class="text-gray-500 text-sm">上报时间：</span>{{ item.created_at?.slice(0, 16)?.replace('T', ' ') }}</div>
          </div>
          <div v-if="item.description" class="mt-3">
            <span class="text-gray-500 text-sm">补充说明：</span>{{ item.description }}
          </div>
        </div>

        <div v-if="parsePhotos(item.photos).length > 0" class="card">
          <h3 class="text-lg font-semibold mb-4">现场照片</h3>
          <div class="flex flex-wrap gap-4">
            <div v-for="photo in parsePhotos(item.photos)" :key="photo" class="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
              <img :src="photo" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <div v-if="item.status !== 'reported'" class="card">
          <h3 class="text-lg font-semibold mb-4">重新安排信息</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span class="text-gray-500 text-sm">重新安排时间：</span>{{ item.rearranged_time?.slice(0, 16)?.replace('T', ' ') || '-' }}</div>
            <div><span class="text-gray-500 text-sm">空跑费用：</span>
              <span v-if="item.empty_run_settled" class="text-orange-600 font-medium">{{ item.empty_run_fee }} 元</span>
              <span v-else class="text-gray-500">未结算</span>
            </div>
            <div v-if="item.property_responsibility && item.property_responsibility !== 'none'">
              <span class="text-gray-500 text-sm">责任归属：</span>{{ responsibilityLabel[item.property_responsibility] }}
            </div>
            <div v-if="item.trace_user_name">
              <span class="text-gray-500 text-sm">追溯人：</span>{{ item.trace_user_name }}
            </div>
          </div>
        </div>

        <div v-if="isRole('transport') && item.status === 'reported'" class="card">
          <h3 class="text-lg font-semibold mb-4">重新安排车辆</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">选择车辆</label>
              <select v-model="rearrangeVehicleId" class="input-field">
                <option :value="null" disabled>请选择车辆</option>
                <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.plate_number }} - {{ v.vehicle_type }} ({{ v.max_weight }}吨)</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">选择司机</label>
              <select v-model="rearrangeDriverId" class="input-field">
                <option :value="null" disabled>请选择司机</option>
                <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }} - {{ d.phone }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">重新安排时间</label>
              <input v-model="rearrangeDispatchTime" type="datetime-local" class="input-field" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">责任归属</label>
              <select v-model="rearrangeResponsibility" class="input-field">
                <option value="none">无责任归属</option>
                <option value="property">物业责任</option>
                <option value="owner">业主责任</option>
                <option value="third_party">第三方责任</option>
              </select>
            </div>
            <button class="btn-primary" :disabled="submitting || !rearrangeVehicleId || !rearrangeDriverId || !rearrangeDispatchTime" @click="submitRearrange">
              {{ submitting ? '提交中...' : '确认重新安排' }}
            </button>
          </div>
        </div>

        <div v-if="isRole('transport') && item.status === 'rearranged'" class="card">
          <h3 class="text-lg font-semibold mb-4">结算空跑费用</h3>
          <p class="text-gray-600 text-sm mb-4">因进场受阻导致车辆空跑，可单独结算空跑费用。</p>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">空跑费用（元）</label>
              <input v-model.number="settleEmptyRunFee" type="number" step="0.01" min="0" class="input-field" placeholder="输入空跑费用" />
            </div>
            <button class="btn-primary" :disabled="submitting || settleEmptyRunFee <= 0" @click="submitSettleEmptyRun">
              {{ submitting ? '提交中...' : '确认结算空跑费' }}
            </button>
          </div>
        </div>

        <div v-if="isRole('property') && item.status === 'reported'" class="card">
          <h3 class="text-lg font-semibold mb-4">追溯放行责任</h3>
          <p class="text-gray-600 text-sm mb-4">确认进场受阻的责任归属，以便后续追责和改进。</p>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">责任归属</label>
              <select v-model="traceResponsibility" class="input-field">
                <option value="none">无责任归属</option>
                <option value="property">物业责任</option>
                <option value="owner">业主责任</option>
                <option value="third_party">第三方责任</option>
              </select>
            </div>
            <button class="btn-primary" :disabled="submitting" @click="submitTrace">
              {{ submitting ? '提交中...' : '确认追溯责任' }}
            </button>
          </div>
        </div>

        <div v-if="isRole('owner') && item.owner_notified" class="card border-red-200 bg-red-50">
          <h3 class="text-lg font-semibold mb-4 text-red-800">进场受阻通知</h3>
          <div class="space-y-2 text-red-900">
            <p><strong>受阻原因：</strong>{{ blockageTypeLabel[item.blockage_type] || item.blockage_type }}</p>
            <p v-if="item.status !== 'reported'">
              <strong>处理方式：</strong>平台已重新安排车辆和时段，新时间：{{ item.rearranged_time?.slice(0, 16)?.replace('T', ' ') || '待确认' }}
            </p>
            <p v-else>
              <strong>处理方式：</strong>平台正在重新安排，请耐心等待。
            </p>
            <p v-if="item.empty_run_settled">
              <strong>空跑费用：</strong>因进场受阻产生空跑费 {{ item.empty_run_fee }} 元
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
