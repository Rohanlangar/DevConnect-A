from langchain_core.tools import tool
from langchain_text_splitters import RecursiveCharacterTextSplitter
import os
import shutil
import stat
from langchain_ollama import OllamaEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document

from pinecone import Pinecone
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
from langchain_groq import ChatGroq
load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("devconnect")

def cloneRepo(url:str):
    target_dir = os.path.join(os.getcwd(), "ClonedRepo")
    if os.path.exists(target_dir):
        # Helper to remove read-only files (common on Windows with git)
        def remove_readonly(func, path, _):
            os.chmod(path, stat.S_IWRITE)
            func(path)
        shutil.rmtree(target_dir, onerror=remove_readonly)
        
    command = f"git clone {url} {target_dir}"
    os.system(command)
    return target_dir

@tool
def RAG(url:str):
    """
    This tool will clone the repo and create a vector store of the repo
    """
    target_dir = cloneRepo(url)
    docs =[]
    for dirpath,dirnames,filenames in os.walk(target_dir):
        for file in filenames:
            if file.endswith((".py",".js",".html",".css",".ts",".jsx",".tsx",".md",".txt",".json",".yml",".yaml",".xml")):
                try:
                    with open(os.path.join(dirpath,file),"r", encoding="utf-8") as f:
                        docs.append(Document(page_content=f.read(), metadata={"source": file}))
                except Exception:
                    pass
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = text_splitter.split_documents(docs)
    
    embeddings = OllamaEmbeddings(model="nomic-embed-text:latest")
    vectorstore = PineconeVectorStore.from_documents(docs,embeddings,index_name="devconnect")   
    
    return "Vector store created successfully"

@tool 
def retriver(query:str):
    """
    This tool will retrieve the relevant documents from the vector store
    """
    embeddings = OllamaEmbeddings(model="nomic-embed-text:latest")
    vectorstore = PineconeVectorStore(index_name="devconnect", embedding=embeddings)
    docs = vectorstore.similarity_search(query)
    
    context = "\n".join([doc.page_content for doc in docs])
    llm = ChatGroq(
        api_key=os.getenv("GROQ_API_KEY"),
        model = "llama-3.3-70b-versatile",
        temperature=0.0,
        max_retries=2,
        )
    prompt = PromptTemplate.from_template(
        """ 
        Your are a helpful assistant for developers , ans questiosn based on context and provide developer proper structured answer 
        Context : {context}
        Question : {question}
        """
    )    

    chain = prompt | llm
    response = chain.invoke({
        "context":context,
        "question":query
    })
    return response
