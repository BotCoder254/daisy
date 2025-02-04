# Use Node.js to serve static files
FROM node:18-alpine

# Install serve package globally
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy static files
COPY . .

# Expose the port
EXPOSE 10000

# Start the server using serve
CMD ["serve", "-s", ".", "-l", "10000"] 