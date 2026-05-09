# Use an official lightweight Python image
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file
COPY requirements.txt .

# Install dependencies without caching to keep the image small
RUN pip install --no-cache-dir -r requirements.txt

# Copy the source code
COPY src/ ./src/

# Define default environment variables
ENV DATA_DIR="/data"

# Run the script
CMD ["python", "src/fetcher.py"]
