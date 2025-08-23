import { Routes, Route, Link, Navigate } from "react-router-dom";
import "./App.css";
import Home from "./Pages/Home.jsx";
import Login from "./Pages/Login.jsx";
import Profile from "./Pages/Profile.jsx";
import UpcomingEvent from "./Pages/UpcomingEvent.jsx";
import CreateEvent from "./Pages/CreateEvent.jsx";
import JoinedEvent from "./Pages/JoinedEvent.jsx";
import ManageEvent from "./Pages/ManageEvent.jsx";
import About from "./Pages/About.jsx";
import Contact from "./Pages/Contact.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a proper spinner component
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/profile"
          element={
            isAuthenticated ? <Profile /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/upcoming-events"
          element={
            isAuthenticated ? <UpcomingEvent /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/create-event"
          element={
            isAuthenticated ? <CreateEvent /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/joined-events"
          element={
            isAuthenticated ? <JoinedEvent /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/manage-events"
          element={
            isAuthenticated ? <ManageEvent /> : <Navigate to="/login" replace />
          }
        />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dashboard" element={<div>Dashboard Coming Soon</div>} />
      </Routes>
    </>
  );
}

export default App;