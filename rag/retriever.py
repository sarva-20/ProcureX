from .ingest import query_vectorstore


def get_retriever(collection_name: str = "tender_docs", k: int = 5):
    return None  # Not used in simple mode


def query_vectorstore_simple(query: str, collection_name: str = "tender_docs", k: int = 5) -> str:
    return query_vectorstore(query, collection_name=collection_name, k=k)
