import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        allfix: "allfix/index.html",
      },
    },
  },
  publicDir: "public",
  plugins: [
    {
      name: "copy-redirects",
      writeBundle() {
        import("fs").then((fs) => {
          fs.copyFileSync("_redirects", resolve("dist", "_redirects"));
        });
      },
    },
  ],
});
