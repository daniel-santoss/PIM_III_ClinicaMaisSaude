import { X, ShieldCheck, FileText } from 'lucide-react';
import { useScrollBlock } from "../hooks/useScrollBlock";

interface ModalTermosPoliticaProps {
  tipo: 'termos' | 'privacidade' | null;
  onFechar: () => void;
}

export default function ModalTermosPolitica({ tipo, onFechar }: ModalTermosPoliticaProps) {
  useScrollBlock(!!tipo);

  if (!tipo) return null;

  const isTermos = tipo === 'termos';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-300">
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
                  Ao acessar e utilizar o sistema e site da Clínica Mais Saúde, você concorda em cumprir e ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">2. Uso dos Serviços</h4>
                <p className="text-sm leading-relaxed mb-2">
                  O portal do paciente destina-se ao agendamento de consultas, visualização de histórico médico e comunicação com nossa equipe de saúde. É terminantemente proibido:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600">
                  <li>Fornecer informações falsas durante o cadastro ou agendamento;</li>
                  <li>Tentar burlar os sistemas de segurança da clínica;</li>
                  <li>Utilizar a plataforma para fins ilícitos ou não autorizados.</li>
                </ul>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">3. Agendamentos e Cancelamentos</h4>
                <p className="text-sm leading-relaxed">
                  Os agendamentos realizados pelo portal estão sujeitos a confirmação. Solicitamos que cancelamentos ou remarcações sejam feitos com pelo menos 24 horas de antecedência, permitindo que outros pacientes sejam atendidos. Faltas recorrentes sem aviso prévio podem impactar a prioridade de futuros agendamentos.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">4. Propriedade Intelectual</h4>
                <p className="text-sm leading-relaxed">
                  Todo o conteúdo presente no site (textos, imagens, logotipos, layout) é de propriedade exclusiva da Clínica Mais Saúde e está protegido pelas leis de direitos autorais. A reprodução não autorizada é estritamente proibida.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">1. Compromisso com a Privacidade</h4>
                <p className="text-sm leading-relaxed">
                  A Clínica Mais Saúde valoriza profundamente a sua privacidade e compreende a sensibilidade dos dados de saúde. Esta política descreve como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">2. Coleta de Dados</h4>
                <p className="text-sm leading-relaxed mb-2">
                  Coletamos apenas os dados estritamente necessários para a prestação de nossos serviços de saúde, incluindo:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1 text-gray-600">
                  <li><strong>Dados de Identificação:</strong> Nome completo, CPF, RG, data de nascimento.</li>
                  <li><strong>Dados de Contato:</strong> E-mail, telefone, endereço.</li>
                  <li><strong>Dados Sensíveis (Saúde):</strong> Histórico médico, alergias, resultados de exames e registros de consultas.</li>
                </ul>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">3. Uso das Informações</h4>
                <p className="text-sm leading-relaxed">
                  Seus dados são utilizados exclusivamente para fins de atendimento médico, agendamento de consultas, emissão de receituários e cumprimento de obrigações legais do Ministério da Saúde e Conselhos de Medicina. Não compartilhamos nem vendemos seus dados para terceiros para fins publicitários.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">4. Inteligência Artificial e Análise Preditiva</h4>
                <p className="text-sm leading-relaxed">
                  Para otimizar o atendimento e garantir a segurança do sistema, a Clínica Mais Saúde utiliza algoritmos preditivos e ferramentas de Inteligência Artificial (IA). Estes sistemas são usados para calcular a probabilidade de comparecimento a consultas (evitando ociosidade na agenda) e para monitorar auditorias de segurança, prevenindo violações e acessos indevidos aos seus dados de saúde.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">5. Segurança dos Dados</h4>
                <p className="text-sm leading-relaxed">
                  Implementamos medidas técnicas e organizacionais rigorosas para proteger suas informações pessoais contra acessos não autorizados, perda ou alteração. Todos os dados sensíveis são criptografados em nosso banco de dados.
                </p>
              </section>
              <section>
                <h4 className="text-base font-bold text-gray-900 mb-2">6. Seus Direitos</h4>
                <p className="text-sm leading-relaxed">
                  Como titular dos dados, você tem o direito de solicitar acesso, correção, atualização ou exclusão das suas informações pessoais. Tais solicitações podem ser feitas diretamente pelo portal do paciente ou contatando nossa ouvidoria.
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
