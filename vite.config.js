import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages branch/custom domain 환경 모두에서 asset 404를 피하기 위해
  // 정적 파일 경로를 상대 경로로 생성한다.
  base: "./",
});
