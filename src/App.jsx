import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AboutPage from './pages/AboutPage'
import AdminChangePasswordPage from './pages/AdminChangePasswordPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminLoginPage from './pages/AdminLoginPage'
import ContactPage from './pages/ContactPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import ProductDetailsPage from './pages/ProductDetailsPage'
import ProductsPage from './pages/ProductsPage'
import ServicesPage from './pages/ServicesPage'
import TermsConditionsPage from './pages/TermsConditionsPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="admin" element={<AdminLoginPage />} />
      <Route path="admin/change-password" element={<AdminChangePasswordPage />} />
      <Route path="admin/dashboard" element={<AdminDashboardPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="export-product/:slug" element={<ProductDetailsPage />} />
        <Route path="products/:slug" element={<ProductDetailsPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="terms-and-conditions" element={<TermsConditionsPage />} />
        <Route path="terms" element={<TermsConditionsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
