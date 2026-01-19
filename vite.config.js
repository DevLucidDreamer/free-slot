import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/free-slot/", // <-- repo 이름으로 바꾸기
});
