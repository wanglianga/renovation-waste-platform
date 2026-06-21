<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth, type UserRole } from '@/composables/useAuth'
import {
  LayoutDashboard,
  FileText,
  CalendarCheck,
  Truck,
  ClipboardList,
  Recycle,
  Receipt,
  BarChart3,
  LogOut,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-vue-next'
import { ref } from 'vue'

const { user, logout, isRole } = useAuth()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)

interface NavItem {
  label: string
  icon: typeof LayoutDashboard
  path: string
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { label: '工作台', icon: LayoutDashboard, path: '/dashboard', roles: ['owner', 'property', 'transport', 'driver', 'disposal'] },
  { label: '装修备案', icon: FileText, path: '/filings', roles: ['owner', 'property'] },
  { label: '清运预约', icon: CalendarCheck, path: '/appointments', roles: ['owner', 'property'] },
  { label: '清运调度', icon: Truck, path: '/dispatch', roles: ['transport'] },
  { label: '清运执行', icon: ClipboardList, path: '/execution', roles: ['driver'] },
  { label: '异常处置', icon: AlertTriangle, path: '/incidents', roles: ['owner', 'property', 'transport', 'driver'] },
  { label: '消纳接收', icon: Recycle, path: '/disposal', roles: ['disposal'] },
  { label: '结算对账', icon: Receipt, path: '/settlement', roles: ['owner', 'transport', 'disposal'] },
  { label: '统计分析', icon: BarChart3, path: '/statistics', roles: ['owner', 'property', 'transport', 'disposal'] },
]

const visibleNavItems = computed(() =>
  navItems.filter((item) => isRole(...item.roles))
)

const roleLabels: Record<UserRole, string> = {
  owner: '业主',
  property: '物业',
  transport: '清运公司',
  driver: '司机',
  disposal: '消纳场',
}

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function navigate(path: string) {
  router.push(path)
  sidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen flex">
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-30 w-64 bg-primary-800 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="flex items-center justify-between h-16 px-6 bg-primary-900">
        <h1 class="text-lg font-bold truncate">垃圾清运平台</h1>
        <button class="lg:hidden" @click="sidebarOpen = false">
          <X :size="20" />
        </button>
      </div>
      <nav class="mt-4 space-y-1 px-3">
        <button
          v-for="item in visibleNavItems"
          :key="item.path"
          :class="[
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive(item.path)
              ? 'bg-primary-600 text-white'
              : 'text-primary-100 hover:bg-primary-700',
          ]"
          @click="navigate(item.path)"
        >
          <component :is="item.icon" :size="18" />
          {{ item.label }}
        </button>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <button class="lg:hidden" @click="sidebarOpen = true">
          <Menu :size="24" class="text-gray-600" />
        </button>
        <div class="hidden lg:block"></div>
        <div class="flex items-center gap-4">
          <span v-if="user" class="text-sm text-gray-600">
            {{ user.name }} · {{ roleLabels[user.role] }}
          </span>
          <button
            class="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
            @click="logout"
          >
            <LogOut :size="16" />
            退出
          </button>
        </div>
      </header>

      <main class="flex-1 p-6 overflow-auto">
        <router-view />
      </main>
    </div>

    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-20 bg-black/50 lg:hidden"
      @click="sidebarOpen = false"
    />
  </div>
</template>
