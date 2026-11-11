from app.runtime_compat import configure_native_threads

configure_native_threads()
from app.ingest.load import main

main()
