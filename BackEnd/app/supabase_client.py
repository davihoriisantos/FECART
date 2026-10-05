"""
Singleton do cliente Supabase.
Importado pelos routers de auth, user_profile e historico.
"""
import os
from supabase import create_client, Client
from .config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Retorna (ou cria) o cliente Supabase singleton."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", settings.SUPABASE_URL)
        key = os.getenv("SUPABASE_KEY", settings.SUPABASE_KEY)
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL e SUPABASE_KEY são obrigatórias. "
                "Configure as variáveis de ambiente."
            )
        _client = create_client(url, key)
    return _client
