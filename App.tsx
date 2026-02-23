
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';
import { dbService } from './services/dbService';
import { isTrialUser, getTrialCompany, cleanupTrial } from './services/trialService';
import { User, UserRole, Company } from './types';

// Components
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import TrialPage from './pages/TrialPage';
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
import LandingPage from './pages/LandingPage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          if (isTrialUser(user)) {
            // Sessão trial: carregar company do sessionStorage
            setCurrentUser(user);
            setCompany(getTrialCompany());
          } else {
            const result = await authService.validateSession(user);

            if (result.valid) {
              setCurrentUser(user);
              if (user.companyId) {
                const companyData = await dbService.getCompany(user.companyId);
                setCompany(companyData);
              }
            } else {
              authService.signOut();
              setCurrentUser(null);
              if (result.reason === 'concurrent_session') {
                setSessionError('Este usuário já está em uso em outro dispositivo. Faça login novamente.');
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Sessão: sem polling automático.
  // Desconexão só ocorre por ação explícita do Desenvolvedor (botão na tela de Usuários).


  const handleUserChange = async (user: User | null) => {
    setCurrentUser(user);
    setSessionError(null);

    if (user === null) {
      // Se estava em trial, limpa o sessionStorage
      cleanupTrial();
      setCompany(null);
      return;
    }

    if (isTrialUser(user)) {
      // Usuário trial: company vem do sessionStorage
      setCompany(getTrialCompany());
      return;
    }

    if (user?.companyId) {
      try {
        const companyData = await dbService.getCompany(user.companyId);
        setCompany(companyData);
      } catch (error) {
        console.error("Erro ao carregar dados da empresa após login:", error);
      }
    } else {
      setCompany(null);
    }
  };

  const handleCompanyChange = (newCompany: Company | null) => {
    setCompany(newCompany);
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
        <Route
          path="*"
          element={
            <AppContent
              currentUser={currentUser}
              company={company}
              onUserChange={handleUserChange}
              onCompanyChange={handleCompanyChange}
              sessionError={sessionError}
              onClearSessionError={() => setSessionError(null)}
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
  onCompanyChange: (company: Company | null) => void;
  sessionError: string | null;
  onClearSessionError: () => void;
}

const AppContent: React.FC<AppContentProps> = ({ currentUser, company, onUserChange, onCompanyChange, sessionError, onClearSessionError }) => {
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <Login
              onLogin={onUserChange}
              sessionError={sessionError}
              onClearSessionError={onClearSessionError}
            />
          }
        />
        <Route path="/trial" element={<TrialPage onLogin={onUserChange} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const isDev = currentUser.role === UserRole.DEVELOPER;
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isTrial = isTrialUser(currentUser);

  return (
    <Layout
      user={currentUser}
      company={company}
      onUserChange={onUserChange}
      onCompanyChange={onCompanyChange}
    >
      <Routes>
        <Route path="/" element={<Navigate to={isDev ? "/developer" : "/dashboard"} replace />} />

        {/* ─── Rotas Desenvolvedor ─── */}
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

        {/* ─── Rotas Normais + Trial ─── */}
        {!isDev && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/chat"
              element={company?.settings.enableChat ? <Chat company={company} /> : <Navigate to="/dashboard" replace />}
            />
            <Route path="/clientes" element={(isAdmin || isTrial) ? <Customers /> : <Navigate to="/dashboard" replace />} />
            <Route path="/clientes/:id" element={(isAdmin || isTrial) ? <CustomerDetails /> : <Navigate to="/dashboard" replace />} />
            <Route
              path="/relatorios"
              element={(isAdmin || isTrial) && company?.settings.enableAI ? <Reports /> : <Navigate to="/dashboard" replace />}
            />
            <Route path="/ordens" element={<Orders />} />
            <Route path="/ordens/:id" element={<OrderDetails />} />
            <Route path="/usuarios" element={(isAdmin || isTrial) ? <Users /> : <Navigate to="/dashboard" replace />} />
            <Route
              path="/configuracoes"
              element={(isAdmin || isTrial) ? <Settings company={company} onCompanyChange={onCompanyChange} /> : <Navigate to="/dashboard" replace />}
            />
          </>
        )}

        <Route path="*" element={<Navigate to={isDev ? "/developer" : "/dashboard"} replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
