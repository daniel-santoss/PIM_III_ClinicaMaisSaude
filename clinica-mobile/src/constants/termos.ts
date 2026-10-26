import { CLINIC_EMAIL, CLINIC_NAME } from '@/constants/clinica';

// Termos de uso e proteção de dados aceitos no auto-cadastro. A versão é a mesma que a API
// grava com o consentimento (AutoCadastroService.TermosVersaoAtual): mudou o texto, sobe as duas.
// Cópia idêntica à do web (clinica-frontend/src/constants/termos.ts): mudou um, mude o outro.
export const TERMOS_VERSAO = '2.0';
export const TERMOS_DATA = 'outubro de 2026';

export const TERMOS_SECOES: { titulo: string; texto: string }[] = [
  {
    titulo: '1. Para que usamos seus dados',
    texto: `A ${CLINIC_NAME} trata seus dados para avaliar o seu pré-cadastro, agendar e realizar atendimentos, manter o seu prontuário e enviar avisos sobre as suas consultas.`,
  },
  {
    titulo: '2. Quais dados coletamos',
    texto: 'Dados de identificação e contato (nome, CPF, e-mail e telefone) e as respostas da Declaração de Saúde. Informações de saúde são dados pessoais sensíveis e recebem proteção reforçada pela LGPD.',
  },
  {
    titulo: '3. Base legal',
    texto: 'Tratamos seus dados com base no seu consentimento e na tutela da saúde, realizada por profissionais e serviços de saúde (arts. 7º e 11 da Lei Geral de Proteção de Dados — Lei nº 13.709/2018).',
  },
  {
    titulo: '4. Com quem compartilhamos',
    texto: 'Seus dados são acessados apenas pela equipe da clínica envolvida no seu atendimento. Usamos fornecedores de tecnologia para hospedar o sistema, enviar e-mails e fazer a triagem por inteligência artificial (os sintomas que você descrever podem ser analisados por esse serviço para sugerir o tipo de atendimento); eles tratam os dados somente para essas finalidades. Não vendemos seus dados e só os compartilhamos com outros terceiros por obrigação legal ou ordem judicial.',
  },
  {
    titulo: '5. Segurança e guarda',
    texto: 'Os dados trafegam criptografados, o acesso é restrito conforme o perfil de cada profissional e as senhas são armazenadas de forma irreversível. Guardamos os dados pelo tempo necessário ao atendimento e às obrigações legais; o prontuário, por exemplo, deve ser mantido por no mínimo 20 anos (Lei nº 13.787/2018).',
  },
  {
    titulo: '6. Seus direitos',
    texto: `A qualquer momento você pode confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir a portabilidade, pedir a eliminação dos dados desnecessários e revogar o consentimento (art. 18 da LGPD). Faça o pedido na recepção ou pelo e-mail ${CLINIC_EMAIL}. A revogação não afeta o que foi feito antes dela nem os dados que a lei obriga a manter.`,
  },
  {
    titulo: '7. Avaliação presencial',
    texto: 'O cadastro só é concluído após uma avaliação presencial na clínica. Você se compromete a informar dados verdadeiros; informações falsas podem levar à recusa da solicitação.',
  },
  {
    titulo: '8. Alterações destes termos',
    texto: 'Mudanças relevantes nestes termos serão comunicadas pelos seus contatos cadastrados, e a versão vigente fica sempre disponível no cadastro.',
  },
];
