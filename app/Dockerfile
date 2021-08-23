FROM node:16

ENV CI=true

WORKDIR /app

COPY package.json ./

#RUN npm install -g @nestjs/cli

RUN npm install

COPY ./ ./

RUN apt update
RUN apt-get install dos2unix
RUN chmod 775 pipeline_scripts/liftOver.sh
RUN dos2unix pipeline_scripts/liftOver.sh

RUN npm run build

CMD [ "npm", "run", "start:prod" ]
