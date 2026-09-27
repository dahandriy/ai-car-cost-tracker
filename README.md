# AI Car Cost Tracker

Русскоязычный SaaS для учета расходов на автомобиль, аналитики стоимости владения и ИИ-анализа.

Проект специально адаптирован под дешевую и простую архитектуру без отдельного VPS:

- **Frontend:** React + TypeScript + Vite
- **Hosting:** GitHub Pages
- **Database/Auth:** Supabase PostgreSQL + Supabase Auth
- **Authorization:** Supabase Row Level Security
- **Backend for secrets:** Supabase Edge Functions
- **AI:** OpenAI Responses API через Edge Function
- **Payments:** Stripe Checkout + Stripe Webhooks через Edge Functions

## Что адаптировано относительно первоначального плана

Изначально рассматривался стек Next.js + Prisma + Auth.js. Он заменен на React/Vite + Supabase, потому что конечная цель — GitHub Pages. GitHub Pages раздает статический frontend и не запускает постоянный Node.js backend. Supabase закрывает БД, авторизацию и минимальный server-side слой без отдельного сервера.

Также используется `HashRouter`, чтобы прямые переходы внутри SPA не приводили к 404 на GitHub Pages.

## Возможности

- регистрация, вход и защищенные маршруты;
- автомобили: добавление, редактирование, удаление;
- расходы: CRUD, категории, фильтры;
- dashboard и графики;
- аналитика стоимости владения;
- калькулятор и what-if симулятор;
- бюджет;
- dark mode;
- адаптивный desktop/mobile UI;
- ИИ-ассистент на русском языке;
- лимиты ИИ: Free — 5 запросов, AI Pro — 100 запросов за период;
- защищенная проверка лимита на сервере;
- Stripe Checkout architecture;
- server-side webhook synchronization подписки;
- GitHub Actions deployment на GitHub Pages.

---

## 1. Локальный запуск frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

Если Supabase не настроен, приложение автоматически работает в локальном demo-mode через `localStorage`.

Проверка:

```bash
npm run typecheck
npm run build
npm run preview
```

> В среде, где этот проект был собран, `npm install` не удалось завершить из-за сетевого timeout. Поэтому перед публикацией обязательно выполните команды выше локально или через GitHub Actions.

---

## 2. Создание Supabase проекта

Создайте проект в Supabase.

Скопируйте:

- Project URL
- Publishable key

В `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_BASE_PATH=/
```

Publishable key допустим во frontend. Безопасность пользовательских данных обеспечивается RLS.

Никогда не добавляйте в Vite-переменные:

- secret/service-role key;
- OpenAI API key;
- Stripe secret key;
- Stripe webhook secret.

---

## 3. Supabase CLI и миграции

Установите Supabase CLI и войдите в аккаунт.

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Миграции находятся в:

```text
supabase/migrations/
```

Основные таблицы:

- `profiles`
- `vehicles`
- `expenses`
- `fuel_entries`
- `budgets`
- `subscriptions`
- `ai_conversations`
- `ai_messages`

RLS включен для пользовательских таблиц. Пользователь может читать и изменять только свои записи.

Таблица `subscriptions` недоступна браузеру для произвольного изменения тарифа: frontend может только читать свою подписку.

---

## 4. Edge Functions

Backend-код хранится в том же GitHub repository:

```text
supabase/functions/
├── _shared/
├── ai-assistant/
├── create-checkout-session/
└── stripe-webhook/
```

Локальный шаблон секретов:

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

`supabase/functions/.env` уже находится в `.gitignore`.

### Deploy функций

```bash
supabase functions deploy ai-assistant
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

`stripe-webhook` публичный только на уровне gateway, потому что Stripe не отправляет Supabase JWT. Внутри функция обязательно проверяет Stripe webhook signature.

---

## 5. Настройка ИИ

ИИ вызывается только из `supabase/functions/ai-assistant`.

API key никогда не попадает в браузер.

Установите секреты:

```bash
supabase secrets set OPENAI_API_KEY=YOUR_KEY
supabase secrets set OPENAI_MODEL=gpt-5-mini
```

Для локальной разработки можно разрешить явно помеченный mock-mode:

```env
AI_ALLOW_MOCK=true
```

В production рекомендуется:

```env
AI_ALLOW_MOCK=false
```

Edge Function:

1. проверяет авторизованного пользователя;
2. проверяет принадлежность автомобиля;
3. атомарно проверяет и списывает один AI request;
4. загружает только необходимые расходы пользователя;
5. считает агрегаты;
6. отправляет в AI только структурированный контекст;
7. возвращает ответ;
8. если AI provider падает, запрос возвращается в лимит.

Лимиты:

- `FREE`: 5 AI-запросов за период;
- `PRO`: 100 AI-запросов за период.

Проверка лимита выполняется в PostgreSQL-функции `claim_ai_request()`, а не во frontend.

---

## 6. Stripe / AI Pro

AI Pro настроен на **€9.99 / месяц**.

Создайте в Stripe recurring Price для €9.99/month и получите Price ID.

Установите:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_PRO_PRICE_ID=price_...
supabase secrets set APP_URL=https://USERNAME.github.io/REPOSITORY
```

Для локальной разработки:

```env
APP_URL=http://localhost:5173
```

`APP_URL` задается сервером специально: Checkout redirect нельзя доверять URL, присланному клиентом.

### Webhook

После deploy функции webhook URL будет вида:

```text
https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
```

Создайте Stripe webhook и подпишите как минимум события:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

После создания endpoint скопируйте signing secret:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Webhook является source of truth для тарифа. Пользователь не может сделать себя Pro через DevTools или `localStorage`.

---

## 7. GitHub Pages

Frontend не требует Node.js server после сборки.

Workflow:

```text
.github/workflows/deploy.yml
```

В GitHub repository откройте:

**Settings → Pages → Source → GitHub Actions**

Затем создайте Repository Variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

AI и Stripe secrets в GitHub Pages **не нужны** и туда добавляться не должны.

При push в `main` workflow:

1. устанавливает зависимости;
2. запускает typecheck;
3. выполняет production build;
4. выставляет правильный Vite base path;
5. публикует `dist/` на GitHub Pages.

URL проекта:

```text
https://USERNAME.github.io/REPOSITORY/
```

Внутренние SPA-маршруты используют hash:

```text
https://USERNAME.github.io/REPOSITORY/#/app/analytics
```

Это сделано для совместимости с GitHub Pages без серверных rewrite.

### Custom domain

Если позже будет собственный домен, установите его в GitHub Pages и задайте:

```env
APP_URL=https://yourdomain.com
```

для Stripe Edge Function.

---

## 8. Архитектура

```text
GitHub repository
│
├── React / Vite frontend
│       │
│       └── GitHub Actions → GitHub Pages
│
└── supabase/
        ├── migrations → PostgreSQL + RLS
        └── functions
              ├── ai-assistant → OpenAI
              ├── create-checkout-session → Stripe
              └── stripe-webhook ← Stripe events
```

То есть отдельный VPS, Express server, Prisma server, Redis или Docker-host не требуются для текущего MVP.

---

## 9. Переменные окружения

### Browser / GitHub Pages

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_BASE_PATH=/
```

### Supabase Edge Functions only

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
AI_ALLOW_MOCK=false
APP_URL=https://USERNAME.github.io/REPOSITORY
STRIPE_SECRET_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
```

---

## 10. Финальная проверка перед production

Выполните:

```bash
npm install
npm run typecheck
npm run build
```

Проверьте вручную:

1. регистрация / вход / выход;
2. создание автомобиля;
3. Free-пользователь не может создать второй автомобиль;
4. CRUD расходов;
5. Dashboard и аналитика после refresh;
6. AI request уменьшает серверный лимит;
7. при 0 remaining появляется paywall;
8. OpenAI key отсутствует в browser bundle;
9. Stripe secret отсутствует в repository;
10. Stripe Checkout открывается только после авторизации;
11. Stripe webhook меняет `subscriptions.plan` на `PRO`;
12. mobile layout;
13. dark mode;
14. GitHub Pages deploy.

## Статус

Phase 1: frontend — реализован.

Phase 2: Supabase Auth, PostgreSQL, RLS, persistent CRUD — реализован архитектурно.

Phase 3: secure AI Edge Function, AI quotas, Stripe Checkout/webhook architecture, GitHub Pages production workflow — реализован.

Для полноценного production-запуска остаются только внешние account actions: создать Supabase/Stripe/OpenAI credentials, применить migrations, задеплоить functions и добавить GitHub variables.
