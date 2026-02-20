
import React from 'react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    return (
        <div className="landing-container">
            {/* Navbar */}
            <nav className="landing-nav">
                <a href="/" className="nav-logo">
                    <i className="fa-solid fa-folder-tree"></i>
                    <span>OsRepo</span>
                </a>
                <ul className="nav-links">
                    <li><a href="#home">Início</a></li>
                    <li><a href="#about">Sobre</a></li>
                    <li><a href="#audience">Para Quem?</a></li>
                    <li><a href="#benefits">Benefícios</a></li>
                </ul>
                <a href="#/login" className="nav-cta">Acessar Sistema</a>
            </nav>

            {/* Hero Section */}
            <header className="hero" id="home">
                <div className="hero-content">
                    <span className="hero-badge">O Repositório Digital das Suas O.S.</span>
                    <h1>Gerencie Ordens de Serviço com Agilidade, Organização e Controle Total</h1>
                    <p>
                        Transforme a maneira como sua empresa controla atendimentos, técnicos e clientes.
                        Automatize processos, reduza erros e aumente sua produtividade.
                    </p>
                    <div className="hero-btns">
                        <a href="#/login" className="btn-primary"><i className="fa-solid fa-rocket"></i> Solicitar Demonstração</a>
                        <a href="#/login" className="btn-outline">Começar Agora</a>
                        <a href="#/login" className="btn-outline">Testar Gratuitamente</a>
                    </div>
                </div>
                <div className="hero-image">
                    <img
                        src="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=1000"
                        alt="Dashboard OsRepo"
                    />
                </div>
            </header>

            {/* Sobre o Sistema */}
            <section className="about" id="about">
                <div className="section-header">
                    <span className="hero-badge">Sobre o Sistema</span>
                    <h2>Controle Total das Suas Operações</h2>
                    <p>
                        O OsRepo foi desenvolvido para empresas que precisam organizar atendimentos técnicos,
                        serviços externos e todo o controle operacional em um único lugar.
                    </p>
                </div>

                <div className="about-list">
                    <div className="about-item"><i className="fa-solid fa-circle-check"></i> Criar e acompanhar O.S. de forma simples</div>
                    <div className="about-item"><i className="fa-solid fa-circle-check"></i> Gerenciar clientes e históricos completos</div>
                    <div className="about-item"><i className="fa-solid fa-circle-check"></i> Controlar técnicos e equipes externas</div>
                    <div className="about-item"><i className="fa-solid fa-circle-check"></i> Atualizar status em tempo real</div>
                    <div className="about-item"><i className="fa-solid fa-circle-check"></i> Emitir relatórios estratégicos</div>
                    <div className="about-item"><i className="fa-solid fa-circle-check"></i> Armazenar tudo com segurança na nuvem</div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        Chega de planilhas desorganizadas e informações perdidas. <strong>Centralize tudo no OsRepo.</strong>
                    </p>
                </div>
            </section>

            {/* Para Quem é? */}
            <section className="audience" id="audience" style={{ padding: '80px 0' }}>
                <div className="section-header">
                    <h2>Para Quem é o OsRepo?</h2>
                    <p>Se sua empresa trabalha com atendimento técnico ou serviços externos, o OsRepo foi feito para você.</p>
                </div>
                <div className="audience-grid">
                    <div className="audience-card"><i className="fa-solid fa-wrench"></i> Empresas de manutenção</div>
                    <div className="audience-card"><i className="fa-solid fa-screwdriver-wrench"></i> Assistência técnica</div>
                    <div className="audience-card"><i className="fa-solid fa-wifi"></i> Provedores de internet</div>
                    <div className="audience-card"><i className="fa-solid fa-solar-panel"></i> Empresas de energia solar</div>
                    <div className="audience-card"><i className="fa-solid fa-video"></i> Segurança eletrônica</div>
                    <div className="audience-card"><i className="fa-solid fa-user-gear"></i> Técnicos autônomos</div>
                    <div className="audience-card"><i className="fa-solid fa-tower-broadcast"></i> Empresas de telecomunicação</div>
                    <div className="audience-card"><i className="fa-solid fa-users-viewfinder"></i> Gestão de equipes externas</div>
                </div>
            </section>

            {/* Benefícios */}
            <section className="benefits" id="benefits">
                <div className="section-header">
                    <h2>Benefícios do OsRepo</h2>
                </div>
                <div className="benefits-grid">
                    <div className="benefit-card">
                        <i className="fa-solid fa-gauge-high"></i>
                        <h3>Mais Produtividade</h3>
                        <p>Reduza o tempo gasto com planilhas, papéis e controles manuais.</p>
                    </div>
                    <div className="benefit-card">
                        <i className="fa-solid fa-sitemap"></i>
                        <h3>Organização Total</h3>
                        <p>Todas as informações centralizadas em um único sistema.</p>
                    </div>
                    <div className="benefit-card">
                        <i className="fa-solid fa-bell"></i>
                        <h3>Atualizações em Tempo Real</h3>
                        <p>Acompanhe cada etapa da O.S. com total visibilidade.</p>
                    </div>
                    <div className="benefit-card">
                        <i className="fa-solid fa-folder-open"></i>
                        <h3>Histórico Completo</h3>
                        <p>Tenha acesso ao histórico detalhado de cada cliente e atendimento.</p>
                    </div>
                    <div className="benefit-card">
                        <i className="fa-solid fa-cloud-lock"></i>
                        <h3>Segurança de Dados</h3>
                        <p>Sistema 100% em nuvem com armazenamento seguro e confiável.</p>
                    </div>
                </div>
            </section>

            {/* Diferencial */}
            <section className="competitive">
                <div className="section-header">
                    <h2>Diferencial Competitivo</h2>
                    <p>Diferente de sistemas complexos e caros, o OsRepo foi desenvolvido para ser intuitivo e adaptado à sua realidade.</p>
                </div>
                <div className="comp-list">
                    <div className="comp-item"><i className="fa-solid fa-check"></i> Simples de usar</div>
                    <div className="comp-item"><i className="fa-solid fa-check"></i> Intuitivo</div>
                    <div className="comp-item"><i className="fa-solid fa-check"></i> Rápido</div>
                    <div className="comp-item"><i className="fa-solid fa-check"></i> Adaptado ao Brasil</div>
                    <div className="comp-item"><i className="fa-solid fa-check"></i> Ideal para PMEs</div>
                </div>
                <p style={{ marginTop: '2rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>Tecnologia profissional sem complicação.</p>
            </section>

            {/* Seção Final */}
            <section className="final-cta">
                <h2>Comece Agora a Organizar Sua Empresa com o OsRepo</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto' }}>
                    Pare de perder informações, atrasar atendimentos e trabalhar no improviso.
                    Dê o próximo passo para uma gestão mais profissional.
                </p>
                <div className="cta-options">
                    <a href="#/login" className="btn-cta-blue"><i className="fa-solid fa-comments"></i> Solicite uma demonstração gratuita</a>
                    <a href="#/login" className="btn-cta-blue"><i className="fa-solid fa-phone"></i> Fale com nosso time</a>
                    <a href="#/login" className="btn-cta-blue"><i className="fa-solid fa-rocket"></i> Experimente sem compromisso</a>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '50px 10%', textAlign: 'center', borderTop: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                <p>© 2026 OsRepo - Gestão Inteligente de Ordens de Serviço. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
