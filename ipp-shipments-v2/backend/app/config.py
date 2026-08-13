from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str
    database_url_direct: str

    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-5"

    supabase_storage_bucket: str

    environment: str = "development"
    cors_origins: str = "http://localhost:5173"
    resend_api_key: str | None = None
    resend_from_email: str | None = None
    admin_email: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()  # type: ignore[call-arg]  # pydantic-settings reads from env
