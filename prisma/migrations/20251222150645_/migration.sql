-- CreateTable
CREATE TABLE `Usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `BI` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    UNIQUE INDEX `Usuario_BI_key`(`BI`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Funcionario` (
    `id_funcionario` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `cargo` VARCHAR(191) NULL,
    `salario` DOUBLE NULL,

    PRIMARY KEY (`id_funcionario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Upload` (
    `id_upload` INTEGER NOT NULL AUTO_INCREMENT,
    `id_funcionario` INTEGER NOT NULL,
    `video` VARCHAR(191) NULL,
    `imagem` VARCHAR(191) NULL,
    `descri` VARCHAR(191) NULL,

    PRIMARY KEY (`id_upload`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Servico` (
    `id_servico` INTEGER NOT NULL AUTO_INCREMENT,
    `id_funcionario` INTEGER NOT NULL,
    `video` VARCHAR(191) NULL,
    `imagem` VARCHAR(191) NULL,
    `descri` VARCHAR(191) NULL,

    PRIMARY KEY (`id_servico`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comunicacao` (
    `id_comunicacao` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('contrato', 'sms') NOT NULL,
    `id_remetente` INTEGER NOT NULL,
    `id_destinatario` INTEGER NOT NULL,
    `assunto` VARCHAR(191) NULL,
    `mensagem` VARCHAR(191) NOT NULL,
    `data_envio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Comunicacao_tipo_idx`(`tipo`),
    INDEX `Comunicacao_id_destinatario_idx`(`id_destinatario`),
    PRIMARY KEY (`id_comunicacao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Funcionario` ADD CONSTRAINT `Funcionario_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Upload` ADD CONSTRAINT `Upload_id_funcionario_fkey` FOREIGN KEY (`id_funcionario`) REFERENCES `Funcionario`(`id_funcionario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Servico` ADD CONSTRAINT `Servico_id_funcionario_fkey` FOREIGN KEY (`id_funcionario`) REFERENCES `Funcionario`(`id_funcionario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comunicacao` ADD CONSTRAINT `Comunicacao_id_remetente_fkey` FOREIGN KEY (`id_remetente`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comunicacao` ADD CONSTRAINT `Comunicacao_id_destinatario_fkey` FOREIGN KEY (`id_destinatario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
