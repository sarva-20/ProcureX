import os
from pathlib import Path
from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from dotenv import load_dotenv

load_dotenv()

CHROMA_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")


def get_embeddings():
    return SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")


def ingest_pdf(pdf_path: str, collection_name: str = "tender_docs") -> Chroma:
    reader = PdfReader(pdf_path)
    raw_text = "\n".join(page.extract_text() or "" for page in reader.pages)

    if not raw_text.strip():
        raise ValueError(f"Could not extract text from PDF: {pdf_path}")

    splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
    chunks = splitter.create_documents(
        texts=[raw_text],
        metadatas=[{"source": Path(pdf_path).name}]
    )

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        collection_name=collection_name,
        persist_directory=CHROMA_DIR
    )
    print(f"[Ingest] Stored {len(chunks)} chunks.")
    return vectorstore


def load_vectorstore(collection_name: str = "tender_docs") -> Chroma:
    return Chroma(
        collection_name=collection_name,
        embedding_function=get_embeddings(),
        persist_directory=CHROMA_DIR
    )
