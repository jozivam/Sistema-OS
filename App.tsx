import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { storageService } from './services/storageService';
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

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      const data = storageService.getData();
      if (data.currentUser) {
        setCurrentUser(data.currentUser);

        // Tentar buscar empresas atualizadas do Supabase
        try {
          const supabaseCompanies = await dbService.getCompanies();
          if (supabaseCompanies.length > 0) {
            const updatedData = { ...data, companies: supabaseCompanies };
            storageService.saveData(updatedData);
            // Isso garantirá que o resto do sistema use os dados do banco
          }
        } catch (err) {
          console.warn('Supabase não disponível ainda ou erro de conexão:', err);
        }
      }
      setLoading(false);
    };

    initApp();
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

  if (!currentUser) {
    return <Login onLogin={handleUserChange} />;
  }

  const data = storageService.getData();
  const company = currentUser.companyId ? data.companies.find(c => c.id === currentUser.companyId) : null;
  const isDev = currentUser.role === UserRole.DEVELOPER;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <Router>
      <Layout user={currentUser} onUserChange={handleUserChange}>
        <Routes>
          {/* Rota inicial condicional */}
          <Route path="/" element={<Navigate to={isDev ? "/developer" : "/dashboard"} replace />} />

          {/* Rotas de Desenvolvedor */}
          {isDev && (
            <>
              <Route path="/developer" element={<DeveloperPanel />} />
              <Route path="/developer/pagamentos" element={<DeveloperPayments />} />
              <Route path="/developer/configuracoes" element={<DeveloperSettings />} />
              <Route path="/developer/empresa/:id" element={<CompanyManagement />} />
              {/* Dev pode acessar tudo para suporte */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/relatorios" element={<Reports />} />
            </>
          )}

          {/* Rotas de Empresa */}
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
    </Router>
  );
};

export default App;
