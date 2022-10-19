import React from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Contacts from '../pages/Webform/Contacts';
import DnD from "../pages/Webform/D&D";
import Upcoming from '../pages/Webform/Upcoming';
import MasterList from '../pages/Checkin/MasterList';
import TicketForm from '../pages/Checkin/TicketForm';
import CheckinLandingScreen from '../pages/Checkin/CheckinLandingScreen';
import RedeemVouchers from "../pages/RedeemVouchers";
import ScanHistory from "../pages/RedeemVouchers";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/webform/0001" element={<Contacts />}/>
        <Route path="/webform/0002" element={<DnD />}/>
        <Route path="/upcoming" element={<Upcoming />}/> 
        <Route path="/checkin/success" element={<CheckinLandingScreen />}/>
        <Route path="/checkin/masterlist/:transactionId" element={<MasterList />}/> 
        <Route path="/checkin/:masterId" element={<TicketForm />}/> 
        <Route path="/redeem" element={<RedeemVouchers />}/>
        <Route path="/redeem/history" element={<ScanHistory />}/>
      </Routes>
    </Router>
  );
}

export default App;
