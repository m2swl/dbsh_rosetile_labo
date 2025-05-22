# ZEN Diary: Motion & Emotion Logger

This contains everything you need to run your app locally and deploy it to GitHub Pages.

## Prerequisites

*   Node.js (version 20.x or as specified in `.github/workflows/deploy.yml`)
*   npm (usually comes with Node.js)
*   A Gemini API Key

## Run Locally

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a file named `.env.local` in the root of your project.
    Add your Gemini API key to this file:
    ```
    GEMINI_API_KEY=your_actual_gemini_api_key_here
    ```
    **Important:** `.env.local` is listed in `.gitignore` and should NOT be committed to your repository.

4.  **Run the app:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, typically at `http://localhost:5173`.

## Deploying to GitHub Pages

There are two main methods to deploy your app to GitHub Pages:

**Important Configuration Steps (Do these first!):**

1.  **Update `vite.config.ts`:**
    *   Open `vite.config.ts`.
    *   Find the line `const base = mode === 'production' ? '/ZEN-Diary-App/' : '/';`.
    *   **Replace `/ZEN-Diary-App/` with `/<YOUR_REPOSITORY_NAME>/`**. For example, if your repository URL is `https://github.com/yourusername/my-cool-zen-app`, the line should be `const base = mode === 'production' ? '/my-cool-zen-app/' : '/';`.

2.  **Update `package.json`:**
    *   Open `package.json`.
    *   Find the `homepage` line: `"homepage": "https://YOUR_GITHUB_USERNAME.github.io/ZEN-Diary-App/",`
    *   **Replace `YOUR_GITHUB_USERNAME` with your GitHub username and `ZEN-Diary-App` with your repository name.** For example: `"homepage": "https://cooluser.github.io/my-cool-zen-app/",`

3.  **Set Gemini API Key as a GitHub Secret:**
    *   Go to your GitHub repository.
    *   Click on "Settings" > "Secrets and variables" (in the left sidebar) > "Actions".
    *   Click "New repository secret".
    *   Name the secret: `GEMINI_API_KEY`
    *   Paste your actual Gemini API key into the "Secret" field.
    *   Click "Add secret".
    This is crucial for the GitHub Actions deployment method to securely use your API key during the build process. The key will be embedded in your client-side JavaScript bundle.

### Method 1: Automated Deployment with GitHub Actions (Recommended)

This project includes a GitHub Actions workflow file (`.github/workflows/deploy.yml`) that automates the build and deployment process.

1.  **Commit and push your changes:**
    After making the configuration updates above and any other code changes:
    ```bash
    git add .
    git commit -m "Configure for GitHub Pages and add deployment workflow"
    git push origin main # Or your default branch
    ```

2.  **Enable GitHub Pages:**
    *   Go to your GitHub repository settings.
    *   Navigate to "Pages" in the left sidebar.
    *   Under "Build and deployment", for "Source", select "GitHub Actions".
    *   The workflow should automatically run on pushes to your main branch. After the first successful run, your site will be deployed. You can monitor the progress in the "Actions" tab of your repository.

    Your site will be available at the URL specified in your `package.json` `homepage` (e.g., `https://yourusername.github.io/your-repo-name/`).

### Method 2: Manual Deployment using `gh-pages`

If you prefer a manual deployment process:

1.  **Ensure `gh-pages` is installed:**
    The `package.json` already lists it in `devDependencies`. If you ran `npm install`, it should be available.

2.  **Build and deploy:**
    Run the following command in your project root:
    ```bash
    npm run deploy
    ```
    This command first runs `npm run build` (the `predeploy` script) and then uses `gh-pages` to push the contents of the `dist` folder to a `gh-pages` branch on your repository.

3.  **Configure GitHub Pages Source (first time only):**
    *   Go to your GitHub repository settings.
    *   Navigate to "Pages" in the left sidebar.
    *   Under "Build and deployment", for "Source", select "Deploy from a branch".
    *   Select the `gh-pages` branch and the `/(root)` folder.
    *   Click "Save".

    Your site should be live after a few minutes at the URL specified in `package.json` (e.g., `https://yourusername.github.io/your-repo-name/`).

**Note on API Key Security:**
The `GEMINI_API_KEY` is embedded into the client-side JavaScript bundle during the build process (both locally and via GitHub Actions). This is generally not recommended for sensitive API keys in public applications. For this project, we are following the established pattern. Be mindful of the usage quotas and security implications for your API key.
