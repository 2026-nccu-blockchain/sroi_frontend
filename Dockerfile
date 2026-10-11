# ---------- 第一階段：用 Node 打包 ----------
FROM node:22-alpine AS build
WORKDIR /app

# 先只複製 package.json，沒改依賴時這一層會用快取
COPY package.json ./
RUN npm install

COPY . .

# Vite 的環境變數在 build 時就寫死進 JS
# 傳空字串 → API 路徑會變成相對路徑 "/api/v1"，交給 nginx 轉發
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---------- 第二階段：只保留 nginx 和打包結果 ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80