# Checklist de lançamento – FLP Performance

Lista do que precisa estar feito **antes de abrir para clientes reais**.
✅ = já feito no código · ⬜ = precisa ser feito por você (ou com ajuda)

## 1. Infraestrutura
- ⬜ Criar projeto **Supabase** (região Zurich ou Frankfurt) e aplicar as migrações: `npx supabase link` + `npx supabase db push`
- ⬜ Supabase → Authentication → URL Configuration: Site URL e Redirect URLs (`/auth/confirm`, `/auth/einladung`)
- ⬜ Supabase → SMTP próprio (ex.: e-mail do domínio da FLP) com SPF/DKIM
- ⬜ Traduzir os modelos de e-mail do Supabase para alemão suíço
- ⬜ Ativar *Leaked Password Protection* e conferir os limites de requisições
- ⬜ Ativar backups / Point-in-Time-Recovery no plano do Supabase
- ⬜ Criar projeto **Vercel** com Root Directory = `flp-performance` e variáveis de `.env.example`
- ⬜ Domínio próprio (ex.: app.flp-performance.ch) com HTTPS
- ⬜ Rodar `grant-admin.sql` com o seu e-mail para virar administrador

## 2. Stripe
- ⬜ Conta Stripe em **modo de teste**, chave `sk_test_…` na Vercel
- ⬜ Webhook `https://<domínio>/api/stripe/webhook` com os 5 eventos (ver `DEPLOYMENT.md`)
- ⬜ Ativar cartão e **TWINT**; ativar recibos por e-mail
- ⬜ Compra de teste com cartão `4242 4242 4242 4242` → acesso liberado
- ⬜ Estorno de teste no Stripe → acesso removido automaticamente
- ⬜ Só depois: trocar para as chaves **live**

## 3. Testes no ambiente real (eu faço com você)
- ⬜ Cadastro + e-mail de confirmação
- ⬜ Convite de pai/mãe + definição de senha
- ⬜ Upload de vídeo de exercício e reprodução no celular (iPhone e Android)
- ⬜ Upload de capa e vídeo de programa
- ⬜ Compra de teste e estorno (acima)
- ⬜ Instalar como app (PWA) no celular

## 4. Jurídico e proteção de dados (revisão por especialista)
- ⬜ **Política de privacidade** definitiva (hoje é rascunho em `/datenschutz`): responsável, endereço, contato, prestadores (Supabase, Vercel, Stripe, e-mail), regiões dos dados, transferências para os EUA
- ⬜ Verificar se o **RGPD/DSGVO** se aplica (clientes na UE?) além da lei suíça (**revDSG**)
- ⬜ Revisar os **textos de consentimento** dos pais (`src/lib/consent.ts`); ao mudar, aumentar `POLICY_VERSION`
- ⬜ Contratos de processamento de dados (DPA) com Supabase, Vercel, Stripe e o provedor de e-mail
- ⬜ Registro das atividades de tratamento e prazos de retenção (ex.: apagar dados X meses após o fim do coaching)
- ⬜ Processo para pedidos de dados (prazo de 30 dias) e verificação de identidade de quem pede
- ⬜ Processo para incidentes de dados (comunicação ao EDÖB)
- ⬜ **Impressum** (nome, endereço, contato) na app e na loja
- ⬜ **Termos de venda (AGB)** e política de reembolso dos programas digitais
- ⬜ **IVA (MWST):** verificar obrigação (a partir de CHF 100 000/ano); hoje os preços aparecem sem menção a IVA
- ⬜ Conteúdo de **nutrição** revisado por profissional (o aviso "não substitui orientação médica" já está na app)

## 5. Operação no dia a dia
- ✅ Pedidos de dados (cópia, correção, exclusão) chegam em Admin → Datenschutz
- ⬜ **Exclusão de conta:** apagar o usuário no Supabase (Authentication → Users). Se a pessoa tiver pedidos pagos, a exclusão é bloqueada de propósito (contabilidade: guardar por 10 anos). Nesse caso, anonimizar nome/e-mail/telefone no perfil em vez de apagar.
- ⬜ **Exclusão dos dados de uma criança:** Admin apaga o jogador (apaga também avaliações, planos e feedback).
- ⬜ **Consentimento de vídeo revogado:** apagar manualmente os vídeos daquela criança no Storage (`player-media/<id do jogador>/`).
- ⬜ Conferir o log de auditoria (Admin → Übersicht) de vez em quando.

## 6. Já garantido pelo código
- ✅ Pais só veem os próprios filhos; treinadores só os seus jogadores (testado no banco)
- ✅ Perfis e vídeos de crianças nunca são públicos
- ✅ Avaliações publicadas não podem ser alteradas
- ✅ Pagamento só libera acesso após confirmação assinada do Stripe; nenhum dado de cartão na app
- ✅ Pedidos de teste separados dos reais
- ✅ Testes automáticos em cada commit (CI no GitHub)
