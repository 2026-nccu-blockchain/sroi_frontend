# SROI Frontend

SROI 系統前端，使用 Vue 3、TypeScript、Vite 與 Pinia。

## 本機開發

```bash
npm install
npm run dev
```

預設會連到 `.env.development` 裡的 `VITE_API_BASE_URL`，例如 `http://localhost:8000`。

## 環境變數

| 變數 | 說明 |
|---|---|
| `VITE_API_BASE_URL` | 後端 API 位址。設成空字串時會使用相對路徑 `/api/v1` |

> Vite 的環境變數會在 **build 時**寫入程式，修改後必須重新 build 才會生效。

## 建置

```bash
npm run build      # 輸出到 dist/
npm run preview    # 在本機預覽 build 結果
```

## Docker

image 使用 multi-stage build：先用 Node 打包，再交給 nginx 提供靜態檔。
nginx 會把 `/api/` 轉發給後端（`api:8000`），設定請見 `nginx.conf`。

一般請從上層的 `docker-compose.yml` 啟動。如果要單獨建置：

```bash
docker build -t sroi-frontend --build-arg VITE_API_BASE_URL="" .
```