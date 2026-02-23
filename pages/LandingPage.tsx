import React, { useEffect, useState } from 'react';
import './LandingPage.css';

// Preços padrão (fallback se banco não disponível)
const DEFAULT_PRICING: Record<string, Record<string, { base: number; discount: number }>> = {
    OURO: {
        MENSAL: { base: 97, discount: 0 },
        TRIMESTRAL: { base: 97, discount: 5 },
        SEMESTRAL: { base: 97, discount: 10 },
        ANUAL: { base: 97, discount: 15 },
    },
    DIAMANTE: {
        MENSAL: { base: 197, discount: 0 },
        TRIMESTRAL: { base: 197, discount: 5 },
        SEMESTRAL: { base: 197, discount: 10 },
        ANUAL: { base: 197, discount: 15 },
    },
};

const PERIOD_LABELS: Record<string, { label: string; months: number }> = {
    MENSAL: { label: 'Mensal', months: 1 },
    TRIMESTRAL: { label: 'Trimestral', months: 3 },
    SEMESTRAL: { label: 'Semestral', months: 6 },
    ANUAL: { label: 'Anual', months: 12 },
};

function calcPrice(base: number, discount: number, months: number) {
    const monthly = base * (1 - discount / 100);
    return { monthly: monthly.toFixed(2), total: (monthly * months).toFixed(2) };
}

const LandingPage: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('MENSAL');

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const faqs = [
        { q: 'O OsRepo funciona para qualquer tipo de empresa?', a: 'Sim! O OsRepo foi projetado para qualquer empresa que trabalhe com ordens de serviço: assistências técnicas, provedores de internet, empresas de manutenção, segurança eletrônica, energia solar e muito mais.' },
        { q: 'Preciso instalar algum programa?', a: 'Não! O OsRepo é 100% online (SaaS). Basta ter acesso à internet e um navegador. Funciona no computador, tablet e smartphone.' },
        { q: 'Meus dados ficam seguros?', a: 'Absolutamente. Utilizamos infraestrutura de nível empresarial com criptografia de dados em repouso e em trânsito, backups automáticos e conformidade com a LGPD.' },
        { q: 'Como funciona o período de teste?', a: 'Você pode testar o plano Profissional gratuitamente por 14 dias, sem precisar inserir cartão de crédito. Após o período, escolha o plano que melhor se encaixa na sua operação.' },
        { q: 'Posso migrar meus dados de outro sistema?', a: 'Sim! Nossa equipe oferece suporte dedicado para importação de dados de planilhas e outros sistemas. Entre em contato para entender o processo.' },
        { q: 'Tenho suporte técnico disponível?', a: 'Sim. Todos os planos possuem suporte via chat e e-mail. O plano Enterprise conta com gerente de conta dedicado e SLA prioritário.' },
    ];

    const testimonials = [
        { name: 'Ricardo Matos', role: 'Dono, Matos Assistência Técnica', text: 'Antes do OsRepo, perdia pelo menos 2 horas por dia só organizando as ordens em planilha. Hoje tudo está no sistema e minha equipe é muito mais produtiva.', stars: 5, avatar: 'RM' },
        { name: 'Fernanda Souza', role: 'Gestora Operacional, SpeedNet ISP', text: 'Implantamos em menos de uma semana. A visibilidade que temos agora das OSs em campo é incrível. Recomendo fortemente para outros provedores.', stars: 5, avatar: 'FS' },
        { name: 'Carlos Henrique', role: 'Técnico Autônomo, Eletro Solar CE', text: 'Simples, rápido e profissional. Parece que foi feito especificamente para a minha área. O controle de clientes e histórico de atendimentos me poupou muito tempo.', stars: 5, avatar: 'CH' },
    ];

    return (
        <div className="landing-container">

            {/* Navbar */}
            <nav className={`landing-nav ${scrolled ? 'nav-scrolled' : ''}`}>
                <a href="/" className="nav-logo">
                    <i className="fa-solid fa-folder-tree"></i>
                    <span>OsRepo</span>
                </a>
                <ul className="nav-links">
                    <li><a href="#home">Início</a></li>
                    <li><a href="#how-it-works">Como Funciona</a></li>
                    <li><a href="#benefits">Benefícios</a></li>
                    <li><a href="#pricing">Planos</a></li>
                    <li><a href="#faq">FAQ</a></li>
                </ul>
                <a href="#/login" className="nav-cta"><i className="fa-solid fa-arrow-right-to-bracket"></i> Acessar Sistema</a>
            </nav>

            {/* Hero Section */}
            <header className="hero" id="home">
                <div className="hero-overlay"></div>
                <div className="hero-content-wrapper">
                    <div className="hero-text-content animate-fade-up">
                        <span className="hero-badge">
                            <i className="fa-solid fa-bolt"></i> O REPOSITÓRIO DIGITAL DAS SUAS O.S.
                        </span>
                        <h1>Gerencie Ordens de<br />Serviço com <span className="text-gradient">Agilidade e Controle Total</span></h1>
                        <p className="hero-description">
                            Transforme a maneira como sua empresa controla atendimentos, técnicos e clientes.
                            Automatize processos, reduza erros e aumente sua produtividade no dia a dia.
                        </p>
                        <div className="hero-btns">
                            <a href="#/trial" className="btn-primary btn-large">
                                <i className="fa-solid fa-flask"></i> Testar Gratuitamente
                            </a>
                            <a href="#how-it-works" className="btn-outline btn-large">
                                <i className="fa-solid fa-play"></i> Ver Como Funciona
                            </a>
                        </div>
                        <div className="hero-trust">
                            <span><i className="fa-solid fa-shield-halved"></i> Sem cartão de crédito</span>
                            <span><i className="fa-solid fa-check-circle"></i> 14 dias grátis</span>
                            <span><i className="fa-solid fa-lock"></i> Dados seguros</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Section - Oculto conforme solicitação 
            <section className="stats-section">
                <div className="stats-grid">
                    <div className="stat-card">
                        <i className="fa-solid fa-building stat-icon"></i>
                        <div className="stat-number">+500</div>
                        <div className="stat-label">Empresas Ativas</div>
                    </div>
                    <div className="stat-card">
                        <i className="fa-solid fa-file-signature stat-icon"></i>
                        <div className="stat-number">+10k</div>
                        <div className="stat-label">O.S. Gerenciadas</div>
                    </div>
                    <div className="stat-card">
                        <i className="fa-solid fa-star stat-icon"></i>
                        <div className="stat-number">98%</div>
                        <div className="stat-label">Satisfação dos Clientes</div>
                    </div>
                    <div className="stat-card">
                        <i className="fa-solid fa-gauge-high stat-icon"></i>
                        <div className="stat-number">5 min</div>
                        <div className="stat-label">Para começar a usar</div>
                    </div>
                </div>
            </section>
            */}

            {/* How It Works */}
            <section className="how-it-works" id="how-it-works">
                <div className="section-header center">
                    <span className="section-badge">Como Funciona</span>
                    <h2>Pronto para operar em 3 passos simples</h2>
                    <p>Sem treinamentos longos, sem complicação. Comece a usar o OsRepo hoje mesmo.</p>
                </div>
                <div className="steps-grid">
                    <div className="step-card">
                        <div className="step-number">01</div>
                        <i className="fa-solid fa-user-plus step-icon"></i>
                        <h3>Crie sua Conta</h3>
                        <p>Cadastre sua empresa em menos de 2 minutos. Sem burocracia, sem cartão de crédito.</p>
                    </div>
                    <div className="step-arrow"><i className="fa-solid fa-arrow-right"></i></div>
                    <div className="step-card">
                        <div className="step-number">02</div>
                        <i className="fa-solid fa-sliders step-icon"></i>
                        <h3>Configure sua Equipe</h3>
                        <p>Adicione técnicos, clientes e personalize os status de atendimento de acordo com seu fluxo.</p>
                    </div>
                    <div className="step-arrow"><i className="fa-solid fa-arrow-right"></i></div>
                    <div className="step-card">
                        <div className="step-number">03</div>
                        <i className="fa-solid fa-chart-line step-icon"></i>
                        <h3>Gerencie e Cresça</h3>
                        <p>Emita O.S., acompanhe em tempo real e tome decisões com base em relatórios estratégicos.</p>
                    </div>
                </div>
            </section>

            {/* Para Quem é? */}
            <section className="audience" id="audience">
                <div className="section-header center">
                    <span className="section-badge">Para Quem é o OsRepo?</span>
                    <h2>Feito para empresas que trabalham com serviço externo</h2>
                    <p>Se sua empresa trabalha com atendimento técnico ou serviços externos, o OsRepo foi feito para você.</p>
                </div>
                <div className="audience-grid">
                    <div className="audience-card"><i className="fa-solid fa-wrench"></i> Empresas de manutenção</div>
                    <div className="audience-card"><i className="fa-solid fa-screwdriver-wrench"></i> Assistência técnica</div>
                    <div className="audience-card"><i className="fa-solid fa-wifi"></i> Provedores de internet</div>
                    <div className="audience-card"><i className="fa-solid fa-solar-panel"></i> Empresas de energia solar</div>
                    <div className="audience-card"><i className="fa-solid fa-video"></i> Segurança eletrônica</div>
                    <div className="audience-card"><i className="fa-solid fa-user-gear"></i> Técnicos autônomos</div>
                    <div className="audience-card"><i className="fa-solid fa-tower-broadcast"></i> Telecomunicações</div>
                    <div className="audience-card"><i className="fa-solid fa-users-viewfinder"></i> Gestão de equipes externas</div>
                </div>
            </section>

            {/* Benefícios */}
            <section className="benefits" id="benefits">
                <div className="section-header center">
                    <h2>Tudo que você precisa em um único lugar</h2>
                    <p>Uma plataforma completa, pensada para a realidade das empresas brasileiras de serviços.</p>
                </div>
                <div className="benefits-grid">
                    <div className="benefit-card">
                        <div className="benefit-icon-wrap">
                            <i className="fa-solid fa-gauge-high"></i>
                        </div>
                        <h3>Mais Produtividade</h3>
                        <p>Reduza o tempo gasto com planilhas, papéis e controles manuais. Sua equipe foca no que importa.</p>
                    </div>
                    <div className="benefit-card">
                        <div className="benefit-icon-wrap">
                            <i className="fa-solid fa-sitemap"></i>
                        </div>
                        <h3>Organização Total</h3>
                        <p>Clientes, técnicos, O.S. e históricos centralizados. Chega de informação perdida.</p>
                    </div>
                    <div className="benefit-card">
                        <div className="benefit-icon-wrap">
                            <i className="fa-solid fa-bell"></i>
                        </div>
                        <h3>Tempo Real</h3>
                        <p>Acompanhe cada etapa da O.S. com total visibilidade. Status atualizados ao vivo.</p>
                    </div>
                    <div className="benefit-card">
                        <div className="benefit-icon-wrap">
                            <i className="fa-solid fa-folder-open"></i>
                        </div>
                        <h3>Histórico Completo</h3>
                        <p>Acesse o histórico detalhado de cada cliente e atendimento com um clique.</p>
                    </div>
                    <div className="benefit-card">
                        <div className="benefit-icon-wrap">
                            <i className="fa-solid fa-shield-halved"></i>
                        </div>
                        <h3>Segurança de Dados</h3>
                        <p>100% na nuvem, backup automático, criptografia e conformidade com a LGPD.</p>
                    </div>
                    <div className="benefit-card">
                        <div className="benefit-icon-wrap">
                            <i className="fa-solid fa-chart-bar"></i>
                        </div>
                        <h3>Relatórios Estratégicos</h3>
                        <p>Dashboards e relatórios para tomar decisões baseadas em dados reais do seu negócio.</p>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="pricing" id="pricing">
                <div className="section-header center">
                    <span className="section-badge">Planos e Preços</span>
                    <h2>Escolha o plano ideal para sua empresa</h2>
                    <p>Pague pelo período que preferir e economize até 15% nos planos anuais.</p>
                </div>

                {/* Period Toggle */}
                <div className="pricing-period-toggle">
                    {Object.entries(PERIOD_LABELS).map(([key, { label }]) => (
                        <button
                            key={key}
                            className={`period-btn ${selectedPeriod === key ? 'active' : ''}`}
                            onClick={() => setSelectedPeriod(key)}
                        >
                            {label}
                            {key !== 'MENSAL' && (
                                <span className="period-discount">-{DEFAULT_PRICING.OURO[key].discount}%</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="pricing-grid">
                    {/* Plano Ouro */}
                    {(() => {
                        const p = DEFAULT_PRICING.OURO[selectedPeriod];
                        const { monthly, total } = calcPrice(p.base, p.discount, PERIOD_LABELS[selectedPeriod].months);
                        return (
                            <div className="pricing-card">
                                <div className="pricing-plan-icon"><i className="fa-solid fa-circle-dot" style={{ color: '#F5A623' }}></i></div>
                                <div className="pricing-plan-name">Ouro</div>
                                <p className="pricing-desc">Ideal para pequenas empresas e profissionais autônomos.</p>
                                <div className="pricing-price">
                                    <span className="price-currency">R$</span>
                                    <span className="price-value">{monthly.replace('.', ',')}</span>
                                    <span className="price-period">/mês</span>
                                </div>
                                {selectedPeriod !== 'MENSAL' && (
                                    <p className="price-total-note">Total de R$ {total.replace('.', ',')} por {PERIOD_LABELS[selectedPeriod].months} meses</p>
                                )}
                                <ul className="pricing-features">
                                    <li><i className="fa-solid fa-check"></i> Até 2 administradores</li>
                                    <li><i className="fa-solid fa-check"></i> Usuários técnicos ilimitados</li>
                                    <li><i className="fa-solid fa-check"></i> Gestão completa de O.S.</li>
                                    <li><i className="fa-solid fa-check"></i> Histórico de clientes</li>
                                    <li><i className="fa-solid fa-check"></i> Suporte via chat</li>
                                    <li className="disabled"><i className="fa-solid fa-xmark"></i> Relatórios com IA</li>
                                </ul>
                                <a href="#/trial" className="btn-pricing-outline">Começar Agora</a>
                            </div>
                        );
                    })()}

                    {/* Plano Diamante */}
                    {(() => {
                        const p = DEFAULT_PRICING.DIAMANTE[selectedPeriod];
                        const { monthly, total } = calcPrice(p.base, p.discount, PERIOD_LABELS[selectedPeriod].months);
                        return (
                            <div className="pricing-card featured">
                                <div className="pricing-badge-popular">⭐ Mais Popular</div>
                                <div className="pricing-plan-icon"><i className="fa-solid fa-gem" style={{ color: '#60C0E0' }}></i></div>
                                <div className="pricing-plan-name">Diamante</div>
                                <p className="pricing-desc">Para empresas em crescimento que precisam do máximo.</p>
                                <div className="pricing-price">
                                    <span className="price-currency">R$</span>
                                    <span className="price-value">{monthly.replace('.', ',')}</span>
                                    <span className="price-period">/mês</span>
                                </div>
                                {selectedPeriod !== 'MENSAL' && (
                                    <p className="price-total-note">Total de R$ {total.replace('.', ',')} por {PERIOD_LABELS[selectedPeriod].months} meses</p>
                                )}
                                <ul className="pricing-features">
                                    <li><i className="fa-solid fa-check"></i> Até 5 administradores</li>
                                    <li><i className="fa-solid fa-check"></i> Usuários ilimitados</li>
                                    <li><i className="fa-solid fa-check"></i> O.S. ilimitadas</li>
                                    <li><i className="fa-solid fa-check"></i> Relatórios com IA</li>
                                    <li><i className="fa-solid fa-check"></i> Anexos em O.S.</li>
                                    <li><i className="fa-solid fa-check"></i> Suporte prioritário</li>
                                </ul>
                                <a href="#/trial" className="btn-pricing-primary">Testar Agora</a>
                            </div>
                        );
                    })()}

                    {/* Plano Custom */}
                    <div className="pricing-card">
                        <div className="pricing-plan-icon"><i className="fa-solid fa-star" style={{ color: '#9B59B6' }}></i></div>
                        <div className="pricing-plan-name">Custom</div>
                        <p className="pricing-desc">Para grandes operações com necessidades customizadas.</p>
                        <div className="pricing-price enterprise-price">
                            <span className="price-value">Sob Consulta</span>
                        </div>
                        <ul className="pricing-features">
                            <li><i className="fa-solid fa-check"></i> Administradores ilimitados</li>
                            <li><i className="fa-solid fa-check"></i> Criação de admins pelo próprio admin</li>
                            <li><i className="fa-solid fa-check"></i> Tudo do plano Diamante</li>
                            <li><i className="fa-solid fa-check"></i> SLA garantido</li>
                            <li><i className="fa-solid fa-check"></i> Onboarding personalizado</li>
                            <li><i className="fa-solid fa-check"></i> Gerente de conta dedicado</li>
                        </ul>
                        <a href="#/login" className="btn-pricing-outline">Falar com Especialista</a>
                    </div>
                </div>
            </section>

            {/* Testimonials - Oculto conforme solicitação 
            <section className="testimonials">
                <div className="section-header center">
                    <span className="section-badge">Depoimentos</span>
                    <h2>Quem usa, recomenda</h2>
                    <p>Veja o que nossos clientes dizem sobre o OsRepo.</p>
                </div>
                <div className="testimonials-grid">
                    {testimonials.map((t, i) => (
                        <div className="testimonial-card" key={i}>
                            <div className="testimonial-stars">
                                {'⭐'.repeat(t.stars)}
                            </div>
                            <p className="testimonial-text">"{t.text}"</p>
                            <div className="testimonial-author">
                                <div className="testimonial-avatar">{t.avatar}</div>
                                <div>
                                    <div className="testimonial-name">{t.name}</div>
                                    <div className="testimonial-role">{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            */}

            {/* FAQ */}
            <section className="faq" id="faq">
                <div className="section-header center">
                    <span className="section-badge">Dúvidas Frequentes</span>
                    <h2>Perguntas Frequentes</h2>
                    <p>Tire suas dúvidas antes de começar.</p>
                </div>
                <div className="faq-list">
                    {faqs.map((faq, i) => (
                        <div className={`faq-item ${openFaq === i ? 'open' : ''}`} key={i}>
                            <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                                <span>{faq.q}</span>
                                <i className={`fa-solid fa-chevron-down faq-icon`}></i>
                            </button>
                            <div className="faq-answer">
                                <p>{faq.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta">
                <div className="cta-bg-glow"></div>
                <div className="final-cta-content">
                    <span className="section-badge">Pronto para começar?</span>
                    <h2>Dê o próximo passo para uma gestão mais profissional</h2>
                    <p>Pare de perder informações e atrasar atendimentos. Comece a usar o OsRepo hoje, gratuitamente.</p>
                    <div className="cta-options">
                        <a href="#/trial" className="btn-primary btn-large">
                            <i className="fa-solid fa-flask"></i> Testar Grátis por 14 dias
                        </a>
                        <a href="#/login" className="btn-outline btn-large">
                            <i className="fa-solid fa-comments"></i> Solicitar Demonstração
                        </a>
                    </div>
                    <div className="hero-trust" style={{ justifyContent: 'center', marginTop: '2rem' }}>
                        <span><i className="fa-solid fa-shield-halved"></i> Sem cartão de crédito</span>
                        <span><i className="fa-solid fa-check-circle"></i> Cancelamento a qualquer momento</span>
                        <span><i className="fa-solid fa-headset"></i> Suporte incluso</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <a href="/" className="nav-logo" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
                            <i className="fa-solid fa-folder-tree"></i>
                            <span>OsRepo</span>
                        </a>
                        <p>Gestão inteligente de Ordens de Serviço para empresas que querem crescer com organização e controle.</p>
                        <div className="footer-social">
                            <a href="#" aria-label="WhatsApp"><i className="fa-brands fa-whatsapp"></i></a>
                            <a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a>
                            <a href="#" aria-label="LinkedIn"><i className="fa-brands fa-linkedin"></i></a>
                        </div>
                    </div>
                    <div className="footer-col">
                        <h4>Produto</h4>
                        <ul>
                            <li><a href="#how-it-works">Como Funciona</a></li>
                            <li><a href="#benefits">Benefícios</a></li>
                            <li><a href="#pricing">Planos e Preços</a></li>
                            <li><a href="#faq">FAQ</a></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4>Empresa</h4>
                        <ul>
                            <li><a href="#about">Sobre nós</a></li>
                            <li><a href="#/login">Acessar Sistema</a></li>
                            <li><a href="#/login">Criar Conta</a></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4>Contato</h4>
                        <ul>
                            <li><i className="fa-solid fa-envelope"></i> contato@osrepo.com.br</li>
                            <li><i className="fa-brands fa-whatsapp"></i> (XX) XXXXX-XXXX</li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 OsRepo — Gestão Inteligente de Ordens de Serviço. Todos os direitos reservados.</p>
                    <div className="footer-legal">
                        <a href="#">Política de Privacidade</a>
                        <a href="#">Termos de Uso</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
