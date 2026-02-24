import os
from pathlib import Path
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv()

# Simple in-memory store — no ChromaDB, no embeddings
_pdf_store = {}


def ingest_pdf(pdf_path: str, collection_name: str = "tender_docs") -> dict:
    """Extract text from PDF and store in memory."""
    reader = PdfReader(pdf_path)
    raw_text = "\n".join(page.extract_text() or "" for page in reader.pages)

    if not raw_text.strip():
        raise ValueError(f"Could not extract text from PDF: {pdf_path}")

    _pdf_store[collection_name] = raw_text
    print(f"[Ingest] Stored {len(raw_text)} chars from '{Path(pdf_path).name}'")
    return {"collection_name": collection_name, "text": raw_text}


def load_vectorstore(collection_name: str = "tender_docs"):
    return _pdf_store.get(collection_name, "")


def query_vectorstore(query: str, collection_name: str = "tender_docs", k: int = 5) -> str:
    """Return full text — let Gemini handle the retrieval."""
    return _pdf_store.get(collection_name, "")
