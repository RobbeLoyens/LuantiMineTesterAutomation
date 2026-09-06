# Use the required Python 3.11 slim image.
FROM python:3.11-slim

# Keep Python output visible in container logs and avoid writing bytecode files.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set the container working directory.
WORKDIR /app

# Install Python dependencies before copying application code for better caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application files into the container.
COPY main.py MetadataRetrieval.py ./

# Run the application by default.
CMD ["python", "main.py"]