<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'
import { Plus, Search } from 'lucide-vue-next'

const { isRole } = useAuth()
const { get, put } = useApi()
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
}

const filings = ref<Filing[]>([])
const search = ref('')
const statusFilter = ref('')
const loading = ref(true)

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

function displayWasteTypes(raw: string): string {
  return parseWasteTypes(raw).map(t => wasteTypeLabel[t] || t).join('、')
}

const filteredFilings = computed(() =>
  filings.value.filter((f) => {
    const matchSearch = !search.value || f.owner_name.includes(search.value) || f.building_name.includes(search.value)
    const matchStatus = !statusFilter.value || f.status === statusFilter.value
    return matchSearch && matchStatus
  })
)

async function fetchFilings() {
  loading.value = true
  try {
    filings.value = await get<Filing[]>('/filings')
  } catch {
    filings.value = []
  } finally {
    loading.value = false
  }
}

async function approveFiling(id: number) {
  try {
    await put(`/filings/${id}/approve`, {})
    await fetchFilings()
  } catch (e) {
    console.error(e)
  }
}

async function rejectFiling(id: number) {
  try {
    await put(`/filings/${id}/reject`, null)
    await fetchFilings()
  } catch (e) {
    console.error(e)
  }
}

function goDetail(id: number) {
  router.push(`/filings/${id}`)
}

onMounted(fetchFilings)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-900">装修备案</h2>
      <button v-if="isRole('owner')" class="btn-primary flex items-center gap-1" @click="router.push('/filings/new')">
        <Plus :size="16" /> 新建备案
      </button>
    </div>

    <div class="card mb-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="search" placeholder="搜索业主/楼栋..." class="input-field pl-9" />
        </div>
        <select v-model="statusFilter" class="input-field w-auto">
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
        </select>
      </div>
    </div>

    <div class="card overflow-hidden p-0">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">业主</th>
            <th class="table-header">楼栋</th>
            <th class="table-header">电梯</th>
            <th class="table-header">垃圾类型</th>
            <th class="table-header">状态</th>
            <th class="table-header">日期</th>
            <th class="table-header">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="filing in filteredFilings" :key="filing.id" class="hover:bg-gray-50">
            <td class="table-cell">{{ filing.owner_name }}</td>
            <td class="table-cell">{{ filing.building_name }}</td>
            <td class="table-cell">{{ filing.elevator_name }}</td>
            <td class="table-cell">{{ displayWasteTypes(filing.waste_types) }}</td>
            <td class="table-cell"><span :class="statusBadge[filing.status]">{{ statusLabel[filing.status] }}</span></td>
            <td class="table-cell">{{ filing.created_at }}</td>
            <td class="table-cell">
              <div class="flex items-center gap-2">
                <button class="text-primary-700 hover:underline text-sm" @click="goDetail(filing.id)">查看</button>
                <template v-if="isRole('property') && filing.status === 'pending'">
                  <button class="text-green-600 hover:underline text-sm" @click="approveFiling(filing.id)">通过</button>
                  <button class="text-red-600 hover:underline text-sm" @click="rejectFiling(filing.id)">驳回</button>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="filteredFilings.length === 0">
            <td colspan="7" class="table-cell text-center text-gray-400 py-8">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
