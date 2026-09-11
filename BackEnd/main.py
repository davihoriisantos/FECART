import os
import sys

# Adiciona o diretório do BackEnd ao sys.path para garantir imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run('BackEnd.main:app', host='0.0.0.0', port=port, reload=True)
