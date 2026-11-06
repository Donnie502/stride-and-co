FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ .
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# por si el archivo se guardo con saltos de linea de Windows (CRLF)
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["sh", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "start"]
