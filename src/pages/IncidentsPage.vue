<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'

const { get } = useApi()
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
  created_at: string
  waste_type: string
  scheduled_time: string
  building_location: string
  driver_name: string
  building_name: string
  confirm_user_name: string | null
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
  created_at: string
  waste_type: string
  scheduled_time: string
  building_location: string
  driver_name: string
  building_name: string
  trace_user_name: string | null
}

const prohibitedItems = ref<ProhibitedItem[]>([])
const entryBlockages = ref<EntryBlockage[]>([])
const activeTab = ref<'prohibited' | 'blockage'>('prohibited')
const loading = ref(true)

const itemTypeLabel: Record<string, string> = {
  paint: '油漆桶',
  battery: '电池',
  glue: '胶水',
  other: '其他禁收物',
}

const prohibitedStatusLabel: Record<string, string> = {
  reported: '待确认',
  confirmed: '已确认',
  returned: '已退回',
  surcharged: '已加价',
  special_handled: '专项处理',
}

const prohibitedStatusBadge: Record<string, string> = {
  reported: 'badge-pending',
  confirmed: 'badge-active',
  returned: 'badge-completed',
  surcharged: 'badge-rejected',
  special_handled: 'badge-approved',
}

const blockageTypeLabel: Record<string, string> = {
  elevator_repair: '电梯维修',
  garage_height: '车库限高',
  road_restriction: '道路管制',
  owner_absent: '业主未在家',
  other: '其他原因',
}

const blockageStatusLabel: Record<string, string> = {
  reported: '待处理',
  rearranged: '已重新安排',
  settled: '已结算',
}

const blockageStatusBadge: Record<string, string> = {
  reported: 'badge-pending',
  rearranged: 'badge-active',
  settled: 'badge-completed',
}

const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

async function fetchData() {
  loading.value = true
  try {
    const [piData, ebData] = await Promise.all([
      get<ProhibitedItem[]>('/incidents/prohibited-items'),
      get<EntryBlockage[]>('/incidents/entry-blockages'),
    ])
    prohibitedItems.value = piData
    entryBlockages.value = ebData
  } catch {
    prohibitedItems.value = []
    entryBlockages.value = []
  } finally {
    loading.value = false
  }
}

function goProhibitedDetail(id: number) {
  router.push(`/incidents/prohibited/${id}`)
}

function goBlockageDetail(id: number) {
  router.push(`/incidents/blockage/${id}`)
}

onMounted(fetchData)
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-6">异常处置</h2>

    <div class="flex gap-2 mb-6">
      <button
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          activeTab === 'prohibited' ? 'bg-primary-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
        ]"
        @click="activeTab = 'prohibited'"
      >
        禁收物处置
      </button>
      <button
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          activeTab === 'blockage' ? 'bg-primary-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
        ]"
        @click="activeTab = 'blockage'"
      >
        进场受阻
      </button>
    </div>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <template v-else-if="activeTab === 'prohibited'">
      <div class="card overflow-hidden p-0">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-header">禁收物类型</th>
              <th class="table-header">位置</th>
              <th class="table-header">司机</th>
              <th class="table-header">楼栋</th>
              <th class="table-header">费用影响</th>
              <th class="table-header">状态</th>
              <th class="table-header">上报时间</th>
              <th class="table-header">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="item in prohibitedItems" :key="item.id" class="hover:bg-gray-50">
              <td class="table-cell">{{ itemTypeLabel[item.item_type] || item.item_type }}</td>
              <td class="table-cell">{{ item.building_location }}</td>
              <td class="table-cell">{{ item.driver_name }}</td>
              <td class="table-cell">{{ item.building_name || '-' }}</td>
              <td class="table-cell">
                <span v-if="item.fee_impact === 'increased'" class="text-red-600 font-medium">+{{ item.additional_fee }}元</span>
                <span v-else class="text-gray-500">无影响</span>
              </td>
              <td class="table-cell">
                <span :class="prohibitedStatusBadge[item.status] || 'badge-pending'">
                  {{ prohibitedStatusLabel[item.status] || item.status }}
                </span>
              </td>
              <td class="table-cell">{{ item.created_at?.slice(0, 16)?.replace('T', ' ') }}</td>
              <td class="table-cell">
                <button class="text-primary-700 hover:underline text-sm" @click="goProhibitedDetail(item.id)">查看</button>
              </td>
            </tr>
            <tr v-if="prohibitedItems.length === 0">
              <td colspan="8" class="table-cell text-center text-gray-400 py-8">暂无禁收物记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else>
      <div class="card overflow-hidden p-0">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="table-header">受阻原因</th>
              <th class="table-header">位置</th>
              <th class="table-header">司机</th>
              <th class="table-header">到场时间</th>
              <th class="table-header">空跑费</th>
              <th class="table-header">状态</th>
              <th class="table-header">上报时间</th>
              <th class="table-header">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="item in entryBlockages" :key="item.id" class="hover:bg-gray-50">
              <td class="table-cell">{{ blockageTypeLabel[item.blockage_type] || item.blockage_type }}</td>
              <td class="table-cell">{{ item.building_location }}</td>
              <td class="table-cell">{{ item.driver_name }}</td>
              <td class="table-cell">{{ item.arrival_time?.slice(0, 16)?.replace('T', ' ') }}</td>
              <td class="table-cell">
                <span v-if="item.empty_run_settled" class="text-orange-600 font-medium">{{ item.empty_run_fee }}元</span>
                <span v-else class="text-gray-500">-</span>
              </td>
              <td class="table-cell">
                <span :class="blockageStatusBadge[item.status] || 'badge-pending'">
                  {{ blockageStatusLabel[item.status] || item.status }}
                </span>
              </td>
              <td class="table-cell">{{ item.created_at?.slice(0, 16)?.replace('T', ' ') }}</td>
              <td class="table-cell">
                <button class="text-primary-700 hover:underline text-sm" @click="goBlockageDetail(item.id)">查看</button>
              </td>
            </tr>
            <tr v-if="entryBlockages.length === 0">
              <td colspan="8" class="table-cell text-center text-gray-400 py-8">暂无进场受阻记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
