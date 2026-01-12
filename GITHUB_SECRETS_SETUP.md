# GitHub Secrets Setup Guide

To deploy the application with your API keys embedded, you need to add them as GitHub Secrets.

## Step-by-Step Instructions

### 1. Go to Your Repository Settings

1. Navigate to: https://github.com/grantdozier/legal-automations
2. Click on **Settings** tab (top right)
3. In the left sidebar, click **Secrets and variables** → **Actions**

### 2. Add Repository Secrets

Click **"New repository secret"** button and add each of the following secrets:

#### Secret 1: VITE_OPENAI_API_KEY
- **Name**: `VITE_OPENAI_API_KEY`
- **Value**: `[Your OpenAI API key - starts with sk-proj-...]`

#### Secret 2: VITE_CHROMA_API_KEY
- **Name**: `VITE_CHROMA_API_KEY`
- **Value**: `[Your Chroma API key - starts with ck-...]`

#### Secret 3: VITE_CHROMA_TENANT
- **Name**: `VITE_CHROMA_TENANT`
- **Value**: `[Your Chroma tenant ID - UUID format]`

#### Secret 4: VITE_CHROMA_DATABASE
- **Name**: `VITE_CHROMA_DATABASE`
- **Value**: `[Your Chroma database name]`

### 3. Verify Secrets Are Added

After adding all secrets, you should see them listed on the Actions secrets page:
- ✅ VITE_OPENAI_API_KEY
- ✅ VITE_CHROMA_API_KEY
- ✅ VITE_CHROMA_TENANT
- ✅ VITE_CHROMA_DATABASE

### 4. How It Works

When you push code to the `main` branch:

1. GitHub Actions workflow runs (`.github/workflows/deploy.yml`)
2. The workflow reads these secrets during the build step
3. Vite bundles the app with the environment variables embedded
4. The built app is deployed to GitHub Pages
5. Users can use the app without entering API keys

### 5. Security Notes

- ✅ **Secrets are encrypted** by GitHub and never exposed in logs
- ✅ **Secrets are NOT stored in the git repository**
- ✅ **Only the built JavaScript bundle** contains the values (obfuscated by Vite's build process)
- ⚠️ **Client-side apps can't hide API keys completely** - the keys will be in the built JavaScript
- 💡 **For maximum security**, consider building a backend API that proxies requests to OpenAI/Chroma

### 6. Local Development

For local development, create a `.env` file in the `webapp/` directory (already gitignored):

```bash
# webapp/.env (NOT committed to git)
VITE_OPENAI_API_KEY=your-openai-key-here
VITE_CHROMA_API_KEY=your-chroma-key-here
VITE_CHROMA_TENANT=your-tenant-id-here
VITE_CHROMA_DATABASE=your-database-name-here
```

Use the `.env.example` file as a template.

### 7. Troubleshooting

**If the app shows "OpenAI API key not configured" error:**
1. Check that all 4 secrets are added in GitHub
2. Check that secret names match exactly (case-sensitive)
3. Trigger a new deployment by pushing a commit
4. Check GitHub Actions logs for build errors

**To manually trigger a deployment:**
1. Go to Actions tab
2. Click "Deploy to GitHub Pages"
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow" button

---

## Secret Names (copy these exactly)

```
VITE_OPENAI_API_KEY
VITE_CHROMA_API_KEY
VITE_CHROMA_TENANT
VITE_CHROMA_DATABASE
```

---

**Repository Secrets URL**: https://github.com/grantdozier/legal-automations/settings/secrets/actions

**Note**: The actual API key values are stored locally in the `.env` file which is not committed to git. Check with the repository owner for the correct values to use in GitHub Secrets.

After setting up secrets, the app will work automatically without users needing to enter API keys!
