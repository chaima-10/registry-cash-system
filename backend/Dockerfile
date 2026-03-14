FROM node:22-alpine

WORKDIR /app

# Add this line to install the missing libraries Prisma needs on Alpine
RUN apk add --no-cache openssl ca-certificates

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
