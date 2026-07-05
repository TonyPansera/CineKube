# Use a stable, slim Debian-based Node image. 
# Slim is safer than Alpine for packages like @resvg/resvg-js which rely on native C++ bindings.
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files and install dependencies
# We do this before copying the rest of the code to leverage Docker layer caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy the remaining application source code (index.js, fonts, assets)
COPY . .

# Set environment variables (these can be overridden by Kubernetes)
ENV DATA_DIR=/data

# Command to run the application
CMD ["node", "index.js"]
