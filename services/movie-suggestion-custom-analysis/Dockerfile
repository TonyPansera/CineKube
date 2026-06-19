FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENV PYTHONUNBUFFERED=1

# Interactive mode — stdin must be attached
# Run with: docker run -it -v /data:/data cinekube/movie-suggestion-custom-analysis
CMD ["python", "src/manual_analysis_tool.py"]
