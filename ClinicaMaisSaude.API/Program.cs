using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Application.Services;
using ClinicaMaisSaude.Infrastructure.Services;
using ClinicaMaisSaude.Application.Validators;
using ClinicaMaisSaude.Domain.Constants;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.API.Services;
using ClinicaMaisSaude.API.Converters;
using ClinicaMaisSaude.API.Middleware;
using ClinicaMaisSaude.Infrastructure.Repositories;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// Ensina a API a ler a pasta Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Garante que todas as datas sejam serializadas com sufixo 'Z' (UTC)
        // para que o JavaScript as interprete corretamente como UTC e converta ao fuso local
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
    });
builder.Services.AddHttpClient();

// Cache distribuído para rate-limit/anti-abuso da IA.
// - Com Redis configurado (ConnectionStrings:Redis), os contadores ficam num store
//   compartilhado → limites corretos mesmo com múltiplas instâncias (escala horizontal).
// - Sem Redis (dev/banca/instância única), cai no cache em memória, que implementa a
//   MESMA interface IDistributedCache → o código do serviço não muda entre ambientes.
var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redisConnection))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = "ClinicaMaisSaude:";
    });
}
else
{
    builder.Services.AddDistributedMemoryCache();
}

builder.Services.AddFluentValidationAutoValidation();
// Origens do front-end via configuração (Cors:AllowedOrigins). Fallback para o dev local.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (corsOrigins == null || corsOrigins.Length == 0)
    corsOrigins = new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirFrontEnd", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
builder.Services.AddValidatorsFromAssemblyContaining<PacienteRequestValidator>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Tratamento global de exceções → respostas ProblemDetails com status HTTP correto.
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Rate limiting nativo do ASP.NET Core. Política "login" limita tentativas por IP
// (proteção contra brute force distribuído, além do bloqueio por conta já existente).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "sem-ip",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                // 20 tentativas/min por IP: folga para uso legítimo, mas corta brute force
                // em volume. A defesa primária continua sendo o bloqueio por conta (5 falhas).
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 20,
                QueueLimit = 0
            }));
});

// String de conexão com o banco de dados
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ClinicaDbContext>(options => options.UseSqlServer(connectionString));

// Configuração do JWT Authentication
var secretKey = builder.Configuration[ConfigKeys.JwtSecret] ?? throw new InvalidOperationException("JwtConfig:Secret não configurado. Defina em appsettings.json ou User Secrets.");
var jwtIssuer = builder.Configuration[ConfigKeys.JwtIssuer] ?? ConfigKeys.JwtIssuerPadrao;
var jwtAudience = builder.Configuration[ConfigKeys.JwtAudience] ?? ConfigKeys.JwtAudiencePadrao;
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    // Exige HTTPS fora de Development; UTF8 (mais entropia que ASCII para chaves não-ASCII).
    x.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

// Injeção de Dependências
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IPacienteRepository, PacienteRepository>();
builder.Services.AddScoped<IAgendamentoRepository, AgendamentoRepository>();
builder.Services.AddScoped<IProfissionalRepository, ProfissionalRepository>();
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IPacienteService, PacienteService>();
builder.Services.AddScoped<IConflitoHorarioService, ConflitoHorarioService>();
builder.Services.AddScoped<IDelegacaoProfissionalService, DelegacaoProfissionalService>();
builder.Services.AddScoped<IAgendamentoService, AgendamentoService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICadastroService, CadastroService>();
builder.Services.AddScoped<IProbabilidadeFaltaService, ProbabilidadeFaltaService>();
builder.Services.AddScoped<IEspecialidadeService, EspecialidadeService>();
builder.Services.AddScoped<IPerfilService, PerfilService>();
builder.Services.AddScoped<IProfissionalService, ProfissionalService>();
builder.Services.AddScoped<INotificacaoRepository, NotificacaoRepository>();
builder.Services.AddScoped<INotificacaoService, NotificacaoService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IConsultaService, ConsultaService>();

builder.Services.AddHostedService<NotificacaoBackgroundService>();

var app = builder.Build();

// Primeiro middleware do pipeline: captura exceções de toda a aplicação.
app.UseExceptionHandler();

// Ativa a tela visual do Swagger apenas em ambiente de desenvolvimento
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("PermitirFrontEnd");

app.UseRateLimiter(); // aplica as políticas de rate limit (ex.: "login")

app.UseAuthentication(); // <-- Exigido pra ler o Token

// Middleware de segurança para interceptar requisições autenticadas de usuários bloqueados/banidos
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var userIdStr = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdStr, out var userId))
        {
            var dbContext = context.RequestServices.GetRequiredService<ClinicaDbContext>();
            var dbUser = await dbContext.Usuarios.FindAsync(userId);
            if (dbUser != null && dbUser.IsBloqueado())
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsync("Sua conta está bloqueada.");
                return;
            }
        }
    }
    await next();
});

app.UseAuthorization();  // <-- Exigido pra aplicar políticas (ex: [Authorize])

// Mapeia as rotas (Endpoints)
app.MapControllers();

// Garante o administrador inicial (senha vinda da configuração; ver AdminSeeder).
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    await AdminSeeder.SeedAdminAsync(
        services.GetRequiredService<ClinicaDbContext>(),
        services.GetRequiredService<IConfiguration>(),
        app.Environment.IsDevelopment(),
        services.GetRequiredService<ILogger<Program>>());
}

app.Run();