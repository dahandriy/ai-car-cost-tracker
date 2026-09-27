# AI Car Cost Tracker — финальная инструкция по публикации

Эта инструкция рассчитана на сценарий: вы сами заходите в GitHub, создаёте репозиторий, загружаете готовые файлы и подключаете Supabase/OpenAI/Stripe.

## Что уже готово

В проекте уже есть:

- React + TypeScript + Vite frontend;
- русскоязычный интерфейс;
- GitHub Pages deployment workflow;
- Supabase Auth/PostgreSQL/RLS migrations;
- CRUD автомобилей и расходов;
- dashboard, аналитика, калькулятор и симулятор;
- AI Assistant через Supabase Edge Function;
- Free/AI Pro лимиты;
- Stripe Checkout + webhook architecture;
- demo/localStorage fallback;
- dark mode и mobile layout.

## Шаг 1. Распакуйте архив

Распакуйте `ai-car-cost-tracker-FINAL.zip`.

В корне должны находиться, среди прочего:

```text
.github/
src/
supabase/
.env.example
.gitignore
index.html
package.json
README.md
vite.config.ts
```

Не загружайте внешний ZIP как единственный файл в репозиторий. В GitHub должны лежать именно файлы и папки проекта.

## Шаг 2. Создайте GitHub repository

1. Откройте GitHub.
2. Нажмите **New repository**.
3. Название: `ai-car-cost-tracker`.
4. Лучше выбрать **Public**, если хотите использовать обычный GitHub Pages публично.
5. Не добавляйте README, .gitignore и license — они уже есть в проекте.
6. Нажмите **Create repository**.

## Шаг 3. Загрузите проект в GitHub

Самый простой вариант без Git-команд:

1. В пустом репозитории нажмите **uploading an existing file** / **Add file → Upload files**.
2. Перетащите содержимое распакованной папки проекта.
3. Убедитесь, что попали и скрытые папки/файлы, особенно `.github` и `.gitignore`.
4. Commit message: `Initial production release`.
5. Нажмите **Commit changes**.

Если браузер GitHub не принимает папки корректно, используйте GitHub Desktop — это надежнее для проекта с большим количеством вложенных файлов.

## Шаг 4. Создайте Supabase проект

1. Создайте новый проект в Supabase.
2. Сохраните:
   - Project URL;
   - Publishable/anon key;
   - Project Ref.
3. Не публикуйте service role key.

## Шаг 5. Примените базу данных

В проекте лежат миграции:

```text
supabase/migrations/
```

Рекомендуемый способ через Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Если не хотите CLI, можно открыть SQL Editor в Supabase и по порядку выполнить содержимое файлов:

1. `supabase/migrations/20260927210000_initial_schema.sql`
2. `supabase/migrations/20260927230000_phase3_billing_ai.sql`

Именно в таком порядке.

## Шаг 6. Добавьте GitHub Variables для frontend

В GitHub repository откройте:

**Settings → Secrets and variables → Actions → Variables → New repository variable**

Создайте:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Значения возьмите из Supabase.

Это browser-safe значения. Не добавляйте сюда OpenAI/Stripe secret keys.

## Шаг 7. Включите GitHub Pages

Откройте:

**Settings → Pages**

В разделе **Build and deployment** выберите:

```text
Source: GitHub Actions
```

Workflow уже находится в:

```text
.github/workflows/deploy.yml
```

После push в `main` GitHub автоматически:

1. установит зависимости;
2. выполнит TypeScript check;
3. соберет проект;
4. опубликует `dist/` в GitHub Pages.

Следите за вкладкой **Actions**.

После успешного deploy сайт будет примерно здесь:

```text
https://YOUR_GITHUB_USERNAME.github.io/ai-car-cost-tracker/
```

## Шаг 8. Настройте Supabase Auth URLs

В Supabase Authentication → URL Configuration задайте Site URL:

```text
https://YOUR_GITHUB_USERNAME.github.io/ai-car-cost-tracker/
```

Добавьте Redirect URL для того же адреса. Проект использует HashRouter, поэтому обычный GitHub Pages 404 для внутренних SPA-маршрутов не требуется решать серверным rewrite.

## Шаг 9. Подключите OpenAI

OpenAI key нельзя размещать в GitHub Pages или Vite variables.

Через Supabase CLI задайте:

```bash
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
supabase secrets set OPENAI_MODEL=gpt-5-mini
supabase secrets set AI_ALLOW_MOCK=false
```

Затем deploy AI function:

```bash
supabase functions deploy ai-assistant
```

После этого AI Assistant будет обращаться к OpenAI через Supabase Edge Function.

## Шаг 10. Проверьте AI до Stripe

До подключения оплаты проверьте Free-план:

- пользователь регистрируется;
- создаёт 1 автомобиль;
- добавляет расходы;
- AI Assistant отвечает;
- после 5 запросов появляется paywall.

Если это работает, переходите к Stripe.

## Шаг 11. Создайте Stripe продукт AI Pro

В Stripe создайте:

- Product: `AI Pro`;
- recurring price: `€9.99 / month`.

Скопируйте Price ID вида:

```text
price_...
```

Задайте Supabase secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_PRO_PRICE_ID=price_...
supabase secrets set APP_URL=https://YOUR_GITHUB_USERNAME.github.io/ai-car-cost-tracker
```

Deploy checkout function:

```bash
supabase functions deploy create-checkout-session
```

## Шаг 12. Настройте Stripe webhook

Deploy webhook function:

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

Webhook URL:

```text
https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/stripe-webhook
```

В Stripe добавьте события:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

Скопируйте webhook signing secret и задайте:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

После изменения secrets повторный deploy обычно не требуется, но при проблемах задеплойте webhook function снова.

## Шаг 13. Финальная проверка

Проверьте по порядку:

1. Открывается landing page.
2. Регистрация работает.
3. Вход/выход работает.
4. После refresh сессия сохраняется.
5. Можно создать первый автомобиль.
6. Free-пользователь не может создать второй автомобиль.
7. Расходы создаются, редактируются и удаляются.
8. Dashboard пересчитывается.
9. Analytics строится из реальных данных.
10. Калькулятор работает без backend.
11. AI Assistant работает.
12. После 5 Free AI запросов появляется paywall.
13. Stripe Checkout открывается.
14. После тестовой оплаты Stripe webhook меняет тариф на PRO.
15. PRO получает лимит 100 AI запросов за период.
16. В браузерном bundle нет `OPENAI_API_KEY`, `STRIPE_SECRET_KEY` или service-role key.
17. Mobile layout и dark mode работают.

## Что НЕ нужно загружать в GitHub

Никогда не коммитьте:

```text
.env.local
supabase/functions/.env
node_modules/
dist/
```

И никогда не размещайте во frontend:

```text
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

## Если хотите запустить локально

```bash
npm install
cp .env.example .env.local
npm run dev
```

Для production check:

```bash
npm run typecheck
npm run build
```

## Минимум внешних сервисов

Для полной версии нужны только:

1. GitHub — repository + GitHub Pages;
2. Supabase — Auth + PostgreSQL + Edge Functions;
3. OpenAI — AI Assistant;
4. Stripe — платная подписка AI Pro.

Отдельный VPS/Render/Railway/Express backend для текущей архитектуры не нужен.
