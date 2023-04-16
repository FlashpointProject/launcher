import { MigrationInterface, QueryRunner } from "typeorm"

export class MoveLaunchPath1681561150000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game_data" ADD COLUMN "applicationPath" varchar`);
        await queryRunner.query(`ALTER TABLE "game_data" ADD COLUMN "launchCommand" varchar`);
        await queryRunner.query(`UPDATE "game_data" 
            SET "applicationPath" = (
                SELECT "applicationPath" FROM "game" WHERE "game"."id" = "game_data"."gameId"
            )`);
        await queryRunner.query(`UPDATE "game_data" 
            SET "launchCommand" = (
                SELECT "launchCommand" FROM "game" WHERE "game"."id" = "game_data"."gameId"
            )`);
        await queryRunner.query(`UPDATE "game"
            SET "applicationPath" = ''
            WHERE game.activeDataId IS NOT NULL`);
        await queryRunner.query(`UPDATE "game"
            SET "launchCommand" = ''
            WHERE game.activeDataId IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game_data" DROP COLUMN "applicationPath"`);
        await queryRunner.query(`ALTER TABLE "game_data" DROP COLUMN "launchCommand"`);
    }

}
