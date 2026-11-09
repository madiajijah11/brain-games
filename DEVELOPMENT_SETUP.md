# Development Setup — Linux + VS Code

## 1. Install Node.js 24

Using NVM (recommended):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# Restart the shell, then:
nvm install 24
nvm use 24
nvm alias default 24
node --version
npm --version
```

The repository includes `.nvmrc` and `.node-version` set to `24`.

## 2. Install tools

- VS Code: https://code.visualstudio.com/
- Git: https://git-scm.com/
- GitHub Copilot extension: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot
- GitHub Copilot Chat extension: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat

Recommended VS Code extensions are listed in `.vscode/extensions.json`.

## 3. Provision Neon

1. Create a Neon project at https://neon.tech/.
2. Create a development branch/database.
3. Copy the pooled connection string (pooler hostname) to `DATABASE_URL`.
4. Copy the direct connection string to `DATABASE_URL_UNPOOLED`.
5. Keep both credentials private.

No local PostgreSQL or Docker is required. Docker can still be used optionally for unrelated local services, but it is not part of the required workflow.

## 4. Configure environment

```bash
cp .env.example .env
npm exec auth secret
```

Put the generated value in `AUTH_SECRET`. Add the two Neon connection strings. `AUTH_URL` can remain `http://localhost:3000` for local development.

## 5. Install and initialize

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## 6. VS Code + Copilot

Open the repository root in VS Code. Install the recommended extensions when prompted. Use Copilot Chat Agent mode for multi-file work. Ask Copilot to read `AGENTS.md`, `PRODUCT_SPEC.md`, and `.github/copilot-instructions.md` before modifying files.

Suggested first prompt:

```text
Read AGENTS.md, PRODUCT_SPEC.md, and .github/copilot-instructions.md.
Audit the existing MVP for correctness, security, accessibility, and Vercel/Neon compatibility.
Do not modify files yet. Return findings ranked by severity with file references.
```

## 7. Local checks before pushing

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Playwright browser tests may require browser installation once:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

## 8. Git workflow

```bash
git checkout -b feature/short-description
git add .
git commit -m "feat: describe the change"
git push -u origin feature/short-description
```

Vercel can create a Preview Deployment for the branch after the GitHub repository is connected.
