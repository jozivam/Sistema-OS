
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';
import { dbService } from './services/dbService';
import { supabase } from './services/supabaseClient';
import { User, UserRole, Company } from './types';

// Components
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import Reports from './pages/Reports';
import DeveloperPanel from './pages/DeveloperPanel';
import CompanyManagement from './pages/CompanyManagement';
import DeveloperPayments from './pages/DeveloperPayments';
import DeveloperSettings from './pages/DeveloperSettings';
import SignUp from './pages/SignUp';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escutar mudanças de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          // Buscar dados do perfil do usuário em public.users
          const user = await authService.getCurrentUser();
          setCurrentUser(user);

          if (user?.companyId) {
            const companyData = await dbService.getCompany(user.companyId);
            setCompany(companyData);
          }
        } catch (error) {
          console.error("Erro ao carregar perfil do usuário:", error);
        }
      } else {
        setCurrentUser(null);
        setCompany(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUserChange = (user: User | null) => {
    setCurrentUser(user);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <i className="fa-solid fa-spinner fa-spin text-4xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="*"
          element={
            <AppContent
              currentUser={currentUser}
              company={company}
              onUserChange={handleUserChange}
            />
          }
        />
      </Routes>
    </Router>
  );
};

interface AppContentProps {
  currentUser: User | null;
  company: Company | null;
  onUserChange: (user: User | null) => void;
}

const AppContent: React.FC<AppContentProps> = ({ currentUser, company, onUserChange }) => {
  if (!currentUser) {
    return <Login onLogin={onUserChange} />;
  }

  const isDev = currentUser.role === UserRole.DEVELOPER;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <Layout user={currentUser} company={company} onUserChange={onUserChange}>
      <Routes>
        <Route path="/" element={<Navigate to={isDev ? "/developer" : "/dashboard"} replace />} />
        {isDev && (
          <>
            <Route path="/developer" element={<DeveloperPanel />} />
            <Route path="/developer/pagamentos" element={<DeveloperPayments />} />
            <Route path="/developer/configuracoes" element={<DeveloperSettings />} />
            <Route path="/developer/empresa/:id" element={<CompanyManagement />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/relatorios" element={<Reports />} />
          </>
        )}
        {!isDev && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/chat"
              element={company?.settings.enableChat ? <Chat /> : <Navigate to="/dashboard" replace />}
            />
            <Route path="/clientes" element={isAdmin ? <Customers /> : <Navigate to="/dashboard" replace />} />
            <Route path="/clientes/:id" element={isAdmin ? <CustomerDetails /> : <Navigate to="/dashboard" replace />} />
            <Route
              path="/relatorios"
              element={isAdmin && company?.settings.enableAI ? <Reports /> : <Navigate to="/dashboard" replace />}
            />
            <Route path="/ordens" element={<Orders />} />
            <Route path="/ordens/:id" element={<OrderDetails />} />
            <Route path="/usuarios" element={isAdmin ? <Users /> : <Navigate to="/dashboard" replace />} />
            <Route path="/configuracoes" element={isAdmin ? <Settings /> : <Navigate to="/dashboard" replace />} />
          </>
        )}
        <Route path="*" element={<Navigate to={isDev ? "/developer" : "/dashboard"} replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
