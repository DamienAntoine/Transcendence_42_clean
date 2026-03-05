FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173


COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

CMD ["sh", "./entrypoint.sh"]
