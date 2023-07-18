import { MigrationInterface, QueryRunner } from "typeorm"

export class ArchiveState1689423335642 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "archiveState" integer DEFAULT 2`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "archiveState"`);
    }
}
