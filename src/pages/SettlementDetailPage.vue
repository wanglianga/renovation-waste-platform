<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { ArrowLeft } from 'lucide-vue-next'

const { get } = useApi()
const route = useRoute()
const router = useRouter()

interface Settlement {
  id: number
  disposal_id: number
  transport_fee: number
  disposal_fee: number
  total_fee: number
  waste_type: string
  weight: number
  status: 'pending' | 'paid' | 'completed'
  created_at: string
  confirm_time: string
  weighbill_photo: string
  receipt_photo: string
  disposal_confirm_fee: number
  execution_net_weight: number
  appointment_waste_type: string
  scheduled_time: string
  building_location: string
  plate_number: string
  driver_name: string
  owner_name: string
  gross_weight: number
  tare_weight: number
  vehicle_type: string
  driver_phone: string
  owner_phone: string
}

const settlement = ref<Settlement | null>(null)
const loading = ref(true)

const statusBadge: Record<string, string> = {
  pending: 'badge-pending',
  paid: 'badge-approved',
  completed: 'badge-completed',
}
const statusLabel: Record<string, string> = {
  pending: '待结算',
  paid: '已支付',
  completed: '已完成',
}
const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

async function fetchSettlement() {
  loading.value = true
  try {
    const res = await get<Settlement>(`/settlements/${route.params.id}`)
    settlement.value = res
  } catch {
    settlement.value = null
  } finally {
    loading.value = false
  }
}

onMounted(fetchSettlement)
</script>

<template>
  <div>
    <button class="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4" @click="router.push('/settlement')">
      <ArrowLeft :size="16" /> 返回列表
    </button>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <div v-else-if="!settlement" class="text-center text-gray-400 py-12">未找到结算记录</div>

    <div v-else class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">结算信息</h3>
          <span :class="statusBadge[settlement.status]">{{ statusLabel[settlement.status] }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">垃圾类型：</span>{{ wasteTypeLabel[settlement.waste_type] || settlement.waste_type }}</div>
          <div><span class="text-gray-500 text-sm">重量：</span>{{ settlement.weight }}吨</div>
          <div><span class="text-gray-500 text-sm">消纳费：</span>¥{{ settlement.disposal_fee }}</div>
          <div><span class="text-gray-500 text-sm">运输费：</span>¥{{ settlement.transport_fee }}</div>
          <div class="md:col-span-2"><span class="text-gray-500 text-sm">合计：</span><span class="text-lg font-bold text-primary-700">¥{{ settlement.total_fee }}</span></div>
          <div><span class="text-gray-500 text-sm">创建时间：</span>{{ settlement.created_at }}</div>
          <div v-if="settlement.confirm_time"><span class="text-gray-500 text-sm">确认时间：</span>{{ settlement.confirm_time }}</div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">消纳信息</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">消纳确认费：</span>¥{{ settlement.disposal_confirm_fee }}</div>
          <div><span class="text-gray-500 text-sm">执行净重：</span>{{ settlement.execution_net_weight }}吨</div>
          <div v-if="settlement.weighbill_photo">
            <span class="text-gray-500 text-sm">磅单照片：</span>
            <a :href="settlement.weighbill_photo" target="_blank" class="text-primary-700 hover:underline text-sm">查看</a>
          </div>
          <div v-if="settlement.receipt_photo">
            <span class="text-gray-500 text-sm">回执照片：</span>
            <a :href="settlement.receipt_photo" target="_blank" class="text-primary-700 hover:underline text-sm">查看</a>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">执行称重</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><span class="text-gray-500 text-sm">毛重：</span>{{ settlement.gross_weight }}吨</div>
          <div><span class="text-gray-500 text-sm">皮重：</span>{{ settlement.tare_weight }}吨</div>
          <div><span class="text-gray-500 text-sm">净重：</span>{{ settlement.execution_net_weight }}吨</div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">预约信息</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">预约时间：</span>{{ settlement.scheduled_time }}</div>
          <div><span class="text-gray-500 text-sm">位置：</span>{{ settlement.building_location }}</div>
          <div><span class="text-gray-500 text-sm">预约垃圾类型：</span>{{ wasteTypeLabel[settlement.appointment_waste_type] || settlement.appointment_waste_type }}</div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">车辆/司机信息</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">车牌号：</span>{{ settlement.plate_number }}</div>
          <div><span class="text-gray-500 text-sm">车辆类型：</span>{{ settlement.vehicle_type }}</div>
          <div><span class="text-gray-500 text-sm">司机姓名：</span>{{ settlement.driver_name }}</div>
          <div><span class="text-gray-500 text-sm">司机电话：</span>{{ settlement.driver_phone }}</div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">业主信息</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">业主姓名：</span>{{ settlement.owner_name }}</div>
          <div><span class="text-gray-500 text-sm">业主电话：</span>{{ settlement.owner_phone }}</div>
          <div class="md:col-span-2"><span class="text-gray-500 text-sm">位置：</span>{{ settlement.building_location }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
