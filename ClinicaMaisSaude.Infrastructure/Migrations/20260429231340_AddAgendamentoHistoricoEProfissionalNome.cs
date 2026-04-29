using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAgendamentoHistoricoEProfissionalNome : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Nome",
                table: "Profissionais",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "AgendamentoHistoricos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AgendamentoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TipoEvento = table.Column<int>(type: "int", nullable: false),
                    StatusAnterior = table.Column<int>(type: "int", nullable: true),
                    StatusNovo = table.Column<int>(type: "int", nullable: true),
                    DataAnterior = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DataNova = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Observacao = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RealizadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Dt_Criado = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgendamentoHistoricos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgendamentoHistoricos_Agendamentos_AgendamentoId",
                        column: x => x.AgendamentoId,
                        principalTable: "Agendamentos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "LoginPortal",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "SenhaHash",
                value: "$2a$11$DaDuHHaqAhlkdCbeVcw6l.ttRvVjLZ8AnOcXvugreEbhe0C1K1YPK");

            migrationBuilder.UpdateData(
                table: "Profissionais",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "Nome",
                value: "Dr. Admin");

            migrationBuilder.CreateIndex(
                name: "IX_AgendamentoHistoricos_AgendamentoId",
                table: "AgendamentoHistoricos",
                column: "AgendamentoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgendamentoHistoricos");

            migrationBuilder.DropColumn(
                name: "Nome",
                table: "Profissionais");

            migrationBuilder.UpdateData(
                table: "LoginPortal",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "SenhaHash",
                value: "$2a$11$D7Pz.U9h9.1b20JdE3D2cOeT.t/qO7Z0.v1OqS7P6o9zG0L.21a.K");
        }
    }
}
