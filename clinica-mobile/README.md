# Clínica Mais Saúde — App Mobile (pacientes)

App **Expo / React Native** exclusivo para **pacientes**. Consome a mesma API REST do web (`ClinicaMaisSaude.API`).
Médicos, enfermeiras e administradores usam apenas a versão web.

**Stack:** Expo SDK 58 · React Native 0.88 · React 19 · expo-router · expo-secure-store · expo-local-authentication · expo-image-picker.

---

## Funcionalidades

| Área | O que o paciente faz |
|---|---|
| Acesso | Login (e-mail ou CPF), "lembrar usuário", bloqueio por biometria, recuperação de senha por código, auto-cadastro moderado e primeiro acesso |
| Início | Saudação, próxima consulta em destaque e atalhos |
| Agendar | Triagem por IA (com acolhimento em crise — CVV 188) ou escolha manual (tipo e especialidade em selects); retorno vinculado à consulta de origem; **calendário mensal** com os dias que têm horário livre em azul (endpoint `dias-disponiveis`); tela de sucesso com o profissional delegado |
| Consultas | Lista com Próximas/Histórico, status e resultado de exame (pendente/pronto/retirado); remarcar e cancelar |
| Avisos | Notificações com badge de não lidas; marcar como lida e excluir |
| Perfil | Foto (câmera/galeria ou remover) e nome; **Dados pessoais** (leitura, lápis para editar nome/e-mail/telefone, alterar senha); **Configurações** (biometria, sair, excluir conta) |

### Decisões de escopo
- **`temProblemaMemoria` é somente leitura** no app: alimenta o cálculo de risco de falta e é gerido pela clínica. Por isso o app edita o perfil via `PATCH /api/Perfil`, que não expõe esse campo.
- **Probabilidade de falta não aparece** para o paciente (recurso interno da equipe).
- **Exclusão de conta in-app** existe porque as lojas exigem quando há auto-cadastro.
- **Backlog:** push nativo em segundo plano (FCM) — exige Firebase e build próprio.

---

## Rodando em desenvolvimento

### 1. API acessível pela rede
O celular chama a API **direto pelo IP da máquina** (o túnel do Expo cobre só o Metro). Na raiz do repo:

```bash
dotnet run --project ClinicaMaisSaude.API --urls http://0.0.0.0:5045
```

Se o firewall bloquear, libere a porta 5045 (PowerShell como administrador):

```bash
netsh advfirewall firewall add rule name="ClinicaMaisSaude API 5045" dir=in action=allow protocol=TCP localport=5045
```

### 2. `.env` com o IP da máquina
Crie `clinica-mobile/.env` (fica fora do git):

```
EXPO_PUBLIC_API_URL=http://<IP_LAN_DA_MAQUINA>:5045
```

O valor é embutido no bundle: **sempre que mudar o `.env`, reinicie o Metro com `-c`**. Sem o arquivo, o app tenta `localhost`, que o celular não alcança. No emulador Android use `http://10.0.2.2:5045`.

### 3. Subir o Metro

```bash
npm install
npx expo start -c --tunnel ngrok
```

Abra pelo Expo Go (o celular precisa estar na **mesma rede Wi-Fi** da API). O `--tunnel` contorna o firewall na porta 8081; o provedor `ngrok` não exige login no Expo.

---

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| "Project is incompatible with this version of Expo Go" | O Expo Go atualizou de SDK. Subir o projeto: `npx expo install expo@^<SDK>.0.0` e depois `npx expo install --fix`; conferir com `npx expo-doctor` |
| `NoRouteToHostException` / "Network request failed" no login | IP do `.env` desatualizado (o DHCP mudou) ou celular em outra rede. Atualizar o `.env` e reiniciar com `-c` |
| `tsc` acusa rota inválida (ex.: `"/(app)/consultas"`) | Tipos de rota (`.expo/types`) desatualizados. Rodar `npx expo start` uma vez e encerrar |
| Biometria não pede nada | `expo-local-authentication` não funciona no Expo Go — só em build próprio (abaixo) |
| `npm install` falha com `ERESOLVE` | O `.npmrc` já fixa `legacy-peer-deps`; rodar dentro de `clinica-mobile` |

Não instale `@react-navigation/*` diretamente: é incompatível com o expo-router no SDK atual.

Telas secundárias (Configurações, Dados pessoais) ficam no **Stack raiz** (`src/app/*.tsx`), abertas com `router.push`. Não use aba escondida com `href: null`: desde o expo-router 58, ela é redirecionada para a aba inicial ao receber foco.

---

## Build instalável (APK)

O `eas.json` tem três perfis: `development` (dev client), `preview` (APK avulso) e `production` (AAB para a loja).
O **APK de `preview`** fixa o SDK (não depende das atualizações do Expo Go) e habilita a biometria:

```bash
npm i -g eas-cli
eas login
eas init
eas build -p android --profile preview
```

O `eas init` grava o `projectId` no `app.json` — commitar essa alteração. Antes do build, o `EXPO_PUBLIC_API_URL` precisa apontar para uma API acessível pelo aparelho.

---

## Verificação

```bash
npx tsc --noEmit
npx expo-doctor
```
