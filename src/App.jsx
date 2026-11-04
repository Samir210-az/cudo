import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import { Loader } from './components/ui';
import Landing from './pages/Landing';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Children = lazy(() => import('./pages/Children'));
const ChildForm = lazy(() => import('./pages/ChildForm'));
const ChildCard = lazy(() => import('./pages/ChildCard'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Competitions = lazy(() => import('./pages/Competitions'));
const CompetitionDetail = lazy(() => import('./pages/CompetitionDetail'));
const Finance = lazy(() => import('./pages/Finance'));
const Staff = lazy(() => import('./pages/Staff'));
const Reports = lazy(() => import('./pages/Reports'));
const Overall = lazy(() => import('./pages/Overall'));
const Clubs = lazy(() => import('./pages/Clubs'));
const Settings = lazy(() => import('./pages/Settings'));
const More = lazy(() => import('./pages/More'));

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/k/:slug" element={<Landing />} />
        <Route path="/giris" element={<Login />} />
        <Route path="/panel" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="usaqlar" element={<Children />} />
          <Route path="usaqlar/yeni" element={<ChildForm />} />
          <Route path="usaqlar/:id" element={<ChildCard />} />
          <Route path="usaqlar/:id/redakte" element={<ChildForm />} />
          <Route path="davamiyyet" element={<Attendance />} />
          <Route path="yarislar" element={<Competitions />} />
          <Route path="yarislar/:id" element={<CompetitionDetail />} />
          <Route path="maliyye" element={<Finance />} />
          <Route path="heyet" element={<Staff />} />
          <Route path="hesabat" element={<Reports />} />
          <Route path="umumi" element={<Overall />} />
          <Route path="klublar" element={<Clubs />} />
          <Route path="ayarlar" element={<Settings />} />
          <Route path="daha" element={<More />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
