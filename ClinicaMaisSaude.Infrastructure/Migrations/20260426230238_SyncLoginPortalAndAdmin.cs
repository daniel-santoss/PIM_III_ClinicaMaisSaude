using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SyncLoginPortalAndAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Agendamentos_Profissionais_ProfissionalId",
                table: "Agendamentos");

            migrationBuilder.DropForeignKey(
                name: "FK_Pacientes_Usuarios_UsuarioId",
                table: "Pacientes");

            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_Usuarios_UsuarioId",
                table: "Profissionais");

            migrationBuilder.DropIndex(
                name: "IX_Agendamentos_ProfissionalId",
                table: "Agendamentos");

            /*
            migrationBuilder.DropPrimaryKey(
                name: "PK_Usuarios",
                table: "LoginPortal");
            */

            migrationBuilder.DropColumn(
                name: "MedicoId",
                table: "Agendamentos");

            // Tabela já renomeada no banco físico

            /* Já renomeado no banco físico
            migrationBuilder.RenameColumn(
                name: "DtCriado",
                table: "Profissionais",
                newName: "Dt_Criado");

            migrationBuilder.RenameColumn(
                name: "DtCriado",
                table: "Pacientes",
                newName: "Dt_Criado");

            migrationBuilder.RenameColumn(
                name: "DtCriado",
                table: "Agendamentos",
                newName: "Dt_Criado");

            migrationBuilder.RenameColumn(
                name: "DtCriado",
                table: "LoginPortal",
                newName: "Dt_Criado");

            migrationBuilder.RenameIndex(
                name: "IX_Usuarios_Email",
                table: "LoginPortal",
                newName: "IX_LoginPortal_Email");

            migrationBuilder.RenameIndex(
                name: "IX_Usuarios_Cpf",
                table: "LoginPortal",
                newName: "IX_LoginPortal_Cpf");
            */

            migrationBuilder.AddColumn<DateTime>(
                name: "Dt_Criado",
                table: "StatusAgendamentoLookup",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Crm",
                table: "Profissionais",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UfCrm",
                table: "Profissionais",
                type: "nvarchar(2)",
                maxLength: 2,
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ProfissionalId",
                table: "Agendamentos",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAdmin",
                table: "LoginPortal",
                type: "bit",
                nullable: false,
                defaultValue: false);

            /*
            migrationBuilder.AddPrimaryKey(
                name: "PK_LoginPortal",
                table: "LoginPortal",
                column: "Id");
            */

            migrationBuilder.InsertData(
                table: "LoginPortal",
                columns: new[] { "Id", "Cpf", "Dt_Criado", "Email", "IsAdmin", "SenhaHash" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), "00000000000", new DateTime(2026, 4, 26, 0, 0, 0, 0, DateTimeKind.Utc), "admin@clinicamaissaude.com.br", true, "$2a$11$D7Pz.U9h9.1b20JdE3D2cOeT.t/qO7Z0.v1OqS7P6o9zG0L.21a.K" });

            migrationBuilder.UpdateData(
                table: "StatusAgendamentoLookup",
                keyColumn: "Id",
                keyValue: 0,
                column: "Dt_Criado",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "StatusAgendamentoLookup",
                keyColumn: "Id",
                keyValue: 1,
                column: "Dt_Criado",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "StatusAgendamentoLookup",
                keyColumn: "Id",
                keyValue: 2,
                column: "Dt_Criado",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "StatusAgendamentoLookup",
                keyColumn: "Id",
                keyValue: 3,
                column: "Dt_Criado",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "StatusAgendamentoLookup",
                keyColumn: "Id",
                keyValue: 4,
                column: "Dt_Criado",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "StatusAgendamentoLookup",
                keyColumn: "Id",
                keyValue: 5,
                column: "Dt_Criado",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "StatusAgendamentoLookup",
                keyColumn: "Id",
                keyValue: 6,
                column: "Dt_Criado",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.InsertData(
                table: "Profissionais",
                columns: new[] { "Id", "Crm", "Dt_Criado", "TipoProfissional", "UfCrm", "UsuarioId" },
                values: new object[] { new Guid("22222222-2222-2222-2222-222222222222"), "123456", new DateTime(2026, 4, 26, 0, 0, 0, 0, DateTimeKind.Utc), 1, "SP", new Guid("11111111-1111-1111-1111-111111111111") });

            migrationBuilder.AddForeignKey(
                name: "FK_Pacientes_LoginPortal_UsuarioId",
                table: "Pacientes",
                column: "UsuarioId",
                principalTable: "LoginPortal",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Profissionais_LoginPortal_UsuarioId",
                table: "Profissionais",
                column: "UsuarioId",
                principalTable: "LoginPortal",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pacientes_LoginPortal_UsuarioId",
                table: "Pacientes");

            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_LoginPortal_UsuarioId",
                table: "Profissionais");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LoginPortal",
                table: "LoginPortal");

            migrationBuilder.DeleteData(
                table: "Profissionais",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "LoginPortal",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.DropColumn(
                name: "Dt_Criado",
                table: "StatusAgendamentoLookup");

            migrationBuilder.DropColumn(
                name: "Crm",
                table: "Profissionais");

            migrationBuilder.DropColumn(
                name: "UfCrm",
                table: "Profissionais");

            migrationBuilder.DropColumn(
                name: "IsAdmin",
                table: "LoginPortal");

            migrationBuilder.RenameTable(
                name: "LoginPortal",
                newName: "Usuarios");

            migrationBuilder.RenameColumn(
                name: "Dt_Criado",
                table: "Profissionais",
                newName: "DtCriado");

            migrationBuilder.RenameColumn(
                name: "Dt_Criado",
                table: "Pacientes",
                newName: "DtCriado");

            migrationBuilder.RenameColumn(
                name: "Dt_Criado",
                table: "Agendamentos",
                newName: "DtCriado");

            migrationBuilder.RenameColumn(
                name: "Dt_Criado",
                table: "Usuarios",
                newName: "DtCriado");

            migrationBuilder.RenameIndex(
                name: "IX_LoginPortal_Email",
                table: "Usuarios",
                newName: "IX_Usuarios_Email");

            migrationBuilder.RenameIndex(
                name: "IX_LoginPortal_Cpf",
                table: "Usuarios",
                newName: "IX_Usuarios_Cpf");

            migrationBuilder.AlterColumn<Guid>(
                name: "ProfissionalId",
                table: "Agendamentos",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<Guid>(
                name: "MedicoId",
                table: "Agendamentos",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "PK_Usuarios",
                table: "Usuarios",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_Agendamentos_ProfissionalId",
                table: "Agendamentos",
                column: "ProfissionalId");

            migrationBuilder.AddForeignKey(
                name: "FK_Agendamentos_Profissionais_ProfissionalId",
                table: "Agendamentos",
                column: "ProfissionalId",
                principalTable: "Profissionais",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Pacientes_Usuarios_UsuarioId",
                table: "Pacientes",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Profissionais_Usuarios_UsuarioId",
                table: "Profissionais",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
