import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Only variables with these prefixes reach the browser. Secret keys (service role, database passwords) have neither.
export default defineConfig({ plugins: [react()], envPrefix: ["VITE_", "NEXT_PUBLIC_"] });
