import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import MainLayout from './components/Layout/MainLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import ChatPage from './pages/ChatPage'
import ContactsPage from './pages/ContactsPage'
import ProfilePage from './pages/ProfilePage'
import TeamsPage from './pages/TeamsPage'
import OrganizationPage from './pages/OrganizationPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/chats" replace />} />
        <Route path="chats" element={<ChatPage />} />
        <Route path="chats/:id" element={<ChatPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="teams/:id" element={<TeamsPage />} />
        <Route path="organization" element={<OrganizationPage />} />
        <Route path="organization/:departmentId" element={<OrganizationPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
