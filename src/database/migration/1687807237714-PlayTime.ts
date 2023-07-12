import { MigrationInterface, QueryRunner } from "typeorm"

export class PlayTime1687807237714 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "lastPlayed" datetime`);
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "playtime" integer DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "playCounter" integer DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "lastPlayed"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "playtime"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "playCounter"`);
    }

}
