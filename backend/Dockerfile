FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required by PyMuPDF, Pillow, and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure upload directory exists
RUN mkdir -p uploads

ENV PORT=8000
EXPOSE 8000

# Dynamic port binding for cloud environments (Render, Koyeb, Fly.io, etc.)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
