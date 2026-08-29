# Dockerfile da API (multi-stage). Contexto de build = raiz do repositório:
#   docker build -t clinica-api -f ClinicaMaisSaude.API/Dockerfile .
#
# NÃO contém segredos: toda config sensível (JwtConfig:Secret, ConnectionStrings,
# EmailConfig:*, Security:CodigoRecuperacaoPepper, GeminiAI:ApiKey) vem por variável
# de ambiente em runtime. Ver DEPLOY.md.

# ---------- build ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore em camada própria (cacheia enquanto os .csproj não mudam).
COPY ClinicaMaisSaude.Domain/*.csproj ClinicaMaisSaude.Domain/
COPY ClinicaMaisSaude.Application/*.csproj ClinicaMaisSaude.Application/
COPY ClinicaMaisSaude.Infrastructure/*.csproj ClinicaMaisSaude.Infrastructure/
COPY ClinicaMaisSaude.API/*.csproj ClinicaMaisSaude.API/
RUN dotnet restore ClinicaMaisSaude.API/ClinicaMaisSaude.API.csproj

# Código + publish (self-contained=false; usa o runtime da imagem base).
COPY . .
RUN dotnet publish ClinicaMaisSaude.API/ClinicaMaisSaude.API.csproj -c Release -o /app/publish --no-restore

# ---------- runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

# QuestPDF (geração de PDF de relatórios) precisa do fontconfig no Linux.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

# Kestrel escuta em 8080 (HTTP). Atrás de um proxy/faixa TLS do provedor.
# Plataformas que injetam $PORT: rode com ASPNETCORE_HTTP_PORTS=$PORT.
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ClinicaMaisSaude.API.dll"]
