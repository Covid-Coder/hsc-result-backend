FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY package.json ./
RUN npm install --omit=dev && npx playwright install --with-deps chromium && chmod -R a+rX /ms-playwright
COPY server.cjs app.js index.html ./
USER node
ENV HOST=0.0.0.0 PORT=10000 MAX_SESSIONS=1
EXPOSE 10000
CMD ["node", "server.cjs"]
