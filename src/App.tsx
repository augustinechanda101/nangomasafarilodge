import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PublicPage from './pages/PublicPage';
import StaffPage from './pages/StaffPage';
import ReceptionPage from './pages/ReceptionPage';
import BookingPage from './pages/BookingPage';
import RecordsPage from './pages/RecordsPage';
import LogsPage from './pages/LogsPage';
import FinancePage from './pages/FinancePage';
import GmPage from './pages/GmPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/guest" element={<PublicPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/reception" element={<ReceptionPage />} />
        <Route path="/reception/booking" element={<BookingPage />} />
        <Route path="/reception/records" element={<RecordsPage />} />
        <Route path="/reception/logs" element={<LogsPage />} />
        <Route path="/reception/finance" element={<FinancePage />} />
        <Route path="/gm" element={<GmPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
