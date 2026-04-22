# TFG_Front

**Gestor de Prácticas Nebrija**

This repository houses the frontend application for the "Gestor de Prácticas Nebrija" project, built with Vue 3 and Vite. It aims to provide a modern, efficient, and user-friendly interface for managing academic practices (internships or placements) for students and faculty at Nebrija University.

The project leverages a modern JavaScript ecosystem to deliver a dynamic and responsive web experience.

## ✨ Key Features & Benefits

*   **Practice Management:** Streamlined interface for handling practice-related data, potentially including student assignments, company details, and progress tracking.
*   **Modern Frontend Stack:** Utilizes Vue 3 for reactive UI development and Vite for a fast and efficient development experience.
*   **Modular Component Architecture:** Leverages Vue's component-based structure for maintainable and scalable code.
*   **Fast Development Workflow:** Vite provides instant server start, hot module replacement (HMR), and optimized build processes.
*   **Type-Safe Development:** Incorporates TypeScript for improved code quality and reduced runtime errors.

## 🚀 Technologies Used

This project is built using a combination of modern languages and tools:

### Languages

*   **JavaScript:** The core language for frontend logic.
*   **TypeScript:** Provides type safety and enhanced development experience for the Vue application.

### Tools & Frameworks

*   **Node.js:** JavaScript runtime environment for development tools and package management.
*   **Vue 3:** Progressive JavaScript framework for building user interfaces.
*   **Vite:** Next-generation frontend tooling that provides an extremely fast development experience.
*   **Heroicons:** Set of beautiful SVG icons for UI elements.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js:** Version 14 or higher (LTS recommended). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm** or **Yarn:** A package manager (npm comes bundled with Node.js).

## 💻 Installation & Setup Instructions

Follow these steps to get the project up and running on your local machine:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/PB-421/TFG_Front.git
    cd TFG_Front
    ```

2.  **Install Dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Or using Yarn:
    ```bash
    yarn install
    ```

3.  **Recommended IDE Setup:**
    For the best development experience, we recommend using [VS Code](https://code.visualstudio.com/) with the following extensions:
    *   [Vue (Official) (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.volar): Provides comprehensive Vue 3 language support. **Make sure to disable Vetur if you have it installed to avoid conflicts.**

## 🏃 Usage Examples

### Development Server

To run the application in development mode with hot-reloading:

```bash
npm run dev
```
Or:
```bash
yarn dev
```
The application will typically be accessible at `http://localhost:5173/` (or another port if 5173 is in use).

### Building for Production

To build the application for production, which generates static assets in the `dist` directory:

```bash
npm run build
```
Or:
```bash
yarn build
```

### Browser Development Tools

*   **Vue.js devtools:** For an enhanced debugging experience in Chromium-based browsers (Chrome, Edge, Brave, etc.), install the [Vue.js devtools extension](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd).
*   Remember to turn on **Custom Object Formatter** in your browser's developer tools settings for better inspection of Vue components.

## ⚙️ Configuration Options

*   **Environment Variables:** You can configure environment-specific variables by creating `.env` files (e.g., `.env.development`, `.env.production`) in the project root. These can include API endpoints, feature flags, etc. Refer to [Vite's documentation on Environment Variables](https://vitejs.dev/guide/env-and-mode.html) for more details.
*   **VS Code Settings:** The `.vscode/settings.json` and `.vscode/extensions.json` files provide recommended workspace settings and extensions for consistent development.
*   **Vite Configuration:** For advanced build or server configurations, you can modify `vite.config.ts` (though not explicitly shown, it's standard in Vite projects).

## 🤝 Contributing Guidelines

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  **Fork** the repository.
2.  **Clone** your forked repository: `git clone https://github.com/your-username/TFG_Front.git`
3.  Create a new **branch** for your feature or bugfix: `git checkout -b feature/your-feature-name`
4.  Make your **changes** and ensure the code adheres to existing style guidelines.
5.  **Commit** your changes with a clear and descriptive message: `git commit -m "feat: Add new feature for X"`
6.  **Push** your branch to your forked repository: `git push origin feature/your-feature-name`
7.  Open a **Pull Request** against the `main` branch of the original repository.

Please ensure your pull requests are well-described and pass any existing tests.

## ⚖️ License Information

This project is licensed under the **MIT License**.

You are free to use, modify, and distribute this software, provided that the
original copyright notice and this permission notice are included.

For more details, see the `LICENSE` file in this repository.


## 🙏 Acknowledgments

*   [Vue.js](https://vuejs.org/) for the incredible frontend framework.
*   [Vite](https://vitejs.dev/) for the lightning-fast development experience.
*   [Heroicons](https://heroicons.com/) for the beautiful and easily integrable icon sets.
*   The developers and contributors of all open-source libraries used in this project.
