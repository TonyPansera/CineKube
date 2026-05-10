FROM python:3.11-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Set Python to run unbuffered
ENV PYTHONUNBUFFERED=1

CMD ["python", "src/fetcher_suggestions.py"]
