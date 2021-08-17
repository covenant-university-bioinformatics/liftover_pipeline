FROM node:16

ENV CI=true

WORKDIR /app

COPY package.json ./

RUN npm install -g @nestjs/cli

RUN npm install

COPY ./ ./

RUN npm run build

CMD [ "npm", "run", "start:prod" ]
