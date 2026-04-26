using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicaMaisSaude.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AjusteNomesEstruturais : Migration
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

            migrationBuilder.DropPrimaryKey(
                name: "PK_Usuarios",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "MedicoId",
                table: "Agendamentos");

            migrationBuilder.RenameTable(
                name: "Usuarios",
                newName: "LoginPortal");

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

            migrationBuilder.AlterColumn<Guid>(
                name: "ProfissionalId",
                table: "Agendamentos",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_LoginPortal",
                table: "LoginPortal",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Agendamentos_Profissionais_ProfissionalId",
                table: "Agendamentos",
                column: "ProfissionalId",
                principalTable: "Profissionais",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

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
                name: "FK_Agendamentos_Profissionais_ProfissionalId",
                table: "Agendamentos");

            migrationBuilder.DropForeignKey(
                name: "FK_Pacientes_LoginPortal_UsuarioId",
                table: "Pacientes");

            migrationBuilder.DropForeignKey(
                name: "FK_Profissionais_LoginPortal_UsuarioId",
                table: "Profissionais");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LoginPortal",
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
