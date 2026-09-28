import sys
import os

# Garante que a raiz e a pasta BackEnd fiquem acessíveis para importação
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(parent_dir, "BackEnd")

for p in [parent_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ["VERCEL"] = "1"

try:
    from app.main import app
except ImportError:
    from BackEnd.app.main import app
