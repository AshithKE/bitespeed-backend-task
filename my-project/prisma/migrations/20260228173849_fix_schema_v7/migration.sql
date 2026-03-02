-- CreateTable
CREATE TABLE `Contact` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phoneNumber` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `linkedId` INTEGER NULL,
    `linkPrecedence` VARCHAR(191) NOT NULL DEFAULT 'primary',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
