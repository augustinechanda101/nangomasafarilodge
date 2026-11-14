import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PublicPage from './pages/PublicPage';
import LoginPage from './pages/LoginPage';
import StaffPage from './pages/StaffPage';
import ReceptionPage from './pages/ReceptionPage';
import BookingPage from './pages/BookingPage';
import RecordsPage from './pages/RecordsPage';
import LogsPage from './pages/LogsPage';
import FinancePage from './pages/FinancePage';
import GmPage from './pages/GmPage';
import GmStaffPage from './pages/GmStaffPage';
import { RequireAuth } from './lib/auth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/guest" element={<PublicPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/staff" element={<RequireAuth roles={['staff']}><StaffPage /></RequireAuth>} />
        <Route path="/reception" element={<RequireAuth roles={['reception']}><ReceptionPage /></RequireAuth>} />
        <Route path="/reception/booking" element={<RequireAuth roles={['reception']}><BookingPage /></RequireAuth>} />
        <Route path="/reception/records" element={<RequireAuth roles={['reception']}><RecordsPage /></RequireAuth>} />
        <Route path="/reception/logs" element={<RequireAuth roles={['reception']}><LogsPage /></RequireAuth>} />
        <Route path="/reception/finance" element={<RequireAuth roles={['reception']}><FinancePage /></RequireAuth>} />
        <Route path="/gm" element={<RequireAuth roles={['gm']}><GmPage /></RequireAuth>} />
        <Route path="/gm/staff" element={<RequireAuth roles={['gm']}><GmStaffPage /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
