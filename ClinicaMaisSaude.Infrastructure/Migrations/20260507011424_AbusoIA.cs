using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AbusoIA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "BloqueadoIAAte",
                table: "Pacientes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AbusosIA",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PacienteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TipoAbuso = table.Column<int>(type: "int", nullable: false),
                    TextoInserido = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbusosIA", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AbusosIA_Pacientes_PacienteId",
                        column: x => x.PacienteId,
                        principalTable: "Pacientes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AbusosIA_PacienteId",
                table: "AbusosIA",
                column: "PacienteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AbusosIA");

            migrationBuilder.DropColumn(
                name: "BloqueadoIAAte",
                table: "Pacientes");
        }
    }
}
