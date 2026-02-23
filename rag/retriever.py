"""
rag/retriever.py — RAG query interface
"""

from langchain_chroma import Chroma
from .ingest import load_vectorstore


def get_retriever(collection_name: str = "tender_docs", k: int = 5):
    """Return a LangChain retriever over the ChromaDB collection."""
    vectorstore = load_vectorstore(collection_name)
    return vectorstore.as_retriever(search_kwargs={"k": k})


def query_vectorstore(query: str, collection_name: str = "tender_docs", k: int = 5) -> str:
    """
    Direct similarity search — returns concatenated chunk text.
    Useful for passing context to agent prompts.
    """
    vectorstore = load_vectorstore(collection_name)
    docs = vectorstore.similarity_search(query, k=k)
    return "\n\n---\n\n".join(doc.page_content for doc in docs)
