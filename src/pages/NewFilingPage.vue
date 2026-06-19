<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'

const { get, post } = useApi()
const router = useRouter()

interface Building {
  id: number
  name: string
  address: string
  property_company_id: number
  property_company_name: string
}

interface Elevator {
  id: number
  name: string
  building_id: number
  available_hours: string
  building_name: string
}

const buildings = ref<Building[]>([])
const elevators = ref<Elevator[]>([])
const loadingBuildings = ref(true)
const loadingElevators = ref(false)

const form = ref({
  building_id: '' as string | number,
  elevator_id: '' as string | number,
  renovation_start: '',
  renovation_end: '',
  waste_types: [] as string[],
})
const submitting = ref(false)
const error = ref('')

const wasteOptions = [
  { value: 'construction', label: '建筑垃圾' },
  { value: 'furniture', label: '旧家具' },
  { value: 'hazardous', label: '危险废弃物' },
]

async function fetchBuildings() {
  loadingBuildings.value = true
  try {
    buildings.value = await get<Building[]>('/base/buildings')
  } catch {
    buildings.value = []
  } finally {
    loadingBuildings.value = false
  }
}

async function fetchElevators(buildingId: number) {
  loadingElevators.value = true
  elevators.value = []
  try {
    elevators.value = await get<Elevator[]>(`/base/elevators?building_id=${buildingId}`)
  } catch {
    elevators.value = []
  } finally {
    loadingElevators.value = false
  }
}

watch(() => form.value.building_id, (newVal) => {
  form.value.elevator_id = ''
  if (newVal) {
    fetchElevators(Number(newVal))
  } else {
    elevators.value = []
  }
})

function toggleWasteType(type: string) {
  const idx = form.value.waste_types.indexOf(type)
  if (idx >= 0) {
    form.value.waste_types.splice(idx, 1)
  } else {
    form.value.waste_types.push(type)
  }
}

async function handleSubmit() {
  if (!form.value.building_id) {
    error.value = '请选择楼栋'
    return
  }
  if (!form.value.elevator_id) {
    error.value = '请选择电梯'
    return
  }
  if (!form.value.renovation_start || !form.value.renovation_end) {
    error.value = '请选择装修日期'
    return
  }
  if (form.value.waste_types.length === 0) {
    error.value = '请至少选择一种垃圾类型'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await post('/filings', {
      building_id: Number(form.value.building_id),
      elevator_id: Number(form.value.elevator_id),
      renovation_start: form.value.renovation_start,
      renovation_end: form.value.renovation_end,
      waste_types: JSON.stringify(form.value.waste_types),
    })
    router.push('/filings')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交失败'
  } finally {
    submitting.value = false
  }
}

fetchBuildings()
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-6">新建装修备案</h2>

    <div class="card max-w-2xl">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">楼栋 *</label>
            <select v-model="form.building_id" class="input-field" :disabled="loadingBuildings">
              <option value="">{{ loadingBuildings ? '加载中...' : '请选择楼栋' }}</option>
              <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">电梯 *</label>
            <select v-model="form.elevator_id" class="input-field" :disabled="!form.building_id || loadingElevators">
              <option value="">{{ loadingElevators ? '加载中...' : form.building_id ? '请选择电梯' : '请先选择楼栋' }}</option>
              <option v-for="e in elevators" :key="e.id" :value="e.id">{{ e.name }}（{{ e.available_hours }}）</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">装修开始日期 *</label>
            <input v-model="form.renovation_start" type="date" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">装修结束日期 *</label>
            <input v-model="form.renovation_end" type="date" class="input-field" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">垃圾类型 *</label>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="opt in wasteOptions"
              :key="opt.value"
              :class="[
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all',
                form.waste_types.includes(opt.value)
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
              ]"
            >
              <input
                type="checkbox"
                :checked="form.waste_types.includes(opt.value)"
                class="sr-only"
                @change="toggleWasteType(opt.value)"
              />
              {{ opt.label }}
            </label>
          </div>
        </div>

        <div v-if="error" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {{ error }}
        </div>

        <div class="flex gap-3">
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? '提交中...' : '提交备案' }}
          </button>
          <button type="button" class="btn-outline" @click="router.push('/filings')">取消</button>
        </div>
      </form>
    </div>
  </div>
</template>
