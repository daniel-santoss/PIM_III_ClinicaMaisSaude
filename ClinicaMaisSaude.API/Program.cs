using ClinicaMaisSaude.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using ClinicaMaisSaude.Domain.Interfaces;
using ClinicaMaisSaude.Infrastructure.Repositories;
using ClinicaMaisSaude.Application.Interfaces;
using ClinicaMaisSaude.Application.Services;

var builder = WebApplication.CreateBuilder(args);

// Ensina a API a ler a pasta Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// String de conexão com o banco de dados
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ClinicaDbContext>(options => options.UseSqlServer(connectionString));

// Injeção de Dependências
builder.Services.AddScoped<IPacienteRepository, PacienteRepository>();
builder.Services.AddScoped<IAgendamentoRepository, AgendamentoRepository>();
builder.Services.AddScoped<IPacienteService, PacienteService>();

var app = builder.Build();

// Ativa a tela visual do Swagger apenas em ambiente de desenvolvimento
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Mapeia as rotas (Endpoints) construídas no PacientesController
app.MapControllers();

app.Run();