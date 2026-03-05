FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx tsc

EXPOSE 3000


COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

CMD ["sh", "./entrypoint.sh"]
