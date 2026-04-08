using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace ClinicaMaisSaude.Infrastructure.Data
{
    public class ClinicaDbContext : DbContext
    {
        // DbSet representa as tabelas do banco de dados
        public DbSet<Domain.Entities.Paciente> Pacientes { get; set; }
        public DbSet<Domain.Entities.Agendamento> Agendamentos { get; set; }

        // Pacote de configuração do Entity Framework Core
        public ClinicaDbContext(DbContextOptions<ClinicaDbContext> options) : base(options)
        {

        }
    }
}
