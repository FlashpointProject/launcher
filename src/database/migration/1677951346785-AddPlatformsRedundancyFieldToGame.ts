import { MigrationInterface, QueryRunner } from "typeorm"

export class AddPlatformsRedundancyFieldToGame1677951346785 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "platformsStr" varchar DEFAULT ""`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "platformsStr"`);
    }

}
