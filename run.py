import sys
import os
import uvicorn

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    
    backend_dir = os.path.join(current_dir, "BackEnd")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("=" * 60)
    print("FloodGuard AI - Servidor Local Iniciado com Sucesso!")
    print("Acesse o site no seu navegador: http://localhost:8000")
    print("Mapa Interativo: http://localhost:8000/map")
    print("Documentacao da API (Swagger): http://localhost:8000/docs")
    print("=" * 60)

    uvicorn.run("BackEnd.app.main:app", host="0.0.0.0", port=8000, reload=True)
