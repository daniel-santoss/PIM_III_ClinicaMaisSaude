using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase3_IdentidadeLoginPortal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Colunas novas de identidade no LoginPortal (Nome default "", Telefone nulo).
            //    Precisam existir ANTES do backfill e do drop das colunas de origem.
            migrationBuilder.AddColumn<string>(
                name: "Nome",
                table: "LoginPortal",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Telefone",
                table: "LoginPortal",
                type: "varchar(11)",
                nullable: true);

            // 2. Backfill: copia Nome/Telefone dos perfis para o LoginPortal ANTES de dropar.
            //    Nome: prioridade Profissional (ex.: admin "Dr. Admin") > Paciente > 'Usuário'.
            //    Telefone: só o paciente tinha; profissionais/admin ficam nulos.
            migrationBuilder.Sql(@"
                UPDATE lp SET
                    Nome = COALESCE(prof.Nome, pac.Nome, NULLIF(lp.Nome, ''), 'Usuário'),
                    Telefone = pac.Telefone
                FROM [LoginPortal] lp
                LEFT JOIN [Profissionais] prof ON prof.UsuarioId = lp.Id
                LEFT JOIN [Pacientes] pac ON pac.UsuarioId = lp.Id;");

            // 3. Agora que a identidade está consolidada, remove FKs/índices/colunas de origem.
            migrationBuilder.DropForeignKey(
                name: "FK_Pacientes_LoginPortal_UsuarioId",
                table: "Pacientes");

            migrationBuilder.DropIndex(
                name: "IX_Profissionais_UsuarioId",
                table: "Profissionais");

            migrationBuilder.DropIndex(
                name: "IX_Pacientes_Cpf",
                table: "Pacientes");

            migrationBuilder.DropIndex(
                name: "IX_Pacientes_UsuarioId",
                table: "Pacientes");

            migrationBuilder.DropColumn(
                name: "Nome",
                table: "Profissionais");

            migrationBuilder.DropColumn(
                name: "Cpf",
                table: "Pacientes");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Pacientes");

            migrationBuilder.DropColumn(
                name: "Nome",
                table: "Pacientes");

            migrationBuilder.DropColumn(
                name: "Telefone",
                table: "Pacientes");

            // 4. UsuarioId do paciente passa a ser obrigatório (não há paciente sem login).
            migrationBuilder.AlterColumn<Guid>(
                name: "UsuarioId",
                table: "Pacientes",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            // 5. Índices únicos (1:1 conta↔perfil) + FK restaurada.
            migrationBuilder.CreateIndex(
                name: "IX_Profissionais_UsuarioId",
                table: "Profissionais",
                column: "UsuarioId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_UsuarioId",
                table: "Pacientes",
                column: "UsuarioId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Pacientes_LoginPortal_UsuarioId",
                table: "Pacientes",
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

            migrationBuilder.DropIndex(
                name: "IX_Profissionais_UsuarioId",
                table: "Profissionais");

            migrationBuilder.DropIndex(
                name: "IX_Pacientes_UsuarioId",
                table: "Pacientes");

            migrationBuilder.DropColumn(
                name: "Nome",
                table: "LoginPortal");

            migrationBuilder.DropColumn(
                name: "Telefone",
                table: "LoginPortal");

            migrationBuilder.AddColumn<string>(
                name: "Nome",
                table: "Profissionais",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<Guid>(
                name: "UsuarioId",
                table: "Pacientes",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<string>(
                name: "Cpf",
                table: "Pacientes",
                type: "varchar(11)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Pacientes",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Nome",
                table: "Pacientes",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Telefone",
                table: "Pacientes",
                type: "varchar(11)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Profissionais_UsuarioId",
                table: "Profissionais",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_Cpf",
                table: "Pacientes",
                column: "Cpf",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pacientes_UsuarioId",
                table: "Pacientes",
                column: "UsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pacientes_LoginPortal_UsuarioId",
                table: "Pacientes",
                column: "UsuarioId",
                principalTable: "LoginPortal",
                principalColumn: "Id");
        }
    }
}
