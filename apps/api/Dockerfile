FROM python:3.12-slim
WORKDIR /repo/apps/api
COPY apps/api/requirements.txt apps/api/requirements-local-ai.txt ./
ARG LOCAL_AI=0
RUN pip install --no-cache-dir -r requirements.txt && \
    if [ "$LOCAL_AI" = "1" ]; then pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch && \
    pip install --no-cache-dir -r requirements-local-ai.txt; fi
COPY apps/api/app ./app
COPY data/seed /repo/data/seed
COPY data/sources /repo/data/sources
COPY data/curation /repo/data/curation
ENV DATA_DIR=/repo/data
# Build the SQLite catalog + search indexes into the image, so a (cold) start does not re-ingest. At boot,
# `--if-needed` re-ingests only if they are missing or were built with a different embedder than the runtime env.
ARG AI_EMBEDDING_PROVIDER=hash
RUN AI_EMBEDDING_PROVIDER=$AI_EMBEDDING_PROVIDER python -m app.ingest > /dev/null
EXPOSE 8000
CMD ["sh", "-c", "python -m app.ingest --if-needed && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
