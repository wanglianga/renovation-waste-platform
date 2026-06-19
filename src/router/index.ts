import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import LoginPage from '@/pages/LoginPage.vue'
import DashboardPage from '@/pages/DashboardPage.vue'
import FilingsPage from '@/pages/FilingsPage.vue'
import FilingDetailPage from '@/pages/FilingDetailPage.vue'
import NewFilingPage from '@/pages/NewFilingPage.vue'
import AppointmentsPage from '@/pages/AppointmentsPage.vue'
import AppointmentDetailPage from '@/pages/AppointmentDetailPage.vue'
import NewAppointmentPage from '@/pages/NewAppointmentPage.vue'
import DispatchesPage from '@/pages/DispatchesPage.vue'
import DispatchDetailPage from '@/pages/DispatchDetailPage.vue'
import ExecutionsPage from '@/pages/ExecutionsPage.vue'
import ExecutionDetailPage from '@/pages/ExecutionDetailPage.vue'
import DisposalsPage from '@/pages/DisposalsPage.vue'
import DisposalDetailPage from '@/pages/DisposalDetailPage.vue'
import SettlementsPage from '@/pages/SettlementsPage.vue'
import SettlementDetailPage from '@/pages/SettlementDetailPage.vue'
import StatisticsPage from '@/pages/StatisticsPage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', name: 'login', component: LoginPage, meta: { public: true } },
  { path: '/dashboard', name: 'dashboard', component: DashboardPage },
  { path: '/filings', name: 'filings', component: FilingsPage },
  { path: '/filings/new', name: 'newFiling', component: NewFilingPage },
  { path: '/filings/:id', name: 'filingDetail', component: FilingDetailPage },
  { path: '/appointments', name: 'appointments', component: AppointmentsPage },
  { path: '/appointments/new', name: 'newAppointment', component: NewAppointmentPage },
  { path: '/appointments/:id', name: 'appointmentDetail', component: AppointmentDetailPage },
  { path: '/dispatch', name: 'dispatches', component: DispatchesPage },
  { path: '/dispatch/:id', name: 'dispatchDetail', component: DispatchDetailPage },
  { path: '/execution', name: 'executions', component: ExecutionsPage },
  { path: '/execution/:id', name: 'executionDetail', component: ExecutionDetailPage },
  { path: '/disposal', name: 'disposals', component: DisposalsPage },
  { path: '/disposal/:id', name: 'disposalDetail', component: DisposalDetailPage },
  { path: '/settlement', name: 'settlements', component: SettlementsPage },
  { path: '/settlement/:id', name: 'settlementDetail', component: SettlementDetailPage },
  { path: '/statistics', name: 'statistics', component: StatisticsPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.public || token) {
    next()
  } else {
    next('/login')
  }
})

export default router
