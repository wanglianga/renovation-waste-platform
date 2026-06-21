<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'
import { ArrowLeft, Upload, AlertTriangle } from 'lucide-vue-next'

const { isRole } = useAuth()
const { get, post, put, uploadFile } = useApi()
const route = useRoute()
const router = useRouter()

interface ProhibitedItem {
  id: number
  execution_id: number
  appointment_id: number
  driver_id: number
  item_type: string
  description: string | null
  photos: string | null
  status: string
  handler_type: string | null
  fee_impact: string
  additional_fee: number
  owner_notified: number
  property_confirmed_by: number | null
  property_confirmed_at: string | null
  created_at: string
  waste_type: string
  scheduled_time: string
  building_location: string
  driver_name: string
  driver_phone: string
  building_name: string
  building_address: string
  confirm_user_name: string | null
  plate_number: string
  vehicle_type: string
  owner_id: number
}

const item = ref<ProhibitedItem | null>(null)
const loading = ref(true)
const submitting = ref(false)

const confirmHandlerType = ref<'return' | 'surcharge' | 'special'>('return')
const confirmFeeImpact = ref<'none' | 'increased'>('none')
const confirmAdditionalFee = ref(0)
const confirmDescription = ref('')

const uploadingPhoto = ref(false)
const reportItemType = ref<'paint' | 'battery' | 'glue' | 'other'>('paint')
const reportDescription = ref('')
const reportPhotoPaths = ref<string[]>([])

const itemTypeLabel: Record<string, string> = {
  paint: '油漆桶',
  battery: '电池',
  glue: '胶水',
  other: '其他禁收物',
}

const statusLabel: Record<string, string> = {
  reported: '待确认',
  confirmed: '已确认',
  returned: '已退回',
  surcharged: '已加价',
  special_handled: '专项处理',
}

const statusBadge: Record<string, string> = {
  reported: 'badge-pending',
  confirmed: 'badge-active',
  returned: 'badge-completed',
  surcharged: 'badge-rejected',
  special_handled: 'badge-approved',
}

const handlerTypeLabel: Record<string, string> = {
  return: '退回',
  surcharge: '加价处理',
  special: '专项处理',
}

const feeImpactLabel: Record<string, string> = {
  none: '无影响',
  increased: '费用增加',
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
    const data = await get<ProhibitedItem>(`/incidents/prohibited-items/${route.params.id}`)
    item.value = data
  } catch {
    item.value = null
  } finally {
    loading.value = false
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
  if (reportPhotoPaths.value.length === 0) return
  submitting.value = true
  try {
    await post('/incidents/prohibited-items', {
      execution_id: Number(route.query.execution_id),
      item_type: reportItemType.value,
      description: reportDescription.value || null,
      photos: JSON.stringify(reportPhotoPaths.value),
    })
    router.push('/incidents')
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function submitConfirm() {
  submitting.value = true
  try {
    await put(`/incidents/prohibited-items/${route.params.id}/confirm`, {
      handler_type: confirmHandlerType.value,
      fee_impact: confirmFeeImpact.value,
      additional_fee: confirmFeeImpact.value === 'increased' ? confirmAdditionalFee.value : 0,
      description: confirmDescription.value || undefined,
    })
    await fetchItem()
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

onMounted(fetchItem)
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
          <AlertTriangle class="text-orange-500" :size="20" />
          <h3 class="text-lg font-semibold">上报禁收物</h3>
        </div>
        <p class="text-gray-600 text-sm mb-4">发现油漆桶、电池、胶水或其他禁收物混在装修垃圾里时，请拍照上报并暂停装车。</p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">禁收物类型</label>
            <select v-model="reportItemType" class="input-field">
              <option value="paint">油漆桶</option>
              <option value="battery">电池</option>
              <option value="glue">胶水</option>
              <option value="other">其他禁收物</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">补充说明</label>
            <textarea v-model="reportDescription" class="input-field" rows="3" placeholder="描述禁收物情况"></textarea>
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
          <button class="btn-primary" :disabled="submitting || reportPhotoPaths.length === 0" @click="submitReport">
            {{ submitting ? '提交中...' : '上报禁收物并暂停装车' }}
          </button>
        </div>
      </div>

      <template v-if="item">
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <AlertTriangle class="text-orange-500" :size="20" />
              <h3 class="text-lg font-semibold">禁收物处置详情</h3>
            </div>
            <span :class="statusBadge[item.status] || 'badge-pending'">{{ statusLabel[item.status] || item.status }}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span class="text-gray-500 text-sm">禁收物类型：</span>{{ itemTypeLabel[item.item_type] || item.item_type }}</div>
            <div><span class="text-gray-500 text-sm">位置：</span>{{ item.building_location }}</div>
            <div><span class="text-gray-500 text-sm">楼栋：</span>{{ item.building_name || '-' }}</div>
            <div><span class="text-gray-500 text-sm">地址：</span>{{ item.building_address || '-' }}</div>
            <div><span class="text-gray-500 text-sm">司机：</span>{{ item.driver_name }} {{ item.driver_phone }}</div>
            <div><span class="text-gray-500 text-sm">车牌号：</span>{{ item.plate_number || '-' }}</div>
            <div><span class="text-gray-500 text-sm">垃圾类型：</span>{{ wasteTypeLabel[item.waste_type] || item.waste_type }}</div>
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
          <h3 class="text-lg font-semibold mb-4">处理结果</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span class="text-gray-500 text-sm">处理方式：</span>{{ handlerTypeLabel[item.handler_type!] || '-' }}</div>
            <div><span class="text-gray-500 text-sm">费用影响：</span>
              <span v-if="item.fee_impact === 'increased'" class="text-red-600 font-medium">费用增加 {{ item.additional_fee }} 元</span>
              <span v-else>{{ feeImpactLabel[item.fee_impact] }}</span>
            </div>
            <div><span class="text-gray-500 text-sm">确认人：</span>{{ item.confirm_user_name || '-' }}</div>
            <div><span class="text-gray-500 text-sm">确认时间：</span>{{ item.property_confirmed_at?.slice(0, 16)?.replace('T', ' ') || '-' }}</div>
          </div>
        </div>

        <div v-if="isRole('property') && item.status === 'reported'" class="card">
          <h3 class="text-lg font-semibold mb-4">物业确认处理</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">处理方式</label>
              <select v-model="confirmHandlerType" class="input-field">
                <option value="return">退回 — 将禁收物退回业主</option>
                <option value="surcharge">加价处理 — 额外收费后继续清运</option>
                <option value="special">专项处理 — 安排专门处置流程</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">是否影响原预约费用</label>
              <select v-model="confirmFeeImpact" class="input-field">
                <option value="none">不影响原费用</option>
                <option value="increased">原费用增加</option>
              </select>
            </div>
            <div v-if="confirmFeeImpact === 'increased'">
              <label class="block text-sm font-medium text-gray-700 mb-1">额外费用（元）</label>
              <input v-model.number="confirmAdditionalFee" type="number" step="0.01" min="0" class="input-field" placeholder="输入额外费用" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">备注说明</label>
              <textarea v-model="confirmDescription" class="input-field" rows="3" placeholder="补充处理说明"></textarea>
            </div>
            <button class="btn-primary" :disabled="submitting" @click="submitConfirm">
              {{ submitting ? '提交中...' : '确认处理' }}
            </button>
          </div>
        </div>

        <div v-if="isRole('owner') && item.owner_notified" class="card border-orange-200 bg-orange-50">
          <h3 class="text-lg font-semibold mb-4 text-orange-800">禁收物通知</h3>
          <div class="space-y-2 text-orange-900">
            <p><strong>禁收原因：</strong>{{ itemTypeLabel[item.item_type] || item.item_type }}属于禁收物品，不可混入装修垃圾中。</p>
            <p v-if="item.status !== 'reported'">
              <strong>后续处理方式：</strong>{{ handlerTypeLabel[item.handler_type!] || '待确认' }}
            </p>
            <p v-else>
              <strong>后续处理方式：</strong>物业正在确认中，请耐心等待。
            </p>
            <p>
              <strong>是否影响原预约费用：</strong>
              <span v-if="item.fee_impact === 'increased'" class="text-red-700 font-medium">是，额外增加 {{ item.additional_fee }} 元</span>
              <span v-else-if="item.status !== 'reported'">否，原预约费用不变</span>
              <span v-else>待物业确认</span>
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
