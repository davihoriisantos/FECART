import sys
import os

# Injeta o diretório raiz e BackEnd no sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(parent_dir, "BackEnd")

for p in [parent_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ["VERCEL"] = "1"

from BackEnd.app.main import app as fastapi_app

# A Vercel exige rigorosamente a variável 'app' no top-level do módulo
app = fastapi_app
