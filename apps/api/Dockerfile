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
ENV DATA_DIR=/repo/data
EXPOSE 8000
CMD ["sh", "-c", "python -m app.ingest && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
