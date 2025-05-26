import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest, // 👈 Adiciona suporte ao Jest
        ...globals.browser
      }
    }
  },
  {
    // Configurações específicas para arquivos de teste
    files: ["**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest // 👈 Garante que describe/test/expect funcionem
      }
    }
  }
]);