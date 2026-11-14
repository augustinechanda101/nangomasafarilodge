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
import { RequireAuth } from './lib/auth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/guest" element={<PublicPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/staff" element={<RequireAuth><StaffPage /></RequireAuth>} />
        <Route path="/reception" element={<RequireAuth><ReceptionPage /></RequireAuth>} />
        <Route path="/reception/booking" element={<RequireAuth><BookingPage /></RequireAuth>} />
        <Route path="/reception/records" element={<RequireAuth><RecordsPage /></RequireAuth>} />
        <Route path="/reception/logs" element={<RequireAuth><LogsPage /></RequireAuth>} />
        <Route path="/reception/finance" element={<RequireAuth><FinancePage /></RequireAuth>} />
        <Route path="/gm" element={<RequireAuth><GmPage /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
