FROM node:16

ENV CI=true

WORKDIR /app

COPY package.json ./

RUN npm install -g @nestjs/cli

RUN npm install

COPY ./ ./

RUN chmod 775 pipeline_scripts/annotation_script-1.sh
RUN chmod 775 pipeline_scripts/disgenet_script.R

#install R and packages
RUN apt update
RUN apt-get install -y r-base

RUN apt-get install -y -qq r-cran-ggplot2

RUN npm run build

CMD [ "npm", "run", "start:prod" ]
