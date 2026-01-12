# Deployment Guide - GitHub Pages

## Status: Ready to Deploy ✅

All code has been committed and pushed to GitHub. Follow these steps to enable GitHub Pages.

---

## Step 1: Enable GitHub Pages

1. **Go to your repository on GitHub**:
   ```
   https://github.com/grantdozier/legal-automations
   ```

2. **Navigate to Settings**:
   - Click on **Settings** tab (top right of repository)

3. **Go to Pages section**:
   - In the left sidebar, click **Pages** (under "Code and automation")

4. **Configure Build and Deployment**:
   - Under "Build and deployment"
   - **Source**: Select **"GitHub Actions"** from the dropdown
   - (This tells GitHub to use the workflow file we created)

5. **Save**:
   - No need to click save - it auto-saves when you select GitHub Actions

---

## Step 2: Verify Deployment

1. **Check Actions Tab**:
   - Click the **Actions** tab in your repository
   - You should see a workflow run called "Deploy to GitHub Pages"
   - It will take about 2-3 minutes to complete

2. **Wait for Green Checkmark**:
   - The workflow has three stages:
     - ✅ Checkout code
     - ✅ Build the app (npm install + npm run build)
     - ✅ Deploy to GitHub Pages
   - Wait for all to show green checkmarks

3. **Get Your Live URL**:
   - Once deployed, your app will be available at:
   ```
   https://grantdozier.github.io/legal-automations/
   ```

---

## Step 3: Test Your App

1. **Visit the URL**:
   ```
   https://grantdozier.github.io/legal-automations/
   ```

2. **Configure API Key**:
   - You'll see the API Configuration screen
   - Enter your OpenAI API key
   - (Optional) Enter Chroma Cloud credentials
   - Click "Save Configuration"

3. **Test with Sample Data**:
   - Upload the sample transcript or create your own
   - The sample is available at: `webapp/public/sample_deposition.txt`
   - Watch the processing status
   - Review the generated report

---

## GitHub Actions Workflow

The workflow file is located at: `.github/workflows/deploy.yml`

**What it does**:
1. Triggers on every push to `main` branch
2. Sets up Node.js 22
3. Installs dependencies (`npm ci`)
4. Builds the production app (`npm run build`)
5. Deploys the `docs/` folder to GitHub Pages

**Manual Deployment**:
You can also trigger deployment manually:
1. Go to Actions tab
2. Click "Deploy to GitHub Pages"
3. Click "Run workflow"
4. Select branch: main
5. Click "Run workflow" button

---

## Troubleshooting

### Workflow Fails

**Check the error**:
1. Go to Actions tab
2. Click on the failed workflow run
3. Expand the failed step to see the error

**Common issues**:
- **Build fails**: Check `webapp/package.json` dependencies
- **Upload fails**: Ensure `docs/` folder exists and has content
- **Permissions error**: Check Settings → Actions → General → Workflow permissions (should be "Read and write")

### Page Not Loading

**Clear DNS cache**:
- GitHub Pages can take 5-10 minutes to propagate
- Clear your browser cache
- Try incognito/private browsing mode

**Check Pages status**:
1. Go to Settings → Pages
2. Look for "Your site is live at..." message
3. If you see an error, check the Actions logs

### 404 Error

**Check base path**:
- The app is configured with base path: `/legal-automations/`
- Verify in `webapp/vite.config.ts` that `base` matches your repository name

**Rebuild if needed**:
```bash
cd webapp
npm run build
git add ../docs
git commit -m "Rebuild for deployment"
git push origin main
```

---

## Custom Domain (Optional)

If you want to use a custom domain like `depo-analyzer.com`:

1. **Purchase Domain**:
   - Buy from any domain registrar (Namecheap, GoDaddy, etc.)

2. **Configure DNS**:
   Add these DNS records at your registrar:
   ```
   Type    Name    Value
   A       @       185.199.108.153
   A       @       185.199.109.153
   A       @       185.199.110.153
   A       @       185.199.111.153
   CNAME   www     grantdozier.github.io
   ```

3. **Configure in GitHub**:
   - Settings → Pages
   - Under "Custom domain", enter your domain
   - Check "Enforce HTTPS"
   - Wait 24-48 hours for DNS propagation

4. **Update Vite Config**:
   ```typescript
   // webapp/vite.config.ts
   export default defineConfig({
     base: '/', // Change from '/legal-automations/' to '/'
     // ... rest of config
   })
   ```

5. **Rebuild and Deploy**:
   ```bash
   cd webapp
   npm run build
   git add ../docs
   git commit -m "Update for custom domain"
   git push origin main
   ```

---

## API Keys and Security

**OpenAI API Key**:
- Never commit your API key to the repository
- Keys are stored in browser localStorage only
- Each user must enter their own key

**Costs**:
- OpenAI API usage varies by transcript length:
  - Small (50 pages): ~$0.50-$1.00
  - Medium (150 pages): ~$2.00-$4.00
  - Large (300 pages): ~$5.00-$10.00

**Rate Limits**:
- OpenAI has rate limits per minute/day
- The app includes automatic retry with exponential backoff
- Large transcripts may take 5-10 minutes to process

---

## Monitoring and Analytics (Optional)

### GitHub Pages Analytics

**Basic stats** (free):
- Settings → Pages → shows basic traffic data
- Limited to last 14 days

### Google Analytics (advanced):

1. **Create GA4 Property**:
   - Go to analytics.google.com
   - Create new property
   - Get your Measurement ID (G-XXXXXXXXXX)

2. **Add to App**:
   ```html
   <!-- webapp/index.html - in <head> section -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

3. **Rebuild and Deploy**

---

## Next Steps

1. ✅ **Deploy to GitHub Pages** (follow steps above)
2. 📝 **Test with sample transcript**
3. 🔑 **Get OpenAI API key** (if you don't have one)
4. 🎯 **Try with real deposition transcript**
5. 📊 **Review reports and iterate**
6. 🌐 **Share with team** (send them the GitHub Pages URL)

---

## Support

- **Repository**: https://github.com/grantdozier/legal-automations
- **Issues**: Create an issue on GitHub for bugs or feature requests
- **Documentation**: See README.md for usage instructions

---

## Congratulations! 🎉

Your legal deposition analysis tool is ready to deploy. Once GitHub Pages is enabled, it will be live and accessible to anyone with the URL.
