# Área de membros — Supabase

**Estado (2026-10-13): ligado.** Projeto Supabase `thebetterself` (ref `yieancdskfefxorzndzx`, organização FranciscoTipster, região Europa). Esquema aplicado, Site URL de autenticação apontado para a app publicada, convite enviado para o admin tiagosampaiocontact@gmail.com. A password da base de dados foi gerada pelo Supabase no momento da criação; se alguma vez precisares dela (só para ligações diretas ao Postgres), faz reset em Settings → Database.

Se `config.js` ficar sem chaves, a app volta ao **modo demo** (dados de exemplo só no browser).

## 1. Criar o projeto
1. Cria uma conta em https://supabase.com e um projeto novo (região EU).
2. Em **Authentication → Providers → Email**, deixa "Email" ativo. Desliga "Confirm email" se quiseres que os membros entrem logo com a password que lhes deres.
3. Em **Authentication → URL Configuration**, põe o endereço onde a app vai viver (por exemplo `https://thebetterself.com/app/`).

## 2. Criar as tabelas
1. Abre **SQL Editor → New query**.
2. Cola o conteúdo de `supabase/schema.sql` e corre.
3. O email admin está definido na função `is_admin_email` (tiagosampaiocontact@gmail.com). Para mais admins, acrescenta à lista e corre de novo.

## 3. Ligar a app
1. Em **Project Settings → API** copia o *Project URL* e a *anon public key*.
2. Cola em `app/config.js`:
   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   ```
3. Publica os ficheiros. A app deteta a configuração e sai do modo demo.

## 4. Criar membros
- **Authentication → Users → Add user** (email + password). O perfil é criado automaticamente.
- Depois, em **Admin → Clients** na app, define o programa (Start / Evolve / Prime) e monta o plano de treino desse cliente.
- Para a tua conta admin: cria o utilizador com o email tiagosampaiocontact@gmail.com. Fica admin automaticamente.

## O que cada um vê
- **Membro**: painel, treinos atribuídos, registo de séries (kg × reps), histórico e progresso por exercício, apontamentos, notas do coach.
- **Admin**: clientes, último login, treinos registados, atividade recente, editor de planos por cliente, notas para o cliente.

## Segurança
As permissões são aplicadas na base de dados (row level security): cada membro só lê e escreve os seus dados; os admins veem tudo. A *anon key* pode estar no código do site, é feita para isso.
