import os
import sys

# Define VERCEL=1 para garantir que config.py use o caminho correto
os.environ["VERCEL"] = "1"

# Adiciona os caminhos ao sys.path
api_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(api_dir)
backend_dir = os.path.join(root_dir, "BackEnd")

for p in [root_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from BackEnd.app.main import app

# Exporta o app para o runtime da Vercel
# O runtime @vercel/python procura a variável `app`
