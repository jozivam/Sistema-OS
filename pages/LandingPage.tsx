import React, { useEffect, useState } from 'react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const slides = [
        '/assets/slide1.png',
        '/assets/slide2.png',
        '/assets/slide3.png',
        '/assets/slide4.png'
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

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
                <div className="hero-bg-orb orb-1"></div>
                <div className="hero-bg-orb orb-2"></div>
                <div className="hero-content animate-fade-up">
                    <span className="hero-badge">
                        <i className="fa-solid fa-bolt"></i> O Repositório Digital das Suas O.S.
                    </span>
                    <h1>Gerencie Ordens de Serviço com <span className="text-gradient">Agilidade e Controle Total</span></h1>
                    <p>
                        Transforme a maneira como sua empresa controla atendimentos, técnicos e clientes.
                        Automatize processos, reduza erros e aumente sua produtividade do dia 1.
                    </p>
                    <div className="hero-btns">
                        <a href="#/login" className="btn-primary">
                            <i className="fa-solid fa-rocket"></i> Testar Gratuitamente
                        </a>
                        <a href="#how-it-works" className="btn-outline">
                            <i className="fa-solid fa-play"></i> Ver Como Funciona
                        </a>
                    </div>
                    <div className="hero-trust">
                        <span><i className="fa-solid fa-shield-halved"></i> Sem cartão de crédito</span>
                        <span><i className="fa-solid fa-check-circle"></i> 14 dias grátis</span>
                        <span><i className="fa-solid fa-lock"></i> Dados seguros</span>
                    </div>
                </div>
                <div className="hero-image animate-fade-left">
                    <div className="hero-mockup-frame">
                        <div className="mockup-bar">
                            <span></span><span></span><span></span>
                        </div>
                        <div className="slideshow-container">
                            {slides.map((slide, index) => (
                                <img
                                    key={index}
                                    src={slide}
                                    alt={`Técnico OsRepo Slide ${index + 1}`}
                                    className={`slide-img ${currentSlide === index ? 'active' : ''}`}
                                />
                            ))}
                        </div>
                        <div className="slide-indicators">
                            {slides.map((_, index) => (
                                <span
                                    key={index}
                                    className={`indicator ${currentSlide === index ? 'active' : ''}`}
                                    onClick={() => setCurrentSlide(index)}
                                ></span>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Section */}
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
                    <span className="section-badge">Benefícios</span>
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
                            <i className="fa-solid fa-cloud-lock"></i>
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
                    <p>Comece gratuitamente e escale conforme crescer. Cancele quando quiser.</p>
                </div>
                <div className="pricing-grid">
                    <div className="pricing-card">
                        <div className="pricing-plan-name">Básico</div>
                        <div className="pricing-price">
                            <span className="price-currency">R$</span>
                            <span className="price-value">97</span>
                            <span className="price-period">/mês</span>
                        </div>
                        <p className="pricing-desc">Ideal para autônomos e pequenas equipes.</p>
                        <ul className="pricing-features">
                            <li><i className="fa-solid fa-check"></i> Até 3 usuários</li>
                            <li><i className="fa-solid fa-check"></i> 200 O.S./mês</li>
                            <li><i className="fa-solid fa-check"></i> Gestão de clientes</li>
                            <li><i className="fa-solid fa-check"></i> Suporte por e-mail</li>
                            <li className="disabled"><i className="fa-solid fa-xmark"></i> Relatórios avançados</li>
                            <li className="disabled"><i className="fa-solid fa-xmark"></i> API de integração</li>
                        </ul>
                        <a href="#/login" className="btn-pricing-outline">Começar Agora</a>
                    </div>

                    <div className="pricing-card featured">
                        <div className="pricing-badge-popular">⭐ Mais Popular</div>
                        <div className="pricing-plan-name">Profissional</div>
                        <div className="pricing-price">
                            <span className="price-currency">R$</span>
                            <span className="price-value">197</span>
                            <span className="price-period">/mês</span>
                        </div>
                        <p className="pricing-desc">Para empresas em crescimento que precisam do máximo.</p>
                        <ul className="pricing-features">
                            <li><i className="fa-solid fa-check"></i> Usuários ilimitados</li>
                            <li><i className="fa-solid fa-check"></i> O.S. ilimitadas</li>
                            <li><i className="fa-solid fa-check"></i> Relatórios avançados</li>
                            <li><i className="fa-solid fa-check"></i> Chat IA integrado</li>
                            <li><i className="fa-solid fa-check"></i> Suporte prioritário</li>
                            <li className="disabled"><i className="fa-solid fa-xmark"></i> API de integração</li>
                        </ul>
                        <a href="#/login" className="btn-pricing-primary">Testar 14 dias grátis</a>
                    </div>

                    <div className="pricing-card">
                        <div className="pricing-plan-name">Enterprise</div>
                        <div className="pricing-price enterprise-price">
                            <span className="price-value">Sob consulta</span>
                        </div>
                        <p className="pricing-desc">Para grandes operações com necessidades customizadas.</p>
                        <ul className="pricing-features">
                            <li><i className="fa-solid fa-check"></i> Tudo do Profissional</li>
                            <li><i className="fa-solid fa-check"></i> API de integração</li>
                            <li><i className="fa-solid fa-check"></i> White-label disponível</li>
                            <li><i className="fa-solid fa-check"></i> SLA garantido</li>
                            <li><i className="fa-solid fa-check"></i> Gerente dedicado</li>
                            <li><i className="fa-solid fa-check"></i> Onboarding personalizado</li>
                        </ul>
                        <a href="#/login" className="btn-pricing-outline">Falar com Especialista</a>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
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
                        <a href="#/login" className="btn-primary btn-large">
                            <i className="fa-solid fa-rocket"></i> Testar Grátis por 14 dias
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
