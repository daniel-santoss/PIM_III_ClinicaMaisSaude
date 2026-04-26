using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Application.Services;
using ClinicaMaisSaude.API.Services;
using ClinicaMaisSaude.Application.Validators;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Data;
using ClinicaMaisSaude.Infrastructure.Repositories;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Ensina a API a ler a pasta Controllers
builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirFrontEnd", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
builder.Services.AddValidatorsFromAssemblyContaining<PacienteRequestValidator>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// String de conexão com o banco de dados
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ClinicaDbContext>(options => options.UseSqlServer(connectionString));

// Configuração do JWT Authentication
var secretKey = builder.Configuration["JwtConfig:Secret"] ?? "minha-chave-super-secreta-pim-iii-123456789!?";
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secretKey)),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

// Injeção de Dependências
builder.Services.AddScoped<IPacienteRepository, PacienteRepository>();
builder.Services.AddScoped<IAgendamentoRepository, AgendamentoRepository>();
builder.Services.AddScoped<IProfissionalRepository, ProfissionalRepository>();
builder.Services.AddScoped<IPacienteService, PacienteService>();
builder.Services.AddScoped<IAgendamentoService, AgendamentoService>();
builder.Services.AddScoped<IAuthService, AuthService>();

var app = builder.Build();

// Ativa a tela visual do Swagger apenas em ambiente de desenvolvimento
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("PermitirFrontEnd");

app.UseAuthentication(); // <-- Exigido pra ler o Token
app.UseAuthorization();  // <-- Exigido pra aplicar políticas (ex: [Authorize])

// Mapeia as rotas (Endpoints)
app.MapControllers();

app.Run();