from sqlalchemy import inspect, text


USER_PLACE_COLUMNS = {
    "celular": "VARCHAR(20)",
    "data_nascimento": "DATE",
    "last_login": "DATETIME",
    "home_address": "VARCHAR(500)",
    "home_lat": "DOUBLE PRECISION",
    "home_lon": "DOUBLE PRECISION",
    "work_address": "VARCHAR(500)",
    "work_lat": "DOUBLE PRECISION",
    "work_lon": "DOUBLE PRECISION",
}


def ensure_user_place_columns(engine) -> None:
    """Migração leve compatível com SQLite/PostgreSQL para bancos existentes."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as connection:
        for name, sql_type in USER_PLACE_COLUMNS.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {sql_type}"))


def migrate_legacy_history(engine) -> None:
    """Copia o histórico antigo uma vez, preservando instalações já utilizadas."""
    tables = set(inspect(engine).get_table_names())
    if not {"historico_buscas_regiao", "search_history"}.issubset(tables):
        return
    with engine.begin() as connection:
        connection.execute(text("""
            INSERT INTO search_history
                (usuario_id, termo_busca, lat, lon, bairro, dados_adicionais, criado_em)
            SELECT old.usuario_id, old.termo_busca, old.lat, old.lon,
                   old.bairro, old.dados_adicionais, old.criado_em
            FROM historico_buscas_regiao AS old
            WHERE NOT EXISTS (
                SELECT 1 FROM search_history AS current
                WHERE current.usuario_id = old.usuario_id
                  AND current.termo_busca = old.termo_busca
                  AND COALESCE(current.lat, 0) = COALESCE(old.lat, 0)
                  AND COALESCE(current.lon, 0) = COALESCE(old.lon, 0)
            )
        """))
