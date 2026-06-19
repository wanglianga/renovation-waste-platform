<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { Package, Armchair, AlertTriangle } from 'lucide-vue-next'

const { get, post } = useApi()
const router = useRouter()

interface Filing {
  id: number
  building_name: string
  waste_types: string
  status: string
}

const approvedFilings = ref<Filing[]>([])
const selectedFilingId = ref<number | null>(null)
const wasteType = ref('')
const bagCount = ref<number | null>(null)
const furnitureCount = ref<number | null>(null)
const scheduledTime = ref('')
const buildingLocation = ref('')
const submitting = ref(false)
const error = ref('')
const loading = ref(true)

const wasteCards = [
  { value: 'construction', label: '建筑垃圾', icon: Package, color: 'border-amber-300 bg-amber-50 text-amber-700', selectedColor: 'border-amber-500 bg-amber-100 ring-2 ring-amber-200' },
  { value: 'furniture', label: '旧家具', icon: Armchair, color: 'border-blue-300 bg-blue-50 text-blue-700', selectedColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-200' },
  { value: 'hazardous', label: '危险废弃物', icon: AlertTriangle, color: 'border-red-300 bg-red-50 text-red-700', selectedColor: 'border-red-500 bg-red-100 ring-2 ring-red-200' },
]

const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

const availableWasteTypes = computed(() => {
  const filing = approvedFilings.value.find((f) => f.id === selectedFilingId.value)
  if (!filing) return []
  try {
    const types: string[] = JSON.parse(filing.waste_types)
    return types
  } catch {
    return []
  }
})

const filteredWasteCards = computed(() =>
  wasteCards.filter((card) => availableWasteTypes.value.includes(card.value))
)

function selectWasteType(type: string) {
  wasteType.value = wasteType.value === type ? '' : type
}

watch(selectedFilingId, () => {
  wasteType.value = ''
})

async function fetchApprovedFilings() {
  loading.value = true
  try {
    const data = await get<Filing[]>('/filings')
    approvedFilings.value = data.filter((f) => f.status === 'approved')
  } catch {
    approvedFilings.value = []
  } finally {
    loading.value = false
  }
}

function formatFilingWasteTypes(filing: Filing): string {
  try {
    const types: string[] = JSON.parse(filing.waste_types)
    return types.map((t) => wasteTypeLabel[t] || t).join('、')
  } catch {
    return filing.waste_types
  }
}

async function handleSubmit() {
  if (!selectedFilingId.value) {
    error.value = '请选择备案'
    return
  }
  if (!wasteType.value) {
    error.value = '请选择垃圾类型（仅可选择一种）'
    return
  }
  if (wasteType.value !== 'furniture' && (!bagCount.value || bagCount.value <= 0)) {
    error.value = '请填写袋数'
    return
  }
  if (wasteType.value === 'furniture' && (!furnitureCount.value || furnitureCount.value <= 0)) {
    error.value = '请填写家具数量'
    return
  }
  if (!scheduledTime.value) {
    error.value = '请选择预约时间'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await post('/appointments', {
      filing_id: selectedFilingId.value,
      waste_type: wasteType.value,
      bag_count: wasteType.value !== 'furniture' ? bagCount.value : null,
      furniture_count: wasteType.value === 'furniture' ? furnitureCount.value : null,
      scheduled_time: scheduledTime.value,
      building_location: buildingLocation.value,
    })
    router.push('/appointments')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交失败'
  } finally {
    submitting.value = false
  }
}

onMounted(fetchApprovedFilings)
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-6">新建清运预约</h2>

    <div class="card max-w-2xl">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">选择备案 *</label>
          <select v-model="selectedFilingId" class="input-field">
            <option :value="null" disabled>请选择已通过的备案</option>
            <option v-for="f in approvedFilings" :key="f.id" :value="f.id">
              {{ f.building_name }}（垃圾类型：{{ formatFilingWasteTypes(f) }}）
            </option>
          </select>
        </div>

        <div v-if="selectedFilingId && filteredWasteCards.length > 0">
          <label class="block text-sm font-medium text-gray-700 mb-2">垃圾类型 *（单选，不可混合）</label>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="card in filteredWasteCards"
              :key="card.value"
              type="button"
              :class="[
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer',
                wasteType === card.value ? card.selectedColor : card.color,
              ]"
              @click="selectWasteType(card.value)"
            >
              <component :is="card.icon" :size="28" />
              <span class="text-sm font-medium">{{ card.label }}</span>
            </button>
          </div>
        </div>

        <div v-if="wasteType && wasteType !== 'furniture'">
          <label class="block text-sm font-medium text-gray-700 mb-1">袋数 *</label>
          <input v-model.number="bagCount" type="number" min="1" class="input-field" placeholder="请输入袋数" />
        </div>

        <div v-if="wasteType === 'furniture'">
          <label class="block text-sm font-medium text-gray-700 mb-1">家具数量 *</label>
          <input v-model.number="furnitureCount" type="number" min="1" class="input-field" placeholder="请输入家具件数" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">预约时间 *</label>
          <input v-model="scheduledTime" type="datetime-local" class="input-field" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">楼栋具体位置</label>
          <input v-model="buildingLocation" class="input-field" placeholder="如：A栋1单元门口" />
        </div>

        <div v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {{ error }}
        </div>

        <div class="flex gap-3">
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? '提交中...' : '提交预约' }}
          </button>
          <button type="button" class="btn-outline" @click="router.push('/appointments')">取消</button>
        </div>
      </form>
    </div>
  </div>
</template>
