from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage
from langchain_ollama import ChatOllama
from githubTools.tools import RAG, retriver
from langchain_groq import ChatGroq
from dotenv import load_dotenv
load_dotenv()
import os

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",
    temperature=0.0,
    max_retries=2,
    )
tools = [RAG, retriver]

# Create standard LangGraph Agent for tool-calling models
agent_executor = create_react_agent(llm, tools)

if __name__ == "__main__":
    print("Testing standard LangGraph agent (requires a model capable of native tool calling)...")
    
    try:
        # 1. Test indexing the repository
        print("\n--- 1. Testing RAG tool (Cloning and Indexing) ---")
        response_rag = agent_executor.invoke(
            {"messages": [HumanMessage(content="Use the RAG tool to clone and index this testing repo: https://github.com/Rohanlangar/file_seperetor.git")]}
        )
        print("\nRAG Answer:\n", response_rag["messages"][-1].content)
        
        # 2. Test querying the repository
        print("\n--- 2. Testing Retriever tool (Querying) ---")
        response_retriever = agent_executor.invoke(
            {"messages": [HumanMessage(content="tech stack of the given repo.")]}
        )
        print("\nRetriever Answer:\n", response_retriever["messages"][-1].content)
    except Exception as e:
        print(f"An error occurred: {e}\nIf you see raw JSON errors, your model does not natively support tool calling.")