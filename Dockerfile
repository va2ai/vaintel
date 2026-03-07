FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV VITE_FIREBASE_API_KEY=AIzaSyCp5mdQ_g3yDfQXCZqnxpKRsZNZzrCKAFk
ENV VITE_FIREBASE_PROJECT_ID=vaclaims-194006
ENV VITE_FIREBASE_APP_ID=1:524576132881:web:647018f2bc792cff
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=524576132881
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 8080
RUN printf 'server {\n\
  listen 8080;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf
