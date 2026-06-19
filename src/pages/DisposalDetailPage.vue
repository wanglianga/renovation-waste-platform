<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { ArrowLeft, Upload } from 'lucide-vue-next'

const { get, put, uploadFile } = useApi()
const route = useRoute()
const router = useRouter()

interface Weight {
  id: number
  execution_id: number
  waste_type: string
  gross_weight: number
  tare_weight: number
  net_weight: number
}

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
  tare_weight: number | null
  vehicle_type: string | null
  driver_phone: string | null
  weights: Weight[]
}

interface SettlementItem {
  waste_type: string
  transport_fee: number | null
  disposal_fee: number | null
  weight: number
}

const disposal = ref<Disposal | null>(null)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const weighbillUploading = ref(false)
const receiptUploading = ref(false)
const settlementItems = ref<SettlementItem[]>([])

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

async function fetchDisposal() {
  loading.value = true
  try {
    const res = await get<Disposal>(`/disposals/${route.params.id}`)
    disposal.value = res
    initSettlementItems(res)
  } catch {
    disposal.value = null
  } finally {
    loading.value = false
  }
}

function initSettlementItems(d: Disposal) {
  if (d.weights && d.weights.length > 0) {
    settlementItems.value = d.weights.map(w => ({
      waste_type: w.waste_type,
      transport_fee: null,
      disposal_fee: null,
      weight: w.net_weight,
    }))
  } else {
    settlementItems.value = [{
      waste_type: d.waste_type,
      transport_fee: null,
      disposal_fee: null,
      weight: d.net_weight ?? 0,
    }]
  }
}

async function uploadWeighbill(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  weighbillUploading.value = true
  try {
    const result = await uploadFile(input.files[0])
    await put(`/disposals/${route.params.id}/weighbill`, { weighbill_photo: result.path })
    await fetchDisposal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '上传磅单失败'
  } finally {
    weighbillUploading.value = false
    input.value = ''
  }
}

async function uploadReceipt(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  receiptUploading.value = true
  try {
    const result = await uploadFile(input.files[0])
    await put(`/disposals/${route.params.id}/receipt`, { receipt_photo: result.path })
    await fetchDisposal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '上传回执失败'
  } finally {
    receiptUploading.value = false
    input.value = ''
  }
}

async function confirmArrival() {
  submitting.value = true
  error.value = ''
  try {
    await put(`/disposals/${route.params.id}/confirm`, {})
    await fetchDisposal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '确认失败'
  } finally {
    submitting.value = false
  }
}

async function submitSettlement() {
  const items = settlementItems.value.filter(i => i.transport_fee !== null && i.disposal_fee !== null)
  if (items.length === 0) {
    error.value = '请至少填写一项费用'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await put(`/disposals/${route.params.id}/settle`, {
      items: items.map(i => ({
        waste_type: i.waste_type,
        transport_fee: i.transport_fee,
        disposal_fee: i.disposal_fee,
        weight: i.weight,
      })),
    })
    await fetchDisposal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '结算失败'
  } finally {
    submitting.value = false
  }
}

onMounted(fetchDisposal)
</script>

<template>
  <div>
    <button class="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4" @click="router.push('/disposal')">
      <ArrowLeft :size="16" /> 返回列表
    </button>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <div v-else-if="!disposal" class="text-center text-gray-400 py-12">未找到数据</div>

    <div v-else class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">消纳信息</h3>
          <span :class="statusBadge[disposal.status]">{{ statusLabel[disposal.status] }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">车牌号：</span>{{ disposal.plate_number }}</div>
          <div><span class="text-gray-500 text-sm">司机：</span>{{ disposal.driver_name }}</div>
          <div v-if="disposal.driver_phone"><span class="text-gray-500 text-sm">司机电话：</span>{{ disposal.driver_phone }}</div>
          <div><span class="text-gray-500 text-sm">垃圾类型：</span>{{ wasteTypeLabel[disposal.waste_type] || disposal.waste_type }}</div>
          <div><span class="text-gray-500 text-sm">毛重：</span>{{ disposal.gross_weight ?? '-' }}吨</div>
          <div><span class="text-gray-500 text-sm">净重：</span>{{ disposal.net_weight ?? '-' }}吨</div>
          <div v-if="disposal.tare_weight"><span class="text-gray-500 text-sm">皮重：</span>{{ disposal.tare_weight }}吨</div>
          <div v-if="disposal.vehicle_type"><span class="text-gray-500 text-sm">车辆类型：</span>{{ disposal.vehicle_type }}</div>
          <div v-if="disposal.building_location"><span class="text-gray-500 text-sm">装车地点：</span>{{ disposal.building_location }}</div>
          <div v-if="disposal.scheduled_time"><span class="text-gray-500 text-sm">预约时间：</span>{{ disposal.scheduled_time }}</div>
          <div><span class="text-gray-500 text-sm">创建日期：</span>{{ disposal.created_at }}</div>
        </div>

        <div v-if="disposal.weights && disposal.weights.length > 0" class="mt-4 pt-4 border-t border-gray-200">
          <h4 class="text-sm font-medium text-gray-700 mb-2">重量明细</h4>
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">垃圾类型</th>
                <th class="table-header">毛重(吨)</th>
                <th class="table-header">皮重(吨)</th>
                <th class="table-header">净重(吨)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="w in disposal.weights" :key="w.id">
                <td class="table-cell">{{ wasteTypeLabel[w.waste_type] || w.waste_type }}</td>
                <td class="table-cell">{{ w.gross_weight }}</td>
                <td class="table-cell">{{ w.tare_weight }}</td>
                <td class="table-cell">{{ w.net_weight }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="disposal.status === 'pending'" class="card space-y-4">
        <h3 class="text-lg font-semibold">接收操作</h3>
        <div v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error }}</div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">磅单照片</label>
          <div v-if="disposal.weighbill_photo" class="mb-2">
            <img :src="disposal.weighbill_photo" alt="磅单" class="w-32 h-32 object-cover rounded-lg border border-gray-200" />
          </div>
          <label class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
            <Upload :size="16" />
            {{ weighbillUploading ? '上传中...' : (disposal.weighbill_photo ? '重新上传' : '上传磅单') }}
            <input type="file" accept="image/*" class="hidden" :disabled="weighbillUploading" @change="uploadWeighbill" />
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">回执照片</label>
          <div v-if="disposal.receipt_photo" class="mb-2">
            <img :src="disposal.receipt_photo" alt="回执" class="w-32 h-32 object-cover rounded-lg border border-gray-200" />
          </div>
          <label class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
            <Upload :size="16" />
            {{ receiptUploading ? '上传中...' : (disposal.receipt_photo ? '重新上传' : '上传回执') }}
            <input type="file" accept="image/*" class="hidden" :disabled="receiptUploading" @change="uploadReceipt" />
          </label>
        </div>

        <button class="btn-primary" :disabled="submitting" @click="confirmArrival">
          {{ submitting ? '确认中...' : '确认到达' }}
        </button>
      </div>

      <div v-if="disposal.status === 'confirmed'" class="card space-y-4">
        <h3 class="text-lg font-semibold">结算操作</h3>
        <div v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error }}</div>

        <div v-if="disposal.weighbill_photo || disposal.receipt_photo" class="flex gap-4 mb-2">
          <div v-if="disposal.weighbill_photo">
            <span class="text-sm text-gray-500 block mb-1">磅单照片</span>
            <img :src="disposal.weighbill_photo" alt="磅单" class="w-24 h-24 object-cover rounded-lg border border-gray-200" />
          </div>
          <div v-if="disposal.receipt_photo">
            <span class="text-sm text-gray-500 block mb-1">回执照片</span>
            <img :src="disposal.receipt_photo" alt="回执" class="w-24 h-24 object-cover rounded-lg border border-gray-200" />
          </div>
        </div>

        <div class="space-y-4">
          <div v-for="(item, idx) in settlementItems" :key="idx" class="p-4 bg-gray-50 rounded-lg">
            <div class="font-medium text-gray-800 mb-3">
              {{ wasteTypeLabel[item.waste_type] || item.waste_type }}
              <span class="text-gray-500 font-normal ml-2">{{ item.weight }}吨</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-gray-600 mb-1">运输费(元)</label>
                <input v-model.number="item.transport_fee" type="number" step="0.01" class="input-field" placeholder="运输费" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">消纳费(元)</label>
                <input v-model.number="item.disposal_fee" type="number" step="0.01" class="input-field" placeholder="消纳费" />
              </div>
            </div>
          </div>
        </div>

        <button class="btn-primary" :disabled="submitting" @click="submitSettlement">
          {{ submitting ? '提交中...' : '确认结算' }}
        </button>
      </div>

      <div v-if="disposal.status === 'settled'" class="card">
        <h3 class="text-lg font-semibold mb-4">结算信息</h3>
        <div v-if="disposal.weighbill_photo || disposal.receipt_photo" class="flex gap-4 mb-4">
          <div v-if="disposal.weighbill_photo">
            <span class="text-sm text-gray-500 block mb-1">磅单照片</span>
            <img :src="disposal.weighbill_photo" alt="磅单" class="w-24 h-24 object-cover rounded-lg border border-gray-200" />
          </div>
          <div v-if="disposal.receipt_photo">
            <span class="text-sm text-gray-500 block mb-1">回执照片</span>
            <img :src="disposal.receipt_photo" alt="回执" class="w-24 h-24 object-cover rounded-lg border border-gray-200" />
          </div>
        </div>
        <div v-if="disposal.disposal_fee !== null" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">消纳费：</span>¥{{ disposal.disposal_fee }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
