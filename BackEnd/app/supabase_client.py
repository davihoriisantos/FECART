import os
import httpx
from supabase import create_client, Client, ClientOptions
from .config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Retorna (ou cria) o cliente Supabase singleton com suporte resiliente a SSL/TLS."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", settings.SUPABASE_URL)
        key = os.getenv("SUPABASE_KEY", settings.SUPABASE_KEY)
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL e SUPABASE_KEY são obrigatórias. "
                "Configure as variáveis de ambiente."
            )
        try:
            custom_httpx = httpx.Client(verify=settings.VERIFY_SSL, timeout=15.0)
            options = ClientOptions(httpx_client=custom_httpx)
            _client = create_client(url, key, options=options)
        except Exception as e:
            print(f"[Supabase] Aviso ao criar cliente com opções customizadas: {e}")
            _client = create_client(url, key)
    return _client
