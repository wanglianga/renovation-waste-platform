<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { ArrowLeft, Upload, Check } from 'lucide-vue-next'

const { get, put, uploadFile } = useApi()
const route = useRoute()
const router = useRouter()

interface WeightRecord {
  id: number
  execution_id: number
  waste_type: string
  gross_weight: number
  tare_weight: number
  net_weight: number
}

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
  vehicle_type: string
  weights: WeightRecord[]
}

const execution = ref<Execution | null>(null)
const loading = ref(true)
const submitting = ref(false)

const loadPhotoPaths = ref<string[]>([])
const weighPhotoPaths = ref<string[]>([])
const uploadingLoadPhoto = ref(false)
const uploadingWeighPhoto = ref(false)

const weightEntries = ref<{ waste_type: string; gross_weight: number; tare_weight: number }[]>([])
const newWeightEntry = ref({ waste_type: '', gross_weight: 0, tare_weight: 0 })

const steps = ['装车', '过磅', '运输', '卸货']
const stepStatuses = ['loading', 'weighing', 'transporting', 'unloaded']

const currentStepIndex = computed(() => {
  if (!execution.value) return 0
  return stepStatuses.indexOf(execution.value.status)
})

const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

const wasteOptions = [
  { value: 'construction', label: '建筑垃圾' },
  { value: 'furniture', label: '旧家具' },
  { value: 'hazardous', label: '危险废弃物' },
]

function parsePhotos(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function fetchExecution() {
  loading.value = true
  try {
    const data = await get<Execution>(`/executions/${route.params.id}`)
    execution.value = data
    loadPhotoPaths.value = parsePhotos(data.load_photos)
    weighPhotoPaths.value = parsePhotos(data.weigh_photos)
  } catch {
    execution.value = null
  } finally {
    loading.value = false
  }
}

function calcNet(entry: { gross_weight: number; tare_weight: number }): number {
  return Math.max(0, entry.gross_weight - entry.tare_weight)
}

function addWeightEntry() {
  if (!newWeightEntry.value.waste_type || newWeightEntry.value.gross_weight <= 0 || newWeightEntry.value.tare_weight <= 0) return
  weightEntries.value.push({ ...newWeightEntry.value })
  newWeightEntry.value = { waste_type: '', gross_weight: 0, tare_weight: 0 }
}

function removeWeightEntry(index: number) {
  weightEntries.value.splice(index, 1)
}

async function handleLoadPhotoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  uploadingLoadPhoto.value = true
  try {
    for (const file of Array.from(input.files)) {
      const result = await uploadFile(file)
      loadPhotoPaths.value.push(result.path)
    }
  } catch (e) {
    console.error(e)
  } finally {
    uploadingLoadPhoto.value = false
    input.value = ''
  }
}

async function handleWeighPhotoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  uploadingWeighPhoto.value = true
  try {
    for (const file of Array.from(input.files)) {
      const result = await uploadFile(file)
      weighPhotoPaths.value.push(result.path)
    }
  } catch (e) {
    console.error(e)
  } finally {
    uploadingWeighPhoto.value = false
    input.value = ''
  }
}

async function submitLoad() {
  if (loadPhotoPaths.value.length === 0) return
  submitting.value = true
  try {
    await put(`/executions/${route.params.id}/load`, {
      load_photos: JSON.stringify(loadPhotoPaths.value),
    })
    await fetchExecution()
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function submitWeigh() {
  if (weightEntries.value.length === 0) return
  submitting.value = true
  try {
    await put(`/executions/${route.params.id}/weigh`, {
      weights: weightEntries.value.map((w) => ({
        waste_type: w.waste_type,
        gross_weight: w.gross_weight,
        tare_weight: w.tare_weight,
      })),
      weigh_photos: JSON.stringify(weighPhotoPaths.value),
    })
    weightEntries.value = []
    await fetchExecution()
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function submitUnload() {
  submitting.value = true
  try {
    await put(`/executions/${route.params.id}/unload`, {})
    await fetchExecution()
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

onMounted(fetchExecution)
</script>

<template>
  <div>
    <button class="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4" @click="router.push('/execution')">
      <ArrowLeft :size="16" /> 返回列表
    </button>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <div v-else-if="!execution" class="text-center text-gray-400 py-12">未找到执行记录</div>

    <div v-else class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">执行进度</h3>
          <span class="badge-active">{{ steps[currentStepIndex] }}</span>
        </div>
        <div class="flex items-center justify-between">
          <div v-for="(step, i) in steps" :key="step" class="flex-1 flex items-center">
            <div class="flex flex-col items-center flex-1">
              <div
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  i <= currentStepIndex ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-500',
                ]"
              >
                <Check v-if="i < currentStepIndex" :size="16" />
                <span v-else>{{ i + 1 }}</span>
              </div>
              <span class="text-xs mt-1" :class="i <= currentStepIndex ? 'text-primary-700 font-medium' : 'text-gray-400'">{{ step }}</span>
            </div>
            <div v-if="i < steps.length - 1" :class="['h-0.5 flex-1 mx-2', i < currentStepIndex ? 'bg-primary-700' : 'bg-gray-200']" />
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">任务信息</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">位置：</span>{{ execution.building_location }}</div>
          <div><span class="text-gray-500 text-sm">垃圾类型：</span>{{ wasteTypeLabel[execution.waste_type] || execution.waste_type }}</div>
          <div><span class="text-gray-500 text-sm">车牌号：</span>{{ execution.plate_number }}</div>
          <div><span class="text-gray-500 text-sm">车辆类型：</span>{{ execution.vehicle_type }}</div>
          <div><span class="text-gray-500 text-sm">创建时间：</span>{{ execution.created_at?.slice(0, 16)?.replace('T', ' ') }}</div>
        </div>
      </div>

      <div v-if="execution.status === 'loading'" class="card">
        <h3 class="text-lg font-semibold mb-4">装车照片</h3>
        <div class="flex flex-wrap items-center gap-4 mb-4">
          <label class="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500 cursor-pointer transition-colors">
            <Upload :size="20" />
            <span class="text-xs mt-1">{{ uploadingLoadPhoto ? '上传中' : '上传' }}</span>
            <input type="file" accept="image/*" multiple class="hidden" :disabled="uploadingLoadPhoto" @change="handleLoadPhotoUpload" />
          </label>
          <div v-for="photo in loadPhotoPaths" :key="photo" class="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
            <img :src="photo" class="w-full h-full object-cover" />
          </div>
        </div>
        <button class="btn-primary" :disabled="submitting || loadPhotoPaths.length === 0" @click="submitLoad">
          {{ submitting ? '提交中...' : '完成装车' }}
        </button>
      </div>

      <div v-if="execution.status === 'weighing'" class="card">
        <h3 class="text-lg font-semibold mb-4">过磅记录</h3>
        <div v-if="execution.weights && execution.weights.length > 0" class="mb-4">
          <h4 class="text-sm font-medium text-gray-600 mb-2">已提交过磅数据</h4>
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">垃圾类型</th>
                <th class="table-header">毛重(吨)</th>
                <th class="table-header">皮重(吨)</th>
                <th class="table-header">净重(吨)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="w in execution.weights" :key="w.id">
                <td class="table-cell">{{ wasteTypeLabel[w.waste_type] || w.waste_type }}</td>
                <td class="table-cell">{{ w.gross_weight }}</td>
                <td class="table-cell">{{ w.tare_weight }}</td>
                <td class="table-cell font-medium">{{ w.net_weight }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mb-4">
          <h4 class="text-sm font-medium text-gray-600 mb-2">添加过磅数据</h4>
          <div v-if="weightEntries.length > 0" class="mb-3">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="table-header">垃圾类型</th>
                  <th class="table-header">毛重(吨)</th>
                  <th class="table-header">皮重(吨)</th>
                  <th class="table-header">净重(吨)</th>
                  <th class="table-header">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="(w, i) in weightEntries" :key="i">
                  <td class="table-cell">{{ wasteTypeLabel[w.waste_type] || w.waste_type }}</td>
                  <td class="table-cell">{{ w.gross_weight }}</td>
                  <td class="table-cell">{{ w.tare_weight }}</td>
                  <td class="table-cell font-medium">{{ calcNet(w) }}</td>
                  <td class="table-cell">
                    <button class="text-red-500 hover:underline text-sm" @click="removeWeightEntry(i)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <select v-model="newWeightEntry.waste_type" class="input-field">
              <option value="" disabled>垃圾类型</option>
              <option v-for="opt in wasteOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <input v-model.number="newWeightEntry.gross_weight" type="number" step="0.01" class="input-field" placeholder="毛重(吨)" />
            <input v-model.number="newWeightEntry.tare_weight" type="number" step="0.01" class="input-field" placeholder="皮重(吨)" />
            <button class="btn-outline whitespace-nowrap" @click="addWeightEntry">添加</button>
          </div>
        </div>
        <div class="mb-4">
          <h4 class="text-sm font-medium text-gray-600 mb-2">过磅照片</h4>
          <div class="flex flex-wrap items-center gap-4">
            <label class="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500 cursor-pointer transition-colors">
              <Upload :size="20" />
              <span class="text-xs mt-1">{{ uploadingWeighPhoto ? '上传中' : '上传' }}</span>
              <input type="file" accept="image/*" multiple class="hidden" :disabled="uploadingWeighPhoto" @change="handleWeighPhotoUpload" />
            </label>
            <div v-for="photo in weighPhotoPaths" :key="photo" class="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
              <img :src="photo" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>
        <button class="btn-primary" :disabled="submitting || weightEntries.length === 0" @click="submitWeigh">
          {{ submitting ? '提交中...' : '完成过磅' }}
        </button>
      </div>

      <div v-if="execution.status === 'transporting'" class="card">
        <h3 class="text-lg font-semibold mb-4">运输中</h3>
        <p class="text-gray-600 mb-4">正在运往消纳场，到达后请确认卸货。</p>
        <button class="btn-primary" :disabled="submitting" @click="submitUnload">
          {{ submitting ? '提交中...' : '确认卸货' }}
        </button>
      </div>

      <div v-if="execution.status === 'unloaded'" class="card">
        <h3 class="text-lg font-semibold mb-4">已卸货</h3>
        <p class="text-green-600 mb-4">卸货已完成，等待消纳场确认处置。</p>
        <div v-if="execution.weights && execution.weights.length > 0">
          <h4 class="text-sm font-medium text-gray-600 mb-2">过磅明细</h4>
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">垃圾类型</th>
                <th class="table-header">毛重(吨)</th>
                <th class="table-header">皮重(吨)</th>
                <th class="table-header">净重(吨)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="w in execution.weights" :key="w.id">
                <td class="table-cell">{{ wasteTypeLabel[w.waste_type] || w.waste_type }}</td>
                <td class="table-cell">{{ w.gross_weight }}</td>
                <td class="table-cell">{{ w.tare_weight }}</td>
                <td class="table-cell font-medium">{{ w.net_weight }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="execution.status === 'completed'" class="card">
        <h3 class="text-lg font-semibold mb-4">已完成</h3>
        <p class="text-green-600">本单清运任务已全部完成。</p>
        <div v-if="execution.weights && execution.weights.length > 0">
          <h4 class="text-sm font-medium text-gray-600 mb-2 mt-4">过磅明细</h4>
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">垃圾类型</th>
                <th class="table-header">毛重(吨)</th>
                <th class="table-header">皮重(吨)</th>
                <th class="table-header">净重(吨)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="w in execution.weights" :key="w.id">
                <td class="table-cell">{{ wasteTypeLabel[w.waste_type] || w.waste_type }}</td>
                <td class="table-cell">{{ w.gross_weight }}</td>
                <td class="table-cell">{{ w.tare_weight }}</td>
                <td class="table-cell font-medium">{{ w.net_weight }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
