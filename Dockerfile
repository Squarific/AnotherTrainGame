# Base image
FROM node:current AS build


WORKDIR /usr/src/app

# Copy all files
COPY . .

WORKDIR /usr/src/app/server
RUN npm install

# Start server
CMD node main.js
EXPOSE 8080