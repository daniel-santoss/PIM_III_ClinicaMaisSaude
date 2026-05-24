import { X, ShieldCheck, FileText } from 'lucide-react';
import { useScrollBlock } from "../hooks/useScrollBlock";
import { CLINIC_NAME } from '../constants/clinic';

interface ModalTermosPoliticaProps {
  tipo: 'termos' | 'privacidade' | null;
  onFechar: () => void;
}

export default function ModalTermosPolitica({ tipo, onFechar }: ModalTermosPoliticaProps) {
  useScrollBlock(!!tipo);

  if (!tipo) return null;

  const isTermos = tipo === 'termos';

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:rounded-2xl sm:max-w-2xl shadow-xl flex flex-col sm:max-h-[85vh] rounded-none overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in duration-300">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-purple-100 text-[#7C3AED]">
              {isTermos ? <FileText className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              {isTermos ? 'Termos de Uso' : 'Políticas de Privacidade'}
            </h3>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar text-gray-700 space-y-6">
          {isTermos ? (
            <>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">1. Aceitação dos Termos</h4>
                <p className="text-sm leading-relaxed">
                  Ao acessar e utilizar o sistema e site da {CLINIC_NAME}, você concorda em cumprir e ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">2. Cadastro, Análise e Veracidade dos Dados</h4>
                <p className="text-sm leading-relaxed mb-3">
                  Para a ativação da conta de Paciente, é obrigatório o comparecimento presencial do titular na clínica para entrega de documentos. Após o comparecimento físico, o cadastro entrará em um período de <strong>análise clínica e administrativa</strong> prévia à liberação do acesso.
                </p>
                <p className="text-sm leading-relaxed mb-3">
                  Como requisito de segurança clínica, o Paciente tem a obrigação legal de <strong>informar detalhadamente todas as suas doenças preexistentes, comorbidades e fornecer os laudos médicos comprobatórios correspondentes</strong>.
                </p>
                <p className="text-sm leading-relaxed">
                  O fornecimento de informações clínicas incompletas, omissões deliberadas de doenças ou a falsificação de laudos constituem violação grave de segurança, resultando no <strong>indeferimento da análise ou suspensão imediata do acesso</strong>.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">3. Uso dos Serviços</h4>
                <p className="text-sm leading-relaxed mb-2">
                  O portal destina-se ao agendamento de consultas, visualização de histórico de atendimento e interação segura. É terminantemente proibido:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600">
                  <li>Fornecer informações falsas durante o cadastro ou agendamento;</li>
                  <li>Tentar burlar os sistemas de segurança ou auditoria da clínica;</li>
                  <li>Omitir deliberadamente condições graves de saúde ou laudos médicos obrigatórios;</li>
                  <li>Utilizar a plataforma para fins ilícitos ou não autorizados.</li>
                </ul>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">4. Agendamentos e Cancelamentos</h4>
                <p className="text-sm leading-relaxed">
                  Os agendamentos realizados pelo portal estão sujeitos a confirmação operacional. Solicitamos que cancelamentos ou remarcações sejam feitos com pelo menos 24 horas de antecedência. Faltas recorrentes sem aviso prévio podem impactar a prioridade de futuros agendamentos e gerar alertas no prontuário.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">5. Propriedade Intelectual</h4>
                <p className="text-sm leading-relaxed">
                  Todo o conteúdo presente no portal (textos, imagens, algoritmos de triagem, logotipos) é de propriedade exclusiva da {CLINIC_NAME} e está protegido pelas leis de propriedade intelectual. A reprodução não autorizada é estritamente proibida.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">1. Compromisso com a Privacidade</h4>
                <p className="text-sm leading-relaxed">
                  A {CLINIC_NAME} valoriza profundamente a sua privacidade e compreende a extrema sensibilidade dos dados de saúde. Esta política descreve como tratamos suas informações em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">2. Coleta de Dados Clínicos e de Identificação</h4>
                <p className="text-sm leading-relaxed mb-2">
                  Coletamos apenas as informações estritamente necessárias para garantir a sua segurança clínica e processar a análise prévia do seu cadastro:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600">
                  <li><strong>Dados de Identificação:</strong> Nome completo, CPF, RG, data de nascimento e documentos de identificação física.</li>
                  <li><strong>Dados de Contato:</strong> E-mail, telefone e endereço residencial.</li>
                  <li><strong>Dados Sensíveis (Saúde):</strong> Declaração de doenças preexistentes, comorbidades, histórico médico completo, alergias, resultados de exames, laudos médicos anexados e registros de triagem.</li>
                </ul>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">3. Uso das Informações e Processo de Análise</h4>
                <p className="text-sm leading-relaxed">
                  Seus dados são utilizados exclusivamente para fins de auditoria clínica, atendimento médico, agendamentos, emissão de receitas e cumprimento de deveres legais regulados pelo Ministério da Saúde. Os laudos apresentados passam por uma <strong>análise prévia de autenticidade clínico-administrativa</strong> para validar o cadastro antes da liberação do portal, reduzindo o risco de fraudes ou erros no atendimento médico.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">4. Inteligência Artificial e Análise Preditiva</h4>
                <p className="text-sm leading-relaxed">
                  Para otimizar o atendimento e garantir a integridade do sistema, a {CLINIC_NAME} utiliza algoritmos de Inteligência Artificial (IA) e ferramentas preditivas. Estes recursos são usados para calcular taxas de absenteísmo, analisar conformidade de segurança e auditar acessos indevidos aos prontuários médicos. Em nenhuma hipótese as decisões tomadas por IA violam os direitos fundamentais ou o sigilo médico de nossos pacientes.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">5. Segurança dos Dados e Criptografia</h4>
                <p className="text-sm leading-relaxed">
                  Implementamos salvaguardas técnicas e administrativas rigorosas para proteger suas informações pessoais contra vazamentos, acessos não autorizados ou destruição. Todos os dados sensíveis (incluindo laudos e declarações de doenças) são criptografados no banco de dados e transitam por conexões seguras (HTTPS/TLS).
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">6. Seus Direitos (LGPD)</h4>
                <p className="text-sm leading-relaxed">
                  Como titular dos dados, você possui o direito de solicitar a confirmação do tratamento, acesso facilitado, correção de informações incompletas ou inexatas, e anonimização de dados desnecessários. Tais requisições podem ser feitas diretamente pelo portal do paciente ou através de contato formal com nosso canal de atendimento de LGPD.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="shrink-0 p-4 sm:p-6 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button
            onClick={onFechar}
            className="py-2.5 px-6 font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95 text-white w-full sm:w-auto bg-[#7C3AED] hover:bg-[#6D28D9] shadow-purple-200 cursor-pointer border-none"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
