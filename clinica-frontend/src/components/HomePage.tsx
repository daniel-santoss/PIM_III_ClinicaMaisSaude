import { useState, useEffect } from "react";
import { Menu, X, Plus, Heart, Calendar, Shield, Activity, Stethoscope, Droplet, HeartPulse } from "lucide-react";

export default function HomePage({
  logo = "/src/assets/logo_clinica.png",
  logoBranca = "/src/assets/logo_clinica_branca.png",
  banner = "/src/assets/banner.jpeg",
  banner2 = "/src/assets/banner2.jpeg",
  banner3 = "/src/assets/banner3.jpeg"
}: {
  logo?: string;
  logoBranca?: string;
  banner?: string;
  banner2?: string;
  banner3?: string;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [slideAtual, setSlideAtual] = useState(0);

  const slides = [
    {
      titulo: "Equipe Médica Qualificada",
      texto: "Profissionais altamente qualificados e dedicados ao seu bem-estar",
      botao: "Conheça nossa equipe",
      link: "#sobre",
      imagem: banner3
    },
    {
      titulo: "Cuidamos da sua saúde com dedicação",
      texto: "Atendimento humanizado com profissionais especializados",
      botao: "Agende sua consulta",
      link: "/login",
      imagem: banner
    },
    {
      titulo: "Mais de 20 especialidades médicas",
      texto: "Do clínico geral ao especialista, estamos aqui para você",
      botao: "Conheça nossos serviços",
      link: "#servicos",
      imagem: banner2
    }
  ];

  useEffect(() => {
    const intervalo = setInterval(() => {
      setSlideAtual((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(intervalo);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* 1. NAVBAR */}
      <nav className="relative z-50 flex justify-center px-6 sm:px-8 lg:px-12 pt-6 w-full">
        <div className="bg-white shadow-sm w-full max-w-7xl rounded-2xl md:rounded-full border border-gray-100">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Clínica Mais Saúde" className="h-10 md:h-12 w-auto object-contain" />
                <span className="text-xl font-bold text-gray-900">Clínica Mais Saúde</span>
              </div>

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-8">
                <a href="#" className="text-gray-600 hover:text-[#7C3AED] font-medium transition-colors">Início</a>
                <a href="#servicos" className="text-gray-600 hover:text-[#7C3AED] font-medium transition-colors">Serviços</a>
                <a href="#sobre" className="text-gray-600 hover:text-[#7C3AED] font-medium transition-colors">Sobre Nós</a>
                <a href="#contato" className="text-gray-600 hover:text-[#7C3AED] font-medium transition-colors">Contato</a>
                <a href="/login" className="bg-[#7C3AED] text-white px-6 py-2.5 rounded-full font-medium hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg">
                  Agendar Consulta
                </a>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center">
                <button onClick={() => setMenuAberto(!menuAberto)} className="text-gray-600 hover:text-[#7C3AED] transition-colors p-2">
                  {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {menuAberto && (
            <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute left-4 right-4 top-24 rounded-2xl p-4 space-y-2 z-50 border border-gray-100">
              <a href="#" className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#7C3AED] hover:bg-purple-50 rounded-md">Início</a>
              <a href="#servicos" className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#7C3AED] hover:bg-purple-50 rounded-md">Serviços</a>
              <a href="#sobre" className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#7C3AED] hover:bg-purple-50 rounded-md">Sobre Nós</a>
              <a href="#contato" className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#7C3AED] hover:bg-purple-50 rounded-md">Contato</a>
              <a href="/login" className="block w-full text-center mt-4 bg-[#7C3AED] text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700">
                Agendar Consulta
              </a>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-grow pt-2">
        {/* 2. HERO COM CARROSSEL */}
        <section className="relative overflow-hidden min-h-[550px] lg:h-[650px] flex items-center mx-6 sm:mx-8 lg:mx-12 my-6 rounded-3xl border-2 border-white shadow-xl">
          {/* Imagens de Fundo com Transição Suave (Cross-Fade) */}
          <div className="absolute inset-0 z-0">
            {slides.map((slide, index) => (
              <img
                key={index}
                src={slide.imagem}
                alt={`Slide ${index + 1}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === slideAtual ? 'opacity-100' : 'opacity-0'
                  }`}
              />
            ))}
            {/* Overlay escuro sutil para garantir a legibilidade do texto sem esbranquiçar a imagem */}
            <div className="absolute inset-0 bg-black/45" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
            <div className="max-w-2xl sm:text-center lg:text-left min-h-[280px] md:min-h-[240px] relative">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`transition-all duration-1000 ease-in-out ${index === slideAtual
                      ? 'opacity-100 translate-y-0 relative z-10'
                      : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
                    }`}
                >
                  <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-4xl leading-tight">
                    <span className="block">{slide.titulo}</span>
                  </h1>
                  <p className="mt-4 text-base text-gray-200 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0 font-medium">
                    {slide.texto}
                  </p>
                  <div className="mt-6 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                    <a
                      href={slide.link}
                      className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-base font-medium rounded-full text-white bg-transparent hover:shadow-[0_0_20px_rgba(255,255,255,0.65)] transition-all duration-300 md:py-3.5 md:text-lg md:px-10"
                    >
                      {slide.botao}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controles Laterais (Setas) */}
          <button
            onClick={() => setSlideAtual((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/60 text-white hover:text-gray-900 shadow-md backdrop-blur-sm transition-all z-20 flex items-center justify-center border-none cursor-pointer"
            aria-label="Anterior"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <button
            onClick={() => setSlideAtual((prev) => (prev + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/60 text-white hover:text-gray-900 shadow-md backdrop-blur-sm transition-all z-20 flex items-center justify-center border-none cursor-pointer"
            aria-label="Próximo"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>

          {/* Indicadores do Carrossel (Bolinhas na base) */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideAtual(i)}
                className={`w-3 h-3 rounded-full transition-colors ${i === slideAtual ? 'bg-[#7C3AED]' : 'bg-white/50 hover:bg-white'}`}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
          </div>
        </section>

        {/* 3. DESTAQUES */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: <Heart className="w-8 h-8 text-[#7C3AED]" />, title: "Atendimento Humanizado", desc: "Cuidado centrado no paciente com empatia e respeito." },
                { icon: <Calendar className="w-8 h-8 text-[#7C3AED]" />, title: "Agendamento Fácil", desc: "Plataforma digital intuitiva para marcar suas consultas." },
                { icon: <Shield className="w-8 h-8 text-[#7C3AED]" />, title: "Tecnologia Avançada", desc: "Prontuário eletrônico seguro e integrado para sua saúde." }
              ].map((item, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-purple-200 flex flex-col items-center text-center group">
                  <div className="p-4 bg-purple-50 rounded-full mb-6 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. ESPECIALIDADES */}
        <section id="servicos" className="py-20 bg-white mx-6 sm:mx-8 lg:mx-12 rounded-3xl border border-gray-100 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Nossas Especialidades</h2>
              <p className="mt-4 text-xl text-gray-500">Corpo clínico altamente qualificado para cuidar de você.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <Stethoscope />, title: "Clínica Geral" },
                { icon: <HeartPulse />, title: "Cardiologia" },
                { icon: <Activity />, title: "Pediatria" },
                { icon: <Plus />, title: "Ginecologia" },
                { icon: <Shield />, title: "Ortopedia" },
                { icon: <Droplet />, title: "Dermatologia" }
              ].map((item, i) => (
                <div key={i} className="group p-6 bg-white rounded-2xl shadow-sm hover:shadow-md hover:bg-[#EDE9FE] transition-all cursor-pointer border border-gray-100 hover:border-purple-200">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#7C3AED] mb-6 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <div className="flex items-center text-[#7C3AED] font-medium mt-4">
                    Saiba mais <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. BANNER CTA */}
        <section className="bg-[#7C3AED] py-20 mx-6 sm:mx-8 lg:mx-12 rounded-3xl shadow-xl text-white relative overflow-hidden my-12">
          {/* Círculos decorativos sutis em background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl lg:text-4xl font-extrabold leading-tight tracking-tight max-w-2xl text-white">
              Pronto para cuidar da sua saúde?
            </h2>
            <p className="mt-4 text-white text-lg sm:text-xl font-medium max-w-xl leading-relaxed">
              Agende sua consulta em poucos minutos ou acesse nosso portal exclusivo para pacientes.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
              <a
                href="#contato"
                className="px-8 py-4 bg-white text-[#7C3AED] font-bold rounded-full hover:bg-purple-50 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                Entrar em Contato
              </a>
              <a
                href="/login"
                className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center"
              >
                Acessar Portal
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 6. FOOTER */}
      <footer id="contato" className="bg-[#1F2937] text-gray-300 py-16 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Coluna 1: Branding */}
            <div className="flex flex-col items-center md:items-start md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src={logoBranca} alt="Clínica Mais Saúde" className="h-10 w-auto object-contain" />
                <span className="text-xl font-bold text-white tracking-tight">Clínica Mais Saúde</span>
              </div>
              <p className="text-gray-400 text-sm text-center md:text-left leading-relaxed">
                Oferecemos cuidado de alta qualidade e atendimento humanizado para toda a sua família. Nossa prioridade é você.
              </p>
            </div>

            {/* Coluna 2: Links Rápidos */}
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Navegação</h3>
              <ul className="space-y-3 text-center md:text-left text-sm text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Início</a></li>
                <li><a href="#servicos" className="hover:text-white transition-colors">Serviços</a></li>
                <li><a href="#sobre" className="hover:text-white transition-colors">Sobre Nós</a></li>
                <li><a href="/login" className="hover:text-white transition-colors">Acessar Portal</a></li>
              </ul>
            </div>

            {/* Coluna 3: Horário de Funcionamento */}
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Funcionamento</h3>
              <ul className="space-y-3 text-center md:text-left text-sm text-gray-300">
                <li>Segunda a Sexta: 8h às 18h</li>
                <li>Sábados e Domingos: Fechado</li>
              </ul>
            </div>

            {/* Coluna 4: Contato */}
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contato</h3>
              <ul className="space-y-3 text-center md:text-left text-sm text-gray-300">
                <li className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="font-semibold text-white">Telefone:</span> (11) 4002-8922
                </li>
                <li className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="font-semibold text-white">Email:</span> contato@maissaude.com.br
                </li>
                <li className="flex items-center gap-2 justify-center md:justify-start text-xs leading-relaxed max-w-[200px] text-center md:text-left text-gray-400">
                  Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} Clínica Mais Saúde. Todos os direitos reservados.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
