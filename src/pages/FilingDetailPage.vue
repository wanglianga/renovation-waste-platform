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

interface Filing {
  id: number
  owner_id: number
  building_id: number
  elevator_id: number
  renovation_start: string
  renovation_end: string
  waste_types: string
  status: 'pending' | 'approved' | 'rejected'
  approved_route: string | null
  elevator_hours: number | null
  approved_by: number | null
  created_at: string
  building_name: string
  elevator_name: string
  owner_name: string
  building_address: string
  elevator_hours_default: string
  owner_phone: string
  approver_name: string | null
}

const filing = ref<Filing | null>(null)
const loading = ref(true)
const approvedRoute = ref('')
const elevatorHours = ref<number | null>(null)
const submitting = ref(false)

const statusBadge: Record<string, string> = {
  pending: 'badge-pending',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
}
const statusLabel: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
}

const wasteTypeLabel: Record<string, string> = {
  construction: '建筑垃圾',
  furniture: '旧家具',
  hazardous: '危险废弃物',
}

function parseWasteTypes(raw: string): string[] {
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function fetchFiling() {
  loading.value = true
  try {
    filing.value = await get<Filing>(`/filings/${route.params.id}`)
  } catch {
    filing.value = null
  } finally {
    loading.value = false
  }
}

async function approveFiling() {
  submitting.value = true
  try {
    await put(`/filings/${route.params.id}/approve`, {
      approved_route: approvedRoute.value,
      elevator_hours: elevatorHours.value,
    })
    router.push('/filings')
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function rejectFiling() {
  submitting.value = true
  try {
    await put(`/filings/${route.params.id}/reject`, null)
    router.push('/filings')
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

onMounted(fetchFiling)
</script>

<template>
  <div>
    <button class="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4" @click="router.push('/filings')">
      <ArrowLeft :size="16" /> 返回列表
    </button>

    <div v-if="loading" class="text-center text-gray-400 py-12">加载中...</div>

    <div v-else-if="filing" class="space-y-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">备案信息</h3>
          <span :class="statusBadge[filing.status]">{{ statusLabel[filing.status] }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="text-gray-500 text-sm">业主姓名：</span>{{ filing.owner_name }}</div>
          <div><span class="text-gray-500 text-sm">联系电话：</span>{{ filing.owner_phone }}</div>
          <div><span class="text-gray-500 text-sm">楼栋：</span>{{ filing.building_name }}</div>
          <div><span class="text-gray-500 text-sm">楼栋地址：</span>{{ filing.building_address }}</div>
          <div><span class="text-gray-500 text-sm">电梯：</span>{{ filing.elevator_name }}</div>
          <div><span class="text-gray-500 text-sm">电梯默认时段：</span>{{ filing.elevator_hours_default }}</div>
          <div><span class="text-gray-500 text-sm">装修开始：</span>{{ filing.renovation_start }}</div>
          <div><span class="text-gray-500 text-sm">装修结束：</span>{{ filing.renovation_end }}</div>
          <div class="md:col-span-2"><span class="text-gray-500 text-sm">垃圾类型：</span>{{ parseWasteTypes(filing.waste_types).map(t => wasteTypeLabel[t] || t).join('、') }}</div>
          <div><span class="text-gray-500 text-sm">申请日期：</span>{{ filing.created_at }}</div>
        </div>
      </div>

      <div v-if="filing.status === 'approved'" class="card">
        <h3 class="text-lg font-semibold mb-4">审核结果</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="filing.approved_route"><span class="text-gray-500 text-sm">审批路线：</span>{{ filing.approved_route }}</div>
          <div v-if="filing.elevator_hours"><span class="text-gray-500 text-sm">电梯时段：</span>{{ filing.elevator_hours }}小时</div>
          <div v-if="filing.approver_name"><span class="text-gray-500 text-sm">审批人：</span>{{ filing.approver_name }}</div>
        </div>
      </div>

      <div v-if="isRole('property') && filing.status === 'pending'" class="card">
        <h3 class="text-lg font-semibold mb-4">审核操作</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">审批路线</label>
            <input v-model="approvedRoute" class="input-field" placeholder="请输入审批路线" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">电梯使用时段(小时)</label>
            <input v-model.number="elevatorHours" type="number" class="input-field" placeholder="请输入电梯使用时段" />
          </div>
          <div class="flex gap-3">
            <button class="btn-primary" :disabled="submitting" @click="approveFiling">通过</button>
            <button class="btn-danger" :disabled="submitting" @click="rejectFiling">驳回</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-gray-400 py-12">未找到备案信息</div>
  </div>
</template>
